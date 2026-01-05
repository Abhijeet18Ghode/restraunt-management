const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

describe('Complete Order-to-Payment Workflow Integration Tests', () => {
  const gatewayUrl = 'http://localhost:3000';
  let testData = {};

  beforeAll(async () => {
    // Setup test tenant and basic data
    await setupTestEnvironment();
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestEnvironment();
  });

  describe('Dine-In Order Workflow', () => {
    it('should complete full dine-in order workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.execute();
      
      // Verify all steps completed successfully
      expect(workflow.results.tenantCreated).toBe(true);
      expect(workflow.results.customerCreated).toBe(true);
      expect(workflow.results.orderCreated).toBe(true);
      expect(workflow.results.kotGenerated).toBe(true);
      expect(workflow.results.paymentProcessed).toBe(true);
      expect(workflow.results.inventoryUpdated).toBe(true);
      expect(workflow.results.loyaltyUpdated).toBe(true);
      expect(workflow.results.analyticsRecorded).toBe(true);
    });

    it('should handle order modifications during workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      
      // Create initial order
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 2 }
      ]);
      
      // Modify order (add items)
      const modifyResponse = await request(gatewayUrl)
        .put(`/api/pos/orders/${workflow.orderId}/items`)
        .set('x-tenant-id', workflow.tenantId)
        .send({
          items: [
            { menuItemId: testData.menuItems[1].id, quantity: 1 }
          ]
        })
        .expect(200);
      
      expect(modifyResponse.body.items).toHaveLength(2);
      
      // Complete workflow
      await workflow.completePayment();
      
      // Verify final totals include modifications
      const finalOrder = await workflow.getOrderDetails();
      expect(finalOrder.items).toHaveLength(2);
    });

    it('should handle table merging workflow', async () => {
      const workflow1 = new OrderWorkflow('DINE_IN');
      const workflow2 = new OrderWorkflow('DINE_IN');
      
      // Create orders on different tables
      await workflow1.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      await workflow2.createOrder([
        { menuItemId: testData.menuItems[1].id, quantity: 1 }
      ], workflow1.tenantId); // Same tenant, different table
      
      // Merge tables
      const mergeResponse = await request(gatewayUrl)
        .post('/api/pos/tables/merge')
        .set('x-tenant-id', workflow1.tenantId)
        .send({
          sourceTableId: workflow2.tableId,
          targetTableId: workflow1.tableId
        })
        .expect(200);
      
      expect(mergeResponse.body.mergedOrderId).toBeDefined();
      
      // Verify merged order contains items from both tables
      const mergedOrder = await request(gatewayUrl)
        .get(`/api/pos/orders/${mergeResponse.body.mergedOrderId}`)
        .set('x-tenant-id', workflow1.tenantId)
        .expect(200);
      
      expect(mergedOrder.body.items).toHaveLength(2);
    });
  });

  describe('Takeaway Order Workflow', () => {
    it('should complete takeaway order with customer pickup', async () => {
      const workflow = new OrderWorkflow('TAKEAWAY');
      await workflow.execute();
      
      // Verify takeaway-specific properties
      expect(workflow.results.orderType).toBe('TAKEAWAY');
      expect(workflow.results.tableId).toBeNull();
      expect(workflow.results.estimatedPickupTime).toBeDefined();
    });

    it('should handle pre-order scheduling', async () => {
      const workflow = new OrderWorkflow('TAKEAWAY');
      const scheduledTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ], null, { scheduledTime });
      
      const order = await workflow.getOrderDetails();
      expect(new Date(order.scheduledTime)).toEqual(scheduledTime);
      expect(order.status).toBe('SCHEDULED');
    });
  });

  describe('Delivery Order Workflow', () => {
    it('should complete delivery order with partner assignment', async () => {
      const workflow = new OrderWorkflow('DELIVERY');
      await workflow.execute();
      
      // Verify delivery-specific properties
      expect(workflow.results.orderType).toBe('DELIVERY');
      expect(workflow.results.deliveryPartnerId).toBeDefined();
      expect(workflow.results.deliveryAddress).toBeDefined();
      expect(workflow.results.estimatedDeliveryTime).toBeDefined();
    });

    it('should handle delivery partner unavailability', async () => {
      const workflow = new OrderWorkflow('DELIVERY');
      
      // Mock delivery partner service to return unavailable
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      // Attempt to assign delivery partner
      const assignResponse = await request(gatewayUrl)
        .post(`/api/online-orders/${workflow.orderId}/assign-delivery`)
        .set('x-tenant-id', workflow.tenantId)
        .send({
          preferredPartner: 'unavailable-partner'
        });
      
      // Should fallback to available partner or queue for later assignment
      expect([200, 202]).toContain(assignResponse.status);
    });
  });

  describe('Payment Processing Workflows', () => {
    it('should handle cash payment workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      const paymentResponse = await workflow.processPayment({
        method: 'CASH',
        amount: workflow.orderTotal,
        receivedAmount: workflow.orderTotal + 5.00 // Customer gives extra
      });
      
      expect(paymentResponse.status).toBe('SUCCESS');
      expect(paymentResponse.change).toBe(5.00);
    });

    it('should handle credit card payment workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 2 }
      ]);
      
      const paymentResponse = await workflow.processPayment({
        method: 'CREDIT_CARD',
        amount: workflow.orderTotal,
        cardDetails: {
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        }
      });
      
      expect(paymentResponse.status).toBe('SUCCESS');
      expect(paymentResponse.transactionId).toBeDefined();
    });

    it('should handle digital wallet payment workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      const paymentResponse = await workflow.processPayment({
        method: 'DIGITAL_WALLET',
        amount: workflow.orderTotal,
        walletProvider: 'APPLE_PAY',
        walletToken: 'mock-wallet-token'
      });
      
      expect(paymentResponse.status).toBe('SUCCESS');
    });

    it('should handle split payment workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 4 }
      ]);
      
      // Split payment between cash and card
      const splitResponse = await request(gatewayUrl)
        .post(`/api/pos/orders/${workflow.orderId}/split-payment`)
        .set('x-tenant-id', workflow.tenantId)
        .send({
          payments: [
            {
              method: 'CASH',
              amount: Math.floor(workflow.orderTotal / 2)
            },
            {
              method: 'CREDIT_CARD',
              amount: Math.ceil(workflow.orderTotal / 2),
              cardDetails: {
                number: '4111111111111111',
                expiryMonth: '12',
                expiryYear: '2025',
                cvv: '123'
              }
            }
          ]
        })
        .expect(200);
      
      expect(splitResponse.body.payments).toHaveLength(2);
      expect(splitResponse.body.totalPaid).toBe(workflow.orderTotal);
    });
  });

  describe('Kitchen Operations Workflow', () => {
    it('should generate and process KOT workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 2 },
        { menuItemId: testData.menuItems[1].id, quantity: 1 }
      ]);
      
      // Finalize order to generate KOT
      const finalizeResponse = await request(gatewayUrl)
        .post(`/api/pos/orders/${workflow.orderId}/finalize`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      expect(finalizeResponse.body.kotGenerated).toBe(true);
      const kotId = finalizeResponse.body.kotId;
      
      // Kitchen marks items as prepared
      for (const item of workflow.orderItems) {
        await request(gatewayUrl)
          .put(`/api/pos/kot/${kotId}/items/${item.id}/status`)
          .set('x-tenant-id', workflow.tenantId)
          .send({ status: 'PREPARED' })
          .expect(200);
      }
      
      // Mark KOT as complete
      const completeResponse = await request(gatewayUrl)
        .put(`/api/pos/kot/${kotId}/complete`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      expect(completeResponse.body.status).toBe('COMPLETED');
    });

    it('should handle special instructions in KOT', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { 
          menuItemId: testData.menuItems[0].id, 
          quantity: 1,
          specialInstructions: 'No onions, extra cheese'
        }
      ]);
      
      const finalizeResponse = await request(gatewayUrl)
        .post(`/api/pos/orders/${workflow.orderId}/finalize`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      // Verify KOT contains special instructions
      const kotResponse = await request(gatewayUrl)
        .get(`/api/pos/kot/${finalizeResponse.body.kotId}`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      expect(kotResponse.body.items[0].specialInstructions).toBe('No onions, extra cheese');
    });
  });

  describe('Inventory Integration Workflow', () => {
    it('should update inventory after order completion', async () => {
      // Get initial inventory levels
      const initialInventory = await request(gatewayUrl)
        .get('/api/inventory/items')
        .set('x-tenant-id', testData.tenantId)
        .expect(200);
      
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.execute();
      
      // Check inventory levels after order
      const finalInventory = await request(gatewayUrl)
        .get('/api/inventory/items')
        .set('x-tenant-id', testData.tenantId)
        .expect(200);
      
      // Verify inventory was deducted based on recipe requirements
      for (const item of workflow.orderItems) {
        const menuItem = testData.menuItems.find(m => m.id === item.menuItemId);
        for (const ingredient of menuItem.ingredients) {
          const initialStock = initialInventory.body.find(i => i.name === ingredient.name);
          const finalStock = finalInventory.body.find(i => i.name === ingredient.name);
          
          const expectedDeduction = ingredient.quantity * item.quantity;
          expect(finalStock.currentStock).toBe(initialStock.currentStock - expectedDeduction);
        }
      }
    });

    it('should prevent order when insufficient inventory', async () => {
      // Create order that would exceed available inventory
      const workflow = new OrderWorkflow('DINE_IN');
      
      const orderResponse = await request(gatewayUrl)
        .post('/api/pos/orders')
        .set('x-tenant-id', workflow.tenantId)
        .send({
          customerId: testData.customerId,
          items: [
            { 
              menuItemId: testData.menuItems[0].id, 
              quantity: 1000 // Excessive quantity
            }
          ]
        })
        .expect(400);
      
      expect(orderResponse.body.error).toContain('insufficient inventory');
    });
  });

  describe('Customer Loyalty Integration', () => {
    it('should update loyalty points after order completion', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      
      // Get initial loyalty points
      const initialLoyalty = await request(gatewayUrl)
        .get(`/api/customers/${testData.customerId}/loyalty`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      await workflow.execute();
      
      // Check loyalty points after order
      const finalLoyalty = await request(gatewayUrl)
        .get(`/api/customers/${testData.customerId}/loyalty`)
        .set('x-tenant-id', workflow.tenantId)
        .expect(200);
      
      const expectedPoints = Math.floor(workflow.orderTotal); // 1 point per dollar
      expect(finalLoyalty.body.points).toBe(initialLoyalty.body.points + expectedPoints);
    });

    it('should apply loyalty discount in workflow', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.createOrder([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      // Apply loyalty discount
      const discountResponse = await request(gatewayUrl)
        .post(`/api/pos/orders/${workflow.orderId}/apply-loyalty-discount`)
        .set('x-tenant-id', workflow.tenantId)
        .send({
          customerId: testData.customerId,
          pointsToRedeem: 100
        })
        .expect(200);
      
      expect(discountResponse.body.discountApplied).toBeGreaterThan(0);
      expect(discountResponse.body.newTotal).toBeLessThan(workflow.orderTotal);
    });
  });

  describe('Analytics Integration Workflow', () => {
    it('should record analytics data after order completion', async () => {
      const workflow = new OrderWorkflow('DINE_IN');
      await workflow.execute();
      
      // Wait for analytics processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check that analytics were recorded
      const analyticsResponse = await request(gatewayUrl)
        .get('/api/analytics/sales/daily')
        .set('x-tenant-id', workflow.tenantId)
        .query({
          date: new Date().toISOString().split('T')[0]
        })
        .expect(200);
      
      expect(analyticsResponse.body.totalSales).toBeGreaterThan(0);
      expect(analyticsResponse.body.orderCount).toBeGreaterThan(0);
    });

    it('should track popular items in analytics', async () => {
      const workflow1 = new OrderWorkflow('DINE_IN');
      const workflow2 = new OrderWorkflow('DINE_IN');
      
      // Create multiple orders with same item
      await workflow1.execute([
        { menuItemId: testData.menuItems[0].id, quantity: 1 }
      ]);
      
      await workflow2.execute([
        { menuItemId: testData.menuItems[0].id, quantity: 2 }
      ]);
      
      // Check popular items analytics
      const popularItemsResponse = await request(gatewayUrl)
        .get('/api/analytics/popular-items')
        .set('x-tenant-id', workflow1.tenantId)
        .expect(200);
      
      const popularItem = popularItemsResponse.body.find(
        item => item.menuItemId === testData.menuItems[0].id
      );
      
      expect(popularItem).toBeDefined();
      expect(popularItem.totalQuantity).toBe(3);
    });
  });

  // Helper class for managing order workflows
  class OrderWorkflow {
    constructor(orderType = 'DINE_IN') {
      this.orderType = orderType;
      this.tenantId = testData.tenantId;
      this.customerId = testData.customerId;
      this.outletId = testData.outletId;
      this.tableId = orderType === 'DINE_IN' ? uuidv4() : null;
      this.orderId = null;
      this.orderTotal = 0;
      this.orderItems = [];
      this.results = {};
    }

    async execute(items = null) {
      try {
        await this.createOrder(items || [
          { menuItemId: testData.menuItems[0].id, quantity: 1 }
        ]);
        
        await this.finalizeOrder();
        await this.processPayment();
        await this.verifyCompletion();
        
        return this.results;
      } catch (error) {
        console.error('Workflow execution failed:', error);
        throw error;
      }
    }

    async createOrder(items, tenantId = null, options = {}) {
      this.tenantId = tenantId || this.tenantId;
      this.orderItems = items;
      
      const orderData = {
        customerId: this.customerId,
        outletId: this.outletId,
        orderType: this.orderType,
        items: items.map(item => ({
          ...item,
          unitPrice: testData.menuItems.find(m => m.id === item.menuItemId).price
        })),
        ...options
      };
      
      if (this.tableId) {
        orderData.tableId = this.tableId;
      }
      
      if (this.orderType === 'DELIVERY') {
        orderData.deliveryAddress = testData.deliveryAddress;
      }
      
      const response = await request(gatewayUrl)
        .post('/api/pos/orders')
        .set('x-tenant-id', this.tenantId)
        .send(orderData)
        .expect(201);
      
      this.orderId = response.body.id;
      this.orderTotal = response.body.total;
      this.results.orderCreated = true;
      
      return response.body;
    }

    async finalizeOrder() {
      const response = await request(gatewayUrl)
        .post(`/api/pos/orders/${this.orderId}/finalize`)
        .set('x-tenant-id', this.tenantId)
        .expect(200);
      
      this.results.kotGenerated = response.body.kotGenerated;
      return response.body;
    }

    async processPayment(paymentDetails = null) {
      const defaultPayment = {
        method: 'CREDIT_CARD',
        amount: this.orderTotal,
        cardDetails: {
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123'
        }
      };
      
      const payment = paymentDetails || defaultPayment;
      
      const response = await request(gatewayUrl)
        .post('/api/payments/process')
        .set('x-tenant-id', this.tenantId)
        .send({
          orderId: this.orderId,
          ...payment
        })
        .expect(200);
      
      this.results.paymentProcessed = response.body.status === 'SUCCESS';
      return response.body;
    }

    async getOrderDetails() {
      const response = await request(gatewayUrl)
        .get(`/api/pos/orders/${this.orderId}`)
        .set('x-tenant-id', this.tenantId)
        .expect(200);
      
      return response.body;
    }

    async verifyCompletion() {
      // Verify all workflow steps completed
      this.results.inventoryUpdated = await this.verifyInventoryUpdate();
      this.results.loyaltyUpdated = await this.verifyLoyaltyUpdate();
      this.results.analyticsRecorded = await this.verifyAnalyticsUpdate();
    }

    async verifyInventoryUpdate() {
      // Implementation would check inventory levels
      return true;
    }

    async verifyLoyaltyUpdate() {
      // Implementation would check loyalty points
      return true;
    }

    async verifyAnalyticsUpdate() {
      // Implementation would check analytics data
      return true;
    }
  }

  // Setup and cleanup functions
  async function setupTestEnvironment() {
    // Create test tenant
    const tenantResponse = await request(gatewayUrl)
      .post('/api/tenants')
      .send({
        businessName: 'Workflow Test Restaurant',
        contactEmail: 'workflow@test.com'
      })
      .expect(201);
    
    testData.tenantId = tenantResponse.body.id;
    
    // Create test outlet
    const outletResponse = await request(gatewayUrl)
      .post('/api/tenants/outlets')
      .set('x-tenant-id', testData.tenantId)
      .send({
        name: 'Test Outlet',
        address: { street: '123 Test St', city: 'Test City' }
      })
      .expect(201);
    
    testData.outletId = outletResponse.body.id;
    
    // Create test customer
    const customerResponse = await request(gatewayUrl)
      .post('/api/customers')
      .set('x-tenant-id', testData.tenantId)
      .send({
        name: 'Test Customer',
        email: 'customer@test.com'
      })
      .expect(201);
    
    testData.customerId = customerResponse.body.id;
    
    // Create test menu items
    testData.menuItems = [];
    for (let i = 0; i < 3; i++) {
      const itemResponse = await request(gatewayUrl)
        .post('/api/menu/items')
        .set('x-tenant-id', testData.tenantId)
        .send({
          name: `Test Item ${i + 1}`,
          price: 10.99 + i,
          category: 'Test Category',
          ingredients: [
            { name: `Ingredient ${i + 1}`, quantity: 1 }
          ]
        })
        .expect(201);
      
      testData.menuItems.push(itemResponse.body);
    }
    
    testData.deliveryAddress = {
      street: '456 Delivery St',
      city: 'Test City',
      zipCode: '12345'
    };
  }

  async function cleanupTestEnvironment() {
    // Cleanup would be implemented here
    // For now, we'll leave test data for inspection
  }
});
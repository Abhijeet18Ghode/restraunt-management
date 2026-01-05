const request = require('supertest');
const { v4: uuidv4 } = require('uuid');
const SystemManager = require('../../scripts/start-system');

describe('Complete System Integration Tests', () => {
  let systemManager;
  let gatewayUrl = 'http://localhost:3000';
  
  beforeAll(async () => {
    // Start the system manager
    systemManager = new SystemManager();
    
    // Start all services
    console.log('Starting all services for integration tests...');
    await systemManager.startAllServices();
    
    // Wait for all services to be fully ready
    await new Promise(resolve => setTimeout(resolve, 10000));
  }, 120000); // 2 minute timeout for startup
  
  afterAll(async () => {
    if (systemManager) {
      console.log('Stopping all services...');
      await systemManager.stopAllServices();
    }
  }, 60000); // 1 minute timeout for shutdown

  describe('End-to-End Restaurant Operations Workflow', () => {
    let tenantId;
    let outletId;
    let customerId;
    let menuItemId;
    let orderId;
    let staffId;
    
    it('should create a new tenant and setup restaurant', async () => {
      const response = await request(gatewayUrl)
        .post('/api/tenants')
        .send({
          businessName: 'Integration Test Restaurant',
          contactEmail: 'test@restaurant.com',
          contactPhone: '+1234567890',
          address: {
            street: '123 Test Street',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          }
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.businessName).toBe('Integration Test Restaurant');
      tenantId = response.body.id;
      
      console.log(`Created tenant: ${tenantId}`);
    });
    
    it('should create an outlet for the tenant', async () => {
      const response = await request(gatewayUrl)
        .post('/api/tenants/outlets')
        .set('x-tenant-id', tenantId)
        .send({
          name: 'Main Branch',
          address: {
            street: '123 Main Street',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          },
          operatingHours: {
            monday: { open: '09:00', close: '22:00' },
            tuesday: { open: '09:00', close: '22:00' },
            wednesday: { open: '09:00', close: '22:00' },
            thursday: { open: '09:00', close: '22:00' },
            friday: { open: '09:00', close: '23:00' },
            saturday: { open: '09:00', close: '23:00' },
            sunday: { open: '10:00', close: '21:00' }
          },
          taxConfiguration: {
            salesTax: 8.5,
            serviceTax: 10.0
          }
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Main Branch');
      outletId = response.body.id;
      
      console.log(`Created outlet: ${outletId}`);
    });
    
    it('should create staff members', async () => {
      const response = await request(gatewayUrl)
        .post('/api/staff')
        .set('x-tenant-id', tenantId)
        .send({
          outletId,
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@restaurant.com',
          phone: '+1234567890',
          role: 'cashier',
          permissions: ['pos_access', 'order_management']
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.firstName).toBe('John');
      staffId = response.body.id;
      
      console.log(`Created staff member: ${staffId}`);
    });
    
    it('should create menu categories and items', async () => {
      // Create category
      const categoryResponse = await request(gatewayUrl)
        .post('/api/menu/categories')
        .set('x-tenant-id', tenantId)
        .send({
          name: 'Main Course',
          description: 'Hearty main dishes',
          sortOrder: 1
        })
        .expect(201);
      
      const categoryId = categoryResponse.body.id;
      
      // Create menu item
      const itemResponse = await request(gatewayUrl)
        .post('/api/menu/items')
        .set('x-tenant-id', tenantId)
        .send({
          categoryId,
          name: 'Grilled Chicken Burger',
          description: 'Juicy grilled chicken with fresh vegetables',
          price: 15.99,
          preparationTime: 12,
          ingredients: ['chicken_breast', 'burger_bun', 'lettuce', 'tomato'],
          isAvailable: true,
          outletIds: [outletId]
        })
        .expect(201);
      
      expect(itemResponse.body).toHaveProperty('id');
      expect(itemResponse.body.name).toBe('Grilled Chicken Burger');
      menuItemId = itemResponse.body.id;
      
      console.log(`Created menu item: ${menuItemId}`);
    });
    
    it('should setup inventory items', async () => {
      const inventoryItems = [
        {
          name: 'Chicken Breast',
          category: 'Protein',
          unit: 'pieces',
          currentStock: 100,
          minimumStock: 20,
          maximumStock: 200,
          unitCost: 3.50
        },
        {
          name: 'Burger Bun',
          category: 'Bakery',
          unit: 'pieces',
          currentStock: 150,
          minimumStock: 30,
          maximumStock: 300,
          unitCost: 0.75
        }
      ];
      
      for (const item of inventoryItems) {
        const response = await request(gatewayUrl)
          .post('/api/inventory/items')
          .set('x-tenant-id', tenantId)
          .send({
            ...item,
            outletId
          })
          .expect(201);
        
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(item.name);
      }
      
      console.log('Created inventory items');
    });
    
    it('should create a customer', async () => {
      const response = await request(gatewayUrl)
        .post('/api/customers')
        .set('x-tenant-id', tenantId)
        .send({
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1987654321',
          address: {
            street: '456 Customer Street',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345'
          }
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Jane Smith');
      customerId = response.body.id;
      
      console.log(`Created customer: ${customerId}`);
    });
    
    it('should create and process a complete order', async () => {
      // Create order
      const orderResponse = await request(gatewayUrl)
        .post('/api/pos/orders')
        .set('x-tenant-id', tenantId)
        .send({
          outletId,
          customerId,
          orderType: 'DINE_IN',
          tableId: uuidv4(),
          items: [
            {
              menuItemId,
              quantity: 2,
              unitPrice: 15.99,
              specialInstructions: 'No onions'
            }
          ],
          subtotal: 31.98,
          tax: 2.88,
          discount: 0,
          total: 34.86
        })
        .expect(201);
      
      expect(orderResponse.body).toHaveProperty('id');
      expect(orderResponse.body.total).toBe(34.86);
      orderId = orderResponse.body.id;
      
      console.log(`Created order: ${orderId}`);
      
      // Finalize order (should generate KOT)
      const finalizeResponse = await request(gatewayUrl)
        .post(`/api/pos/orders/${orderId}/finalize`)
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(finalizeResponse.body.status).toBe('finalized');
      expect(finalizeResponse.body).toHaveProperty('kotGenerated');
      expect(finalizeResponse.body).toHaveProperty('invoiceNumber');
      
      console.log(`Order finalized with invoice: ${finalizeResponse.body.invoiceNumber}`);
    });
    
    it('should process payment for the order', async () => {
      const response = await request(gatewayUrl)
        .post('/api/payments/process')
        .set('x-tenant-id', tenantId)
        .send({
          orderId,
          amount: 34.86,
          paymentMethod: 'credit_card',
          paymentDetails: {
            cardType: 'visa',
            last4: '1234'
          }
        })
        .expect(200);
      
      expect(response.body.status).toBe('success');
      expect(response.body.amount).toBe(34.86);
      expect(response.body).toHaveProperty('transactionId');
      
      console.log(`Payment processed: ${response.body.transactionId}`);
    });
    
    it('should update customer loyalty points', async () => {
      const response = await request(gatewayUrl)
        .get(`/api/customers/${customerId}/loyalty`)
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('points');
      expect(response.body.points).toBeGreaterThan(0);
      
      console.log(`Customer loyalty points: ${response.body.points}`);
    });
    
    it('should generate analytics data', async () => {
      const response = await request(gatewayUrl)
        .get('/api/analytics/sales/daily')
        .set('x-tenant-id', tenantId)
        .query({
          date: new Date().toISOString().split('T')[0],
          outletId
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('orderCount');
      expect(response.body.totalSales).toBeGreaterThan(0);
      
      console.log(`Daily sales: $${response.body.totalSales}`);
    });
    
    it('should check inventory levels after order', async () => {
      const response = await request(gatewayUrl)
        .get('/api/inventory/items')
        .set('x-tenant-id', tenantId)
        .query({ outletId })
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // Check that inventory was deducted
      const chickenItem = response.body.find(item => item.name === 'Chicken Breast');
      expect(chickenItem).toBeDefined();
      expect(chickenItem.currentStock).toBeLessThan(100); // Should be reduced
      
      console.log(`Remaining chicken stock: ${chickenItem.currentStock}`);
    });
  });
  
  describe('Multi-Tenant Isolation Verification', () => {
    let tenant1Id, tenant2Id;
    let customer1Id, customer2Id;
    
    it('should create two separate tenants', async () => {
      const tenant1Response = await request(gatewayUrl)
        .post('/api/tenants')
        .send({
          businessName: 'Restaurant Chain A',
          contactEmail: 'admin@chaina.com'
        })
        .expect(201);
      
      const tenant2Response = await request(gatewayUrl)
        .post('/api/tenants')
        .send({
          businessName: 'Restaurant Chain B',
          contactEmail: 'admin@chainb.com'
        })
        .expect(201);
      
      tenant1Id = tenant1Response.body.id;
      tenant2Id = tenant2Response.body.id;
      
      expect(tenant1Id).not.toBe(tenant2Id);
    });
    
    it('should isolate customer data between tenants', async () => {
      // Create customer for tenant 1
      const customer1Response = await request(gatewayUrl)
        .post('/api/customers')
        .set('x-tenant-id', tenant1Id)
        .send({
          name: 'Customer A',
          email: 'customera@example.com'
        })
        .expect(201);
      
      customer1Id = customer1Response.body.id;
      
      // Create customer for tenant 2
      const customer2Response = await request(gatewayUrl)
        .post('/api/customers')
        .set('x-tenant-id', tenant2Id)
        .send({
          name: 'Customer B',
          email: 'customerb@example.com'
        })
        .expect(201);
      
      customer2Id = customer2Response.body.id;
      
      // Verify tenant 1 cannot access tenant 2's customer
      await request(gatewayUrl)
        .get(`/api/customers/${customer2Id}`)
        .set('x-tenant-id', tenant1Id)
        .expect(404);
      
      // Verify tenant 2 cannot access tenant 1's customer
      await request(gatewayUrl)
        .get(`/api/customers/${customer1Id}`)
        .set('x-tenant-id', tenant2Id)
        .expect(404);
    });
    
    it('should isolate analytics data between tenants', async () => {
      // Get analytics for tenant 1
      const analytics1Response = await request(gatewayUrl)
        .get('/api/analytics/sales/daily')
        .set('x-tenant-id', tenant1Id)
        .expect(200);
      
      // Get analytics for tenant 2
      const analytics2Response = await request(gatewayUrl)
        .get('/api/analytics/sales/daily')
        .set('x-tenant-id', tenant2Id)
        .expect(200);
      
      // Analytics should be different (tenant 1 has orders, tenant 2 doesn't)
      expect(analytics1Response.body.totalSales).not.toBe(analytics2Response.body.totalSales);
    });
  });
  
  describe('System Performance and Load Testing', () => {
    let testTenantId;
    
    beforeAll(async () => {
      // Create a test tenant for performance testing
      const response = await request(gatewayUrl)
        .post('/api/tenants')
        .send({
          businessName: 'Performance Test Restaurant',
          contactEmail: 'perf@test.com'
        })
        .expect(201);
      
      testTenantId = response.body.id;
    });
    
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();
      
      // Create multiple concurrent requests
      const requests = Array(concurrentRequests).fill().map((_, index) => 
        request(gatewayUrl)
          .post('/api/customers')
          .set('x-tenant-id', testTenantId)
          .send({
            name: `Customer ${index}`,
            email: `customer${index}@test.com`
          })
      );
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
      
      // Should complete within reasonable time (adjust based on your requirements)
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`Processed ${concurrentRequests} concurrent requests in ${duration}ms`);
    });
    
    it('should maintain response times under load', async () => {
      const requestCount = 50;
      const responseTimes = [];
      
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        
        await request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', testTenantId)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }
      
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log(`Average response time: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
      
      // Response times should be reasonable
      expect(averageResponseTime).toBeLessThan(500); // 500ms average
      expect(maxResponseTime).toBeLessThan(2000); // 2s max
    });
  });
  
  describe('Error Handling and Resilience', () => {
    it('should handle invalid tenant IDs gracefully', async () => {
      const response = await request(gatewayUrl)
        .get('/api/customers')
        .set('x-tenant-id', 'invalid-tenant-id')
        .expect(403);
      
      expect(response.body.error).toBeDefined();
    });
    
    it('should handle malformed requests', async () => {
      const response = await request(gatewayUrl)
        .post('/api/customers')
        .set('x-tenant-id', uuidv4())
        .send({
          // Missing required fields
          email: 'incomplete@test.com'
        })
        .expect(400);
      
      expect(response.body.error).toBeDefined();
    });
    
    it('should enforce rate limiting', async () => {
      const tenantId = uuidv4();
      
      // Make rapid requests to trigger rate limiting
      const requests = Array(100).fill().map(() => 
        request(gatewayUrl)
          .get('/health')
          .set('x-tenant-id', tenantId)
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
  
  describe('Service Health and Monitoring', () => {
    it('should report healthy status for all services', async () => {
      const response = await request(gatewayUrl)
        .get('/services/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('orchestrator');
      expect(response.body).toHaveProperty('health');
      
      // Check that critical services are running
      const criticalServices = ['tenant-service', 'pos-service', 'menu-service'];
      for (const serviceName of criticalServices) {
        expect(response.body.health[serviceName]).toBeDefined();
        expect(response.body.health[serviceName].status).toBe('healthy');
      }
    });
    
    it('should provide service discovery information', async () => {
      const response = await request(gatewayUrl)
        .get('/services')
        .expect(200);
      
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('loadBalancer');
      
      // Verify all expected services are registered
      const expectedServices = [
        'tenant-service',
        'menu-service',
        'inventory-service',
        'pos-service',
        'customer-service',
        'analytics-service',
        'payment-service'
      ];
      
      for (const serviceName of expectedServices) {
        expect(response.body.services[serviceName]).toBeDefined();
        expect(response.body.services[serviceName].status).toBe('available');
      }
    });
  });
});
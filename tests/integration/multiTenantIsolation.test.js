const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

describe('Multi-Tenant Isolation Integration Tests', () => {
  const gatewayUrl = 'http://localhost:3000';
  let tenants = {};

  beforeAll(async () => {
    // Create multiple test tenants
    await setupMultipleTenants();
  }, 60000);

  afterAll(async () => {
    // Cleanup test data
    await cleanupTenants();
  });

  describe('Data Isolation Across All Services', () => {
    describe('Tenant Service Isolation', () => {
      it('should isolate tenant configuration data', async () => {
        // Tenant A should not see Tenant B's configuration
        const configA = await request(gatewayUrl)
          .get('/api/tenants/config')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const configB = await request(gatewayUrl)
          .get('/api/tenants/config')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        expect(configA.body.tenantId).toBe(tenants.A.id);
        expect(configB.body.tenantId).toBe(tenants.B.id);
        expect(configA.body.tenantId).not.toBe(configB.body.tenantId);
      });

      it('should prevent cross-tenant outlet access', async () => {
        // Try to access Tenant B's outlet with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/tenants/outlets/${tenants.B.outletId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404); // Should not find the outlet
      });
    });

    describe('Menu Service Isolation', () => {
      it('should isolate menu items between tenants', async () => {
        // Get menu items for each tenant
        const menuA = await request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const menuB = await request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no overlap in menu items
        const itemIdsA = menuA.body.map(item => item.id);
        const itemIdsB = menuB.body.map(item => item.id);
        const overlap = itemIdsA.filter(id => itemIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant menu item access', async () => {
        // Try to access Tenant B's menu item with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/menu/items/${tenants.B.menuItemId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404);
      });

      it('should isolate menu categories between tenants', async () => {
        const categoriesA = await request(gatewayUrl)
          .get('/api/menu/categories')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const categoriesB = await request(gatewayUrl)
          .get('/api/menu/categories')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify categories are isolated
        const categoryIdsA = categoriesA.body.map(cat => cat.id);
        const categoryIdsB = categoriesB.body.map(cat => cat.id);
        const overlap = categoryIdsA.filter(id => categoryIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });
    });

    describe('Inventory Service Isolation', () => {
      it('should isolate inventory items between tenants', async () => {
        const inventoryA = await request(gatewayUrl)
          .get('/api/inventory/items')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const inventoryB = await request(gatewayUrl)
          .get('/api/inventory/items')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no shared inventory items
        const itemIdsA = inventoryA.body.map(item => item.id);
        const itemIdsB = inventoryB.body.map(item => item.id);
        const overlap = itemIdsA.filter(id => itemIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant inventory updates', async () => {
        // Try to update Tenant B's inventory with Tenant A's credentials
        await request(gatewayUrl)
          .put(`/api/inventory/items/${tenants.B.inventoryItemId}`)
          .set('x-tenant-id', tenants.A.id)
          .send({ currentStock: 999 })
          .expect(404);
      });

      it('should isolate supplier data between tenants', async () => {
        const suppliersA = await request(gatewayUrl)
          .get('/api/inventory/suppliers')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const suppliersB = await request(gatewayUrl)
          .get('/api/inventory/suppliers')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify suppliers are isolated
        const supplierIdsA = suppliersA.body.map(s => s.id);
        const supplierIdsB = suppliersB.body.map(s => s.id);
        const overlap = supplierIdsA.filter(id => supplierIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });
    });

    describe('POS Service Isolation', () => {
      it('should isolate orders between tenants', async () => {
        const ordersA = await request(gatewayUrl)
          .get('/api/pos/orders')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const ordersB = await request(gatewayUrl)
          .get('/api/pos/orders')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no shared orders
        const orderIdsA = ordersA.body.map(order => order.id);
        const orderIdsB = ordersB.body.map(order => order.id);
        const overlap = orderIdsA.filter(id => orderIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant order access', async () => {
        // Try to access Tenant B's order with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/pos/orders/${tenants.B.orderId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404);
      });

      it('should isolate table management between tenants', async () => {
        const tablesA = await request(gatewayUrl)
          .get('/api/pos/tables')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const tablesB = await request(gatewayUrl)
          .get('/api/pos/tables')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify tables are isolated
        const tableIdsA = tablesA.body.map(table => table.id);
        const tableIdsB = tablesB.body.map(table => table.id);
        const overlap = tableIdsA.filter(id => tableIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });
    });

    describe('Customer Service Isolation', () => {
      it('should isolate customer data between tenants', async () => {
        const customersA = await request(gatewayUrl)
          .get('/api/customers')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const customersB = await request(gatewayUrl)
          .get('/api/customers')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no shared customers
        const customerIdsA = customersA.body.map(customer => customer.id);
        const customerIdsB = customersB.body.map(customer => customer.id);
        const overlap = customerIdsA.filter(id => customerIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant customer access', async () => {
        // Try to access Tenant B's customer with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/customers/${tenants.B.customerId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404);
      });

      it('should isolate loyalty programs between tenants', async () => {
        const loyaltyA = await request(gatewayUrl)
          .get(`/api/customers/${tenants.A.customerId}/loyalty`)
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const loyaltyB = await request(gatewayUrl)
          .get(`/api/customers/${tenants.B.customerId}/loyalty`)
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify loyalty data is isolated
        expect(loyaltyA.body.customerId).toBe(tenants.A.customerId);
        expect(loyaltyB.body.customerId).toBe(tenants.B.customerId);
      });
    });

    describe('Staff Service Isolation', () => {
      it('should isolate staff data between tenants', async () => {
        const staffA = await request(gatewayUrl)
          .get('/api/staff')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const staffB = await request(gatewayUrl)
          .get('/api/staff')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no shared staff members
        const staffIdsA = staffA.body.map(staff => staff.id);
        const staffIdsB = staffB.body.map(staff => staff.id);
        const overlap = staffIdsA.filter(id => staffIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant staff access', async () => {
        // Try to access Tenant B's staff with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/staff/${tenants.B.staffId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404);
      });

      it('should isolate attendance records between tenants', async () => {
        const attendanceA = await request(gatewayUrl)
          .get('/api/staff/attendance')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const attendanceB = await request(gatewayUrl)
          .get('/api/staff/attendance')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify attendance records are isolated
        const recordIdsA = attendanceA.body.map(record => record.id);
        const recordIdsB = attendanceB.body.map(record => record.id);
        const overlap = recordIdsA.filter(id => recordIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });
    });

    describe('Analytics Service Isolation', () => {
      it('should isolate sales analytics between tenants', async () => {
        const analyticsA = await request(gatewayUrl)
          .get('/api/analytics/sales/daily')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const analyticsB = await request(gatewayUrl)
          .get('/api/analytics/sales/daily')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify analytics data is different (isolated)
        expect(analyticsA.body.tenantId).toBe(tenants.A.id);
        expect(analyticsB.body.tenantId).toBe(tenants.B.id);
      });

      it('should isolate report generation between tenants', async () => {
        const reportA = await request(gatewayUrl)
          .post('/api/analytics/reports/generate')
          .set('x-tenant-id', tenants.A.id)
          .send({
            type: 'sales_summary',
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31'
            }
          })
          .expect(200);

        const reportB = await request(gatewayUrl)
          .post('/api/analytics/reports/generate')
          .set('x-tenant-id', tenants.B.id)
          .send({
            type: 'sales_summary',
            dateRange: {
              start: '2024-01-01',
              end: '2024-01-31'
            }
          })
          .expect(200);

        // Verify reports contain different data
        expect(reportA.body.tenantId).toBe(tenants.A.id);
        expect(reportB.body.tenantId).toBe(tenants.B.id);
        expect(reportA.body.reportId).not.toBe(reportB.body.reportId);
      });
    });

    describe('Payment Service Isolation', () => {
      it('should isolate payment transactions between tenants', async () => {
        const transactionsA = await request(gatewayUrl)
          .get('/api/payments/transactions')
          .set('x-tenant-id', tenants.A.id)
          .expect(200);

        const transactionsB = await request(gatewayUrl)
          .get('/api/payments/transactions')
          .set('x-tenant-id', tenants.B.id)
          .expect(200);

        // Verify no shared transactions
        const transactionIdsA = transactionsA.body.map(tx => tx.id);
        const transactionIdsB = transactionsB.body.map(tx => tx.id);
        const overlap = transactionIdsA.filter(id => transactionIdsB.includes(id));
        
        expect(overlap).toHaveLength(0);
      });

      it('should prevent cross-tenant payment access', async () => {
        // Try to access Tenant B's payment with Tenant A's credentials
        await request(gatewayUrl)
          .get(`/api/payments/transactions/${tenants.B.transactionId}`)
          .set('x-tenant-id', tenants.A.id)
          .expect(404);
      });
    });
  });

  describe('Cross-Tenant Operation Prevention', () => {
    it('should prevent cross-tenant data modification', async () => {
      // Try to modify Tenant B's data with Tenant A's credentials
      const attempts = [
        // Menu item modification
        request(gatewayUrl)
          .put(`/api/menu/items/${tenants.B.menuItemId}`)
          .set('x-tenant-id', tenants.A.id)
          .send({ name: 'Hacked Item' }),
        
        // Customer modification
        request(gatewayUrl)
          .put(`/api/customers/${tenants.B.customerId}`)
          .set('x-tenant-id', tenants.A.id)
          .send({ name: 'Hacked Customer' }),
        
        // Staff modification
        request(gatewayUrl)
          .put(`/api/staff/${tenants.B.staffId}`)
          .set('x-tenant-id', tenants.A.id)
          .send({ role: 'admin' }),
        
        // Inventory modification
        request(gatewayUrl)
          .put(`/api/inventory/items/${tenants.B.inventoryItemId}`)
          .set('x-tenant-id', tenants.A.id)
          .send({ currentStock: 0 })
      ];

      const responses = await Promise.all(attempts);
      
      // All attempts should fail with 404 (not found) or 403 (forbidden)
      responses.forEach(response => {
        expect([403, 404]).toContain(response.status);
      });
    });

    it('should prevent cross-tenant data deletion', async () => {
      // Try to delete Tenant B's data with Tenant A's credentials
      const attempts = [
        request(gatewayUrl)
          .delete(`/api/menu/items/${tenants.B.menuItemId}`)
          .set('x-tenant-id', tenants.A.id),
        
        request(gatewayUrl)
          .delete(`/api/customers/${tenants.B.customerId}`)
          .set('x-tenant-id', tenants.A.id),
        
        request(gatewayUrl)
          .delete(`/api/staff/${tenants.B.staffId}`)
          .set('x-tenant-id', tenants.A.id)
      ];

      const responses = await Promise.all(attempts);
      
      // All attempts should fail
      responses.forEach(response => {
        expect([403, 404]).toContain(response.status);
      });
    });
  });

  describe('Tenant Context Validation', () => {
    it('should reject requests without tenant ID', async () => {
      const response = await request(gatewayUrl)
        .get('/api/menu/items')
        // No x-tenant-id header
        .expect(400);

      expect(response.body.error).toContain('tenant');
    });

    it('should reject requests with invalid tenant ID', async () => {
      const response = await request(gatewayUrl)
        .get('/api/menu/items')
        .set('x-tenant-id', 'invalid-tenant-id')
        .expect(403);

      expect(response.body.error).toContain('tenant');
    });

    it('should validate tenant ID format', async () => {
      const invalidTenantIds = [
        '', // Empty
        'abc', // Too short
        '123-456-789', // Invalid format
        'not-a-uuid' // Not a UUID
      ];

      for (const invalidId of invalidTenantIds) {
        const response = await request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', invalidId);
        
        expect([400, 403]).toContain(response.status);
      }
    });
  });

  describe('Concurrent Multi-Tenant Operations', () => {
    it('should handle concurrent operations from different tenants', async () => {
      const concurrentOperations = [
        // Tenant A operations
        request(gatewayUrl)
          .post('/api/menu/items')
          .set('x-tenant-id', tenants.A.id)
          .send({
            name: 'Concurrent Item A',
            price: 15.99,
            category: 'Test'
          }),
        
        request(gatewayUrl)
          .post('/api/customers')
          .set('x-tenant-id', tenants.A.id)
          .send({
            name: 'Concurrent Customer A',
            email: 'concurrent.a@test.com'
          }),
        
        // Tenant B operations
        request(gatewayUrl)
          .post('/api/menu/items')
          .set('x-tenant-id', tenants.B.id)
          .send({
            name: 'Concurrent Item B',
            price: 12.99,
            category: 'Test'
          }),
        
        request(gatewayUrl)
          .post('/api/customers')
          .set('x-tenant-id', tenants.B.id)
          .send({
            name: 'Concurrent Customer B',
            email: 'concurrent.b@test.com'
          })
      ];

      const responses = await Promise.all(concurrentOperations);
      
      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify data is properly isolated
      const [itemA, customerA, itemB, customerB] = responses;
      
      expect(itemA.body.name).toBe('Concurrent Item A');
      expect(itemB.body.name).toBe('Concurrent Item B');
      expect(customerA.body.name).toBe('Concurrent Customer A');
      expect(customerB.body.name).toBe('Concurrent Customer B');
    });

    it('should maintain isolation under high concurrent load', async () => {
      const operationsPerTenant = 10;
      const allOperations = [];

      // Create operations for each tenant
      [tenants.A.id, tenants.B.id, tenants.C.id].forEach(tenantId => {
        for (let i = 0; i < operationsPerTenant; i++) {
          allOperations.push(
            request(gatewayUrl)
              .post('/api/customers')
              .set('x-tenant-id', tenantId)
              .send({
                name: `Load Test Customer ${i}`,
                email: `load.${i}@${tenantId}.com`
              })
          );
        }
      });

      const responses = await Promise.all(allOperations);
      
      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Verify each tenant has the correct number of customers
      for (const tenant of [tenants.A, tenants.B, tenants.C]) {
        const customers = await request(gatewayUrl)
          .get('/api/customers')
          .set('x-tenant-id', tenant.id)
          .expect(200);
        
        const loadTestCustomers = customers.body.filter(
          customer => customer.name.startsWith('Load Test Customer')
        );
        
        expect(loadTestCustomers).toHaveLength(operationsPerTenant);
      }
    });
  });

  // Setup and cleanup functions
  async function setupMultipleTenants() {
    const tenantNames = ['A', 'B', 'C'];
    
    for (const name of tenantNames) {
      tenants[name] = await createTenantWithData(name);
    }
  }

  async function createTenantWithData(name) {
    // Create tenant
    const tenantResponse = await request(gatewayUrl)
      .post('/api/tenants')
      .send({
        businessName: `Test Restaurant ${name}`,
        contactEmail: `tenant${name.toLowerCase()}@test.com`
      })
      .expect(201);

    const tenantData = { id: tenantResponse.body.id };

    // Create outlet
    const outletResponse = await request(gatewayUrl)
      .post('/api/tenants/outlets')
      .set('x-tenant-id', tenantData.id)
      .send({
        name: `Outlet ${name}`,
        address: { street: `${name} Street`, city: 'Test City' }
      })
      .expect(201);

    tenantData.outletId = outletResponse.body.id;

    // Create menu item
    const menuItemResponse = await request(gatewayUrl)
      .post('/api/menu/items')
      .set('x-tenant-id', tenantData.id)
      .send({
        name: `Item ${name}`,
        price: 10.99,
        category: 'Test Category'
      })
      .expect(201);

    tenantData.menuItemId = menuItemResponse.body.id;

    // Create customer
    const customerResponse = await request(gatewayUrl)
      .post('/api/customers')
      .set('x-tenant-id', tenantData.id)
      .send({
        name: `Customer ${name}`,
        email: `customer${name.toLowerCase()}@test.com`
      })
      .expect(201);

    tenantData.customerId = customerResponse.body.id;

    // Create staff member
    const staffResponse = await request(gatewayUrl)
      .post('/api/staff')
      .set('x-tenant-id', tenantData.id)
      .send({
        firstName: `Staff`,
        lastName: name,
        email: `staff${name.toLowerCase()}@test.com`,
        role: 'cashier'
      })
      .expect(201);

    tenantData.staffId = staffResponse.body.id;

    // Create inventory item
    const inventoryResponse = await request(gatewayUrl)
      .post('/api/inventory/items')
      .set('x-tenant-id', tenantData.id)
      .send({
        name: `Inventory Item ${name}`,
        currentStock: 100,
        minimumStock: 10,
        unit: 'pieces'
      })
      .expect(201);

    tenantData.inventoryItemId = inventoryResponse.body.id;

    // Create order
    const orderResponse = await request(gatewayUrl)
      .post('/api/pos/orders')
      .set('x-tenant-id', tenantData.id)
      .send({
        customerId: tenantData.customerId,
        items: [{
          menuItemId: tenantData.menuItemId,
          quantity: 1,
          unitPrice: 10.99
        }],
        total: 10.99
      })
      .expect(201);

    tenantData.orderId = orderResponse.body.id;

    // Create payment transaction
    const paymentResponse = await request(gatewayUrl)
      .post('/api/payments/process')
      .set('x-tenant-id', tenantData.id)
      .send({
        orderId: tenantData.orderId,
        amount: 10.99,
        method: 'CASH'
      })
      .expect(200);

    tenantData.transactionId = paymentResponse.body.transactionId;

    return tenantData;
  }

  async function cleanupTenants() {
    // Cleanup would be implemented here
    // For now, we'll leave test data for inspection
  }
});
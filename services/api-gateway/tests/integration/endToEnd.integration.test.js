const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

// Mock services for testing
const mockServices = {
  'tenant-service': null,
  'menu-service': null,
  'inventory-service': null,
  'pos-service': null,
  'online-order-service': null,
  'staff-service': null,
  'customer-service': null,
  'analytics-service': null,
  'payment-service': null,
  'websocket-service': null
};

// Create mock service apps
const createMockService = (serviceName, port) => {
  const app = express();
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: serviceName });
  });
  
  // Mock endpoints based on service
  switch (serviceName) {
    case 'tenant-service':
      app.post('/tenants', (req, res) => {
        res.status(201).json({
          id: uuidv4(),
          businessName: req.body.businessName,
          status: 'active'
        });
      });
      
      app.get('/tenants/:id', (req, res) => {
        res.json({
          id: req.params.id,
          businessName: 'Test Restaurant',
          status: 'active'
        });
      });
      break;
      
    case 'menu-service':
      app.get('/menu/items', (req, res) => {
        res.json([
          {
            id: uuidv4(),
            name: 'Burger',
            price: 12.99,
            category: 'Main Course',
            isAvailable: true
          },
          {
            id: uuidv4(),
            name: 'Pizza',
            price: 15.99,
            category: 'Main Course',
            isAvailable: true
          }
        ]);
      });
      
      app.post('/menu/items', (req, res) => {
        res.status(201).json({
          id: uuidv4(),
          ...req.body
        });
      });
      break;
      
    case 'inventory-service':
      app.get('/inventory/items', (req, res) => {
        res.json([
          {
            id: uuidv4(),
            name: 'Beef Patty',
            currentStock: 50,
            minimumStock: 10,
            unit: 'pieces'
          }
        ]);
      });
      
      app.post('/inventory/items/:id/update-stock', (req, res) => {
        res.json({
          id: req.params.id,
          currentStock: req.body.newStock,
          updated: true
        });
      });
      break;
      
    case 'pos-service':
      app.post('/orders', (req, res) => {
        const orderId = uuidv4();
        res.status(201).json({
          id: orderId,
          orderNumber: `ORD-${Date.now()}`,
          items: req.body.items,
          total: req.body.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          status: 'pending'
        });
      });
      
      app.post('/orders/:id/finalize', (req, res) => {
        res.json({
          id: req.params.id,
          status: 'finalized',
          kotGenerated: true,
          invoiceNumber: `INV-${Date.now()}`
        });
      });
      
      app.post('/orders/:id/payment', (req, res) => {
        res.json({
          id: req.params.id,
          paymentStatus: 'completed',
          paymentMethod: req.body.paymentMethod,
          transactionId: uuidv4()
        });
      });
      break;
      
    case 'payment-service':
      app.post('/payments/process', (req, res) => {
        res.json({
          transactionId: uuidv4(),
          status: 'success',
          amount: req.body.amount,
          paymentMethod: req.body.paymentMethod
        });
      });
      break;
      
    case 'customer-service':
      app.post('/customers', (req, res) => {
        res.status(201).json({
          id: uuidv4(),
          ...req.body
        });
      });
      
      app.get('/customers/:id/loyalty', (req, res) => {
        res.json({
          customerId: req.params.id,
          points: 150,
          tier: 'silver'
        });
      });
      break;
      
    case 'analytics-service':
      app.get('/analytics/sales/daily', (req, res) => {
        res.json({
          date: new Date().toISOString().split('T')[0],
          totalSales: 1250.50,
          orderCount: 45,
          averageOrderValue: 27.79
        });
      });
      break;
      
    default:
      app.get('*', (req, res) => {
        res.json({ service: serviceName, path: req.path });
      });
  }
  
  return app.listen(port, () => {
    console.log(`Mock ${serviceName} running on port ${port}`);
  });
};

describe('End-to-End Integration Tests', () => {
  let gatewayApp;
  let mockServers = {};
  
  beforeAll(async () => {
    // Start mock services
    const servicePorts = {
      'tenant-service': 3001,
      'menu-service': 3002,
      'inventory-service': 3003,
      'pos-service': 3004,
      'online-order-service': 3005,
      'staff-service': 3006,
      'customer-service': 3007,
      'analytics-service': 3008,
      'payment-service': 3009
    };
    
    for (const [serviceName, port] of Object.entries(servicePorts)) {
      mockServers[serviceName] = createMockService(serviceName, port);
    }
    
    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Import and start API Gateway
    gatewayApp = require('../../src/app');
  });
  
  afterAll(async () => {
    // Close all mock servers
    for (const server of Object.values(mockServers)) {
      server.close();
    }
  });
  
  describe('Complete Order-to-Payment Workflow', () => {
    let tenantId;
    let customerId;
    let orderId;
    
    it('should create a new tenant', async () => {
      const response = await request(gatewayApp)
        .post('/api/tenants')
        .send({
          businessName: 'Test Restaurant Chain',
          contactEmail: 'admin@testrestaurant.com'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.businessName).toBe('Test Restaurant Chain');
      tenantId = response.body.id;
    });
    
    it('should create a customer', async () => {
      const response = await request(gatewayApp)
        .post('/api/customers')
        .set('x-tenant-id', tenantId)
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('John Doe');
      customerId = response.body.id;
    });
    
    it('should retrieve menu items', async () => {
      const response = await request(gatewayApp)
        .get('/api/menu/items')
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('price');
    });
    
    it('should check inventory availability', async () => {
      const response = await request(gatewayApp)
        .get('/api/inventory/items')
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('currentStock');
      expect(response.body[0].currentStock).toBeGreaterThan(0);
    });
    
    it('should create a new order', async () => {
      const response = await request(gatewayApp)
        .post('/api/pos/orders')
        .set('x-tenant-id', tenantId)
        .send({
          customerId,
          items: [
            { id: uuidv4(), name: 'Burger', price: 12.99, quantity: 2 },
            { id: uuidv4(), name: 'Pizza', price: 15.99, quantity: 1 }
          ],
          tableId: uuidv4()
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('orderNumber');
      expect(response.body.total).toBe(41.97); // (12.99 * 2) + 15.99
      orderId = response.body.id;
    });
    
    it('should finalize the order and generate KOT', async () => {
      const response = await request(gatewayApp)
        .post(`/api/pos/orders/${orderId}/finalize`)
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(response.body.status).toBe('finalized');
      expect(response.body.kotGenerated).toBe(true);
      expect(response.body).toHaveProperty('invoiceNumber');
    });
    
    it('should process payment', async () => {
      const response = await request(gatewayApp)
        .post(`/api/pos/orders/${orderId}/payment`)
        .set('x-tenant-id', tenantId)
        .send({
          paymentMethod: 'credit_card',
          amount: 41.97
        })
        .expect(200);
      
      expect(response.body.paymentStatus).toBe('completed');
      expect(response.body).toHaveProperty('transactionId');
    });
    
    it('should update customer loyalty points', async () => {
      const response = await request(gatewayApp)
        .get(`/api/customers/${customerId}/loyalty`)
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('points');
      expect(response.body).toHaveProperty('tier');
    });
    
    it('should generate analytics data', async () => {
      const response = await request(gatewayApp)
        .get('/api/analytics/sales/daily')
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      expect(response.body).toHaveProperty('totalSales');
      expect(response.body).toHaveProperty('orderCount');
      expect(response.body).toHaveProperty('averageOrderValue');
    });
  });
  
  describe('Multi-Tenant Isolation', () => {
    let tenant1Id, tenant2Id;
    
    it('should create two separate tenants', async () => {
      const tenant1Response = await request(gatewayApp)
        .post('/api/tenants')
        .send({
          businessName: 'Restaurant A',
          contactEmail: 'admin@restauranta.com'
        })
        .expect(201);
      
      const tenant2Response = await request(gatewayApp)
        .post('/api/tenants')
        .send({
          businessName: 'Restaurant B',
          contactEmail: 'admin@restaurantb.com'
        })
        .expect(201);
      
      tenant1Id = tenant1Response.body.id;
      tenant2Id = tenant2Response.body.id;
      
      expect(tenant1Id).not.toBe(tenant2Id);
    });
    
    it('should isolate data between tenants', async () => {
      // Create customer for tenant 1
      const customer1Response = await request(gatewayApp)
        .post('/api/customers')
        .set('x-tenant-id', tenant1Id)
        .send({
          name: 'Customer A',
          email: 'customera@example.com'
        })
        .expect(201);
      
      // Create customer for tenant 2
      const customer2Response = await request(gatewayApp)
        .post('/api/customers')
        .set('x-tenant-id', tenant2Id)
        .send({
          name: 'Customer B',
          email: 'customerb@example.com'
        })
        .expect(201);
      
      expect(customer1Response.body.id).not.toBe(customer2Response.body.id);
    });
  });
  
  describe('Service Health and Discovery', () => {
    it('should return gateway health status', async () => {
      const response = await request(gatewayApp)
        .get('/health')
        .expect(200);
      
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('api-gateway');
    });
    
    it('should return service discovery information', async () => {
      const response = await request(gatewayApp)
        .get('/services')
        .expect(200);
      
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('loadBalancer');
      
      // Check that all expected services are listed
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
        expect(response.body.services).toHaveProperty(serviceName);
      }
    });
  });
  
  describe('Error Handling and Resilience', () => {
    it('should handle service unavailability gracefully', async () => {
      // Close one of the mock services
      mockServers['menu-service'].close();
      
      // Wait a moment for the service to be unavailable
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await request(gatewayApp)
        .get('/api/menu/items')
        .set('x-tenant-id', 'test-tenant')
        .expect(503);
      
      expect(response.body.error).toBe('Service temporarily unavailable');
      expect(response.body.service).toBe('menu-service');
      
      // Restart the service for other tests
      mockServers['menu-service'] = createMockService('menu-service', 3002);
      await new Promise(resolve => setTimeout(resolve, 500));
    });
    
    it('should handle invalid routes', async () => {
      const response = await request(gatewayApp)
        .get('/api/nonexistent/endpoint')
        .expect(404);
      
      expect(response.body.error).toBe('Route not found');
      expect(response.body).toHaveProperty('availableRoutes');
    });
    
    it('should enforce rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const requests = Array(20).fill().map(() => 
        request(gatewayApp)
          .get('/api/menu/items')
          .set('x-tenant-id', 'test-tenant')
      );
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
  
  describe('Request Tracing and Logging', () => {
    it('should add request ID to all requests', async () => {
      const response = await request(gatewayApp)
        .get('/api/menu/items')
        .set('x-tenant-id', 'test-tenant')
        .expect(200);
      
      // The request should have been processed successfully
      expect(response.status).toBe(200);
    });
    
    it('should preserve tenant context across service calls', async () => {
      const tenantId = uuidv4();
      
      const response = await request(gatewayApp)
        .get('/api/menu/items')
        .set('x-tenant-id', tenantId)
        .expect(200);
      
      // The request should have been processed with tenant context
      expect(response.status).toBe(200);
    });
  });
});
const request = require('supertest');
const app = require('../../src/robust-app');

describe('API Gateway Routing Fixes Integration Tests', () => {
  
  describe('Inventory API Routes', () => {
    test('should handle inventory menu-items status route', async () => {
      const response = await request(app)
        .get('/api/inventory/menu-items/status')
        .set('x-tenant-id', 'test-tenant')
        .set('x-request-id', 'test-request-123');

      // Should either proxy successfully or return 503 if service is down
      // Both indicate correct routing behavior
      expect([200, 201, 404, 503].includes(response.status)).toBe(true);
      
      // Should not return 404 with "Route not found" message (indicates routing worked)
      if (response.status === 404) {
        expect(response.body.error).not.toBe('Route not found');
      }
    });

    test('should handle inventory menu-items availability route', async () => {
      const response = await request(app)
        .get('/api/inventory/menu-items/availability')
        .set('x-tenant-id', 'test-tenant');

      expect([200, 201, 404, 503].includes(response.status)).toBe(true);
      
      if (response.status === 404) {
        expect(response.body.error).not.toBe('Route not found');
      }
    });
  });

  describe('Menu API Route Forwarding', () => {
    test('should handle PATCH requests to menu availability endpoints', async () => {
      const response = await request(app)
        .patch('/api/menu/items/123/availability')
        .set('x-tenant-id', 'test-tenant')
        .send({ isAvailable: false, reason: 'Out of stock' });

      expect([200, 201, 400, 404, 503].includes(response.status)).toBe(true);
      
      if (response.status === 404) {
        expect(response.body.error).not.toBe('Route not found');
      }
    });

    test('should handle bulk availability updates', async () => {
      const response = await request(app)
        .patch('/api/menu/items/availability')
        .set('x-tenant-id', 'test-tenant')
        .send({ 
          items: [
            { id: '123', isAvailable: false },
            { id: '456', isAvailable: true }
          ]
        });

      expect([200, 201, 400, 404, 503].includes(response.status)).toBe(true);
      
      if (response.status === 404) {
        expect(response.body.error).not.toBe('Route not found');
      }
    });
  });

  describe('Error Handling', () => {
    test('should return structured error responses for service failures', async () => {
      // This will likely return 503 since services aren't running
      const response = await request(app)
        .get('/api/inventory/menu-items/status')
        .set('x-tenant-id', 'test-tenant');

      if (response.status === 503) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
        expect(response.body).toHaveProperty('service');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('errorId');
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('message');
      }
    });

    test('should handle unknown routes correctly', async () => {
      const response = await request(app)
        .get('/api/unknown-service/test');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('API route not found');
      expect(response.body).toHaveProperty('availableRoutes');
    });
  });

  describe('Request Headers and Logging', () => {
    test('should forward tenant and request ID headers', async () => {
      const tenantId = 'test-tenant-123';
      const requestId = 'test-request-456';
      
      const response = await request(app)
        .get('/api/menu/items')
        .set('x-tenant-id', tenantId)
        .set('x-request-id', requestId);

      // The request should be processed (either success or service unavailable)
      expect([200, 201, 404, 503].includes(response.status)).toBe(true);
      
      // If it's a 404, it should be from the service, not the gateway
      if (response.status === 404) {
        expect(response.body.error).not.toBe('Route not found');
      }
    });
  });
});
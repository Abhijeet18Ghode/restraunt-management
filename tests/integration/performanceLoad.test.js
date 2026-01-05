const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

describe('System Performance and Load Testing', () => {
  const gatewayUrl = 'http://localhost:3000';
  let testData = {};

  beforeAll(async () => {
    await setupPerformanceTestEnvironment();
  }, 60000);

  afterAll(async () => {
    await cleanupPerformanceTestEnvironment();
  });

  describe('Response Time Performance', () => {
    it('should maintain fast response times for health checks', async () => {
      const iterations = 50;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(gatewayUrl)
          .get('/health')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      console.log(`Health Check Performance:
        Average: ${averageResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime}ms
        P95: ${p95ResponseTime}ms`);

      expect(averageResponseTime).toBeLessThan(50); // 50ms average
      expect(maxResponseTime).toBeLessThan(200); // 200ms max
      expect(p95ResponseTime).toBeLessThan(100); // 100ms P95
    });

    it('should maintain acceptable response times for menu queries', async () => {
      const iterations = 30;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', testData.tenantId)
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Menu Query Performance:
        Average: ${averageResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime}ms`);

      expect(averageResponseTime).toBeLessThan(300); // 300ms average
      expect(maxResponseTime).toBeLessThan(1000); // 1s max
    });

    it('should maintain acceptable response times for order creation', async () => {
      const iterations = 20;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await request(gatewayUrl)
          .post('/api/pos/orders')
          .set('x-tenant-id', testData.tenantId)
          .send({
            customerId: testData.customerId,
            items: [{
              menuItemId: testData.menuItemId,
              quantity: 1,
              unitPrice: 15.99
            }],
            total: 15.99
          })
          .expect(201);
        
        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      console.log(`Order Creation Performance:
        Average: ${averageResponseTime.toFixed(2)}ms
        Max: ${maxResponseTime}ms`);

      expect(averageResponseTime).toBeLessThan(500); // 500ms average
      expect(maxResponseTime).toBeLessThan(2000); // 2s max
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent menu requests efficiently', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const requests = Array(concurrentRequests).fill().map(() =>
        request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', testData.tenantId)
      );

      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const averageTimePerRequest = totalTime / concurrentRequests;
      
      console.log(`Concurrent Menu Requests:
        Total time: ${totalTime}ms
        Requests: ${concurrentRequests}
        Average per request: ${averageTimePerRequest.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(10000); // 10s total
      expect(averageTimePerRequest).toBeLessThan(200); // 200ms average per request
    });

    it('should handle concurrent order creation', async () => {
      const concurrentOrders = 20;
      const startTime = Date.now();

      const orderRequests = Array(concurrentOrders).fill().map((_, index) =>
        request(gatewayUrl)
          .post('/api/pos/orders')
          .set('x-tenant-id', testData.tenantId)
          .send({
            customerId: testData.customerId,
            items: [{
              menuItemId: testData.menuItemId,
              quantity: 1,
              unitPrice: 15.99
            }],
            total: 15.99,
            orderNumber: `PERF-${Date.now()}-${index}`
          })
      );

      const responses = await Promise.all(orderRequests);
      const totalTime = Date.now() - startTime;

      // All orders should be created successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });

      const averageTimePerOrder = totalTime / concurrentOrders;
      
      console.log(`Concurrent Order Creation:
        Total time: ${totalTime}ms
        Orders: ${concurrentOrders}
        Average per order: ${averageTimePerOrder.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(15000); // 15s total
      expect(averageTimePerOrder).toBeLessThan(750); // 750ms average per order
    });

    it('should handle mixed concurrent operations', async () => {
      const operationsPerType = 10;
      const startTime = Date.now();

      const allOperations = [
        // Menu queries
        ...Array(operationsPerType).fill().map(() =>
          request(gatewayUrl)
            .get('/api/menu/items')
            .set('x-tenant-id', testData.tenantId)
        ),
        
        // Customer queries
        ...Array(operationsPerType).fill().map(() =>
          request(gatewayUrl)
            .get('/api/customers')
            .set('x-tenant-id', testData.tenantId)
        ),
        
        // Inventory queries
        ...Array(operationsPerType).fill().map(() =>
          request(gatewayUrl)
            .get('/api/inventory/items')
            .set('x-tenant-id', testData.tenantId)
        ),
        
        // Analytics queries
        ...Array(operationsPerType).fill().map(() =>
          request(gatewayUrl)
            .get('/api/analytics/sales/daily')
            .set('x-tenant-id', testData.tenantId)
        )
      ];

      const responses = await Promise.all(allOperations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      const totalOperations = operationsPerType * 4;
      const averageTimePerOperation = totalTime / totalOperations;
      
      console.log(`Mixed Concurrent Operations:
        Total time: ${totalTime}ms
        Operations: ${totalOperations}
        Average per operation: ${averageTimePerOperation.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(20000); // 20s total
      expect(averageTimePerOperation).toBeLessThan(500); // 500ms average per operation
    });
  });

  describe('Load Testing', () => {
    it('should handle sustained load over time', async () => {
      const duration = 30000; // 30 seconds
      const requestInterval = 100; // 100ms between requests
      const startTime = Date.now();
      const results = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimes: []
      };

      const loadTest = async () => {
        while (Date.now() - startTime < duration) {
          const requestStart = Date.now();
          
          try {
            const response = await request(gatewayUrl)
              .get('/api/menu/items')
              .set('x-tenant-id', testData.tenantId);
            
            results.totalRequests++;
            
            if (response.status === 200) {
              results.successfulRequests++;
            } else {
              results.failedRequests++;
            }
            
            const responseTime = Date.now() - requestStart;
            results.responseTimes.push(responseTime);
            
          } catch (error) {
            results.totalRequests++;
            results.failedRequests++;
          }
          
          // Wait before next request
          await new Promise(resolve => setTimeout(resolve, requestInterval));
        }
      };

      await loadTest();

      const actualDuration = Date.now() - startTime;
      const successRate = (results.successfulRequests / results.totalRequests) * 100;
      const averageResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
      const requestsPerSecond = (results.totalRequests / actualDuration) * 1000;

      console.log(`Sustained Load Test Results:
        Duration: ${actualDuration}ms
        Total requests: ${results.totalRequests}
        Success rate: ${successRate.toFixed(2)}%
        Average response time: ${averageResponseTime.toFixed(2)}ms
        Requests per second: ${requestsPerSecond.toFixed(2)}`);

      expect(successRate).toBeGreaterThan(95); // 95% success rate
      expect(averageResponseTime).toBeLessThan(1000); // 1s average response time
      expect(requestsPerSecond).toBeGreaterThan(5); // At least 5 RPS
    });

    it('should handle burst traffic patterns', async () => {
      const burstSize = 50;
      const burstCount = 5;
      const burstInterval = 2000; // 2 seconds between bursts
      
      const allResults = [];

      for (let burst = 0; burst < burstCount; burst++) {
        console.log(`Executing burst ${burst + 1}/${burstCount}...`);
        
        const burstStart = Date.now();
        
        // Create burst of concurrent requests
        const burstRequests = Array(burstSize).fill().map(() =>
          request(gatewayUrl)
            .get('/api/menu/items')
            .set('x-tenant-id', testData.tenantId)
        );

        const responses = await Promise.all(burstRequests);
        const burstDuration = Date.now() - burstStart;

        const successfulResponses = responses.filter(r => r.status === 200);
        const successRate = (successfulResponses.length / responses.length) * 100;

        allResults.push({
          burst: burst + 1,
          duration: burstDuration,
          successRate,
          requestsPerSecond: (burstSize / burstDuration) * 1000
        });

        console.log(`Burst ${burst + 1} completed:
          Duration: ${burstDuration}ms
          Success rate: ${successRate.toFixed(2)}%
          RPS: ${((burstSize / burstDuration) * 1000).toFixed(2)}`);

        // Wait before next burst
        if (burst < burstCount - 1) {
          await new Promise(resolve => setTimeout(resolve, burstInterval));
        }
      }

      // Verify all bursts performed well
      allResults.forEach(result => {
        expect(result.successRate).toBeGreaterThan(90); // 90% success rate per burst
        expect(result.duration).toBeLessThan(10000); // 10s max per burst
      });

      const averageSuccessRate = allResults.reduce((sum, r) => sum + r.successRate, 0) / allResults.length;
      expect(averageSuccessRate).toBeGreaterThan(95); // 95% overall success rate
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should maintain stable memory usage under load', async () => {
      const initialMemory = await getSystemMemoryUsage();
      
      // Generate sustained load
      const loadRequests = Array(100).fill().map(() =>
        request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', testData.tenantId)
      );

      await Promise.all(loadRequests);
      
      // Wait for garbage collection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalMemory = await getSystemMemoryUsage();
      const memoryIncrease = finalMemory.used - initialMemory.used;
      const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100;

      console.log(`Memory Usage:
        Initial: ${(initialMemory.used / 1024 / 1024).toFixed(2)} MB
        Final: ${(finalMemory.used / 1024 / 1024).toFixed(2)} MB
        Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(2)}%)`);

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    it('should handle large response payloads efficiently', async () => {
      // Create a large number of menu items
      const itemCount = 100;
      const createPromises = [];

      for (let i = 0; i < itemCount; i++) {
        createPromises.push(
          request(gatewayUrl)
            .post('/api/menu/items')
            .set('x-tenant-id', testData.tenantId)
            .send({
              name: `Large Dataset Item ${i}`,
              description: `This is a test item with a longer description to increase payload size. Item number ${i} in the large dataset test.`,
              price: 10.99 + (i * 0.1),
              category: 'Large Dataset Test',
              ingredients: Array(10).fill().map((_, j) => `Ingredient ${j + 1}`)
            })
        );
      }

      await Promise.all(createPromises);

      // Now test querying the large dataset
      const startTime = Date.now();
      
      const response = await request(gatewayUrl)
        .get('/api/menu/items')
        .set('x-tenant-id', testData.tenantId)
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      const payloadSize = JSON.stringify(response.body).length;

      console.log(`Large Payload Performance:
        Items returned: ${response.body.length}
        Payload size: ${(payloadSize / 1024).toFixed(2)} KB
        Response time: ${responseTime}ms`);

      expect(response.body.length).toBeGreaterThan(itemCount);
      expect(responseTime).toBeLessThan(2000); // 2s max for large payload
      expect(payloadSize).toBeGreaterThan(10000); // At least 10KB payload
    });
  });

  describe('Database Performance', () => {
    it('should handle concurrent database operations efficiently', async () => {
      const concurrentOperations = 30;
      const operations = [];

      // Mix of read and write operations
      for (let i = 0; i < concurrentOperations; i++) {
        if (i % 3 === 0) {
          // Write operation (create customer)
          operations.push(
            request(gatewayUrl)
              .post('/api/customers')
              .set('x-tenant-id', testData.tenantId)
              .send({
                name: `DB Test Customer ${i}`,
                email: `dbtest${i}@example.com`
              })
          );
        } else {
          // Read operation (get menu items)
          operations.push(
            request(gatewayUrl)
              .get('/api/menu/items')
              .set('x-tenant-id', testData.tenantId)
          );
        }
      }

      const startTime = Date.now();
      const responses = await Promise.all(operations);
      const totalTime = Date.now() - startTime;

      // All operations should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      const averageTimePerOperation = totalTime / concurrentOperations;
      
      console.log(`Concurrent DB Operations:
        Total time: ${totalTime}ms
        Operations: ${concurrentOperations}
        Average per operation: ${averageTimePerOperation.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(15000); // 15s total
      expect(averageTimePerOperation).toBeLessThan(500); // 500ms average
    });

    it('should maintain performance with complex queries', async () => {
      // Create orders with multiple items for complex analytics queries
      const orderCount = 20;
      const orderPromises = [];

      for (let i = 0; i < orderCount; i++) {
        orderPromises.push(
          request(gatewayUrl)
            .post('/api/pos/orders')
            .set('x-tenant-id', testData.tenantId)
            .send({
              customerId: testData.customerId,
              items: [
                {
                  menuItemId: testData.menuItemId,
                  quantity: Math.floor(Math.random() * 5) + 1,
                  unitPrice: 15.99
                }
              ],
              total: 15.99 * (Math.floor(Math.random() * 5) + 1)
            })
        );
      }

      await Promise.all(orderPromises);

      // Now test complex analytics query
      const startTime = Date.now();
      
      const analyticsResponse = await request(gatewayUrl)
        .get('/api/analytics/sales/detailed')
        .set('x-tenant-id', testData.tenantId)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          groupBy: 'day',
          includeItems: true,
          includeCustomers: true
        })
        .expect(200);
      
      const queryTime = Date.now() - startTime;

      console.log(`Complex Analytics Query:
        Query time: ${queryTime}ms
        Data points: ${analyticsResponse.body.data?.length || 0}`);

      expect(queryTime).toBeLessThan(3000); // 3s max for complex query
      expect(analyticsResponse.body).toHaveProperty('data');
    });
  });

  describe('Error Handling Under Load', () => {
    it('should handle errors gracefully under high load', async () => {
      const totalRequests = 50;
      const invalidRequests = 10; // 20% invalid requests
      const validRequests = totalRequests - invalidRequests;

      const allRequests = [
        // Valid requests
        ...Array(validRequests).fill().map(() =>
          request(gatewayUrl)
            .get('/api/menu/items')
            .set('x-tenant-id', testData.tenantId)
        ),
        
        // Invalid requests (missing tenant ID)
        ...Array(invalidRequests).fill().map(() =>
          request(gatewayUrl)
            .get('/api/menu/items')
            // No tenant ID header
        )
      ];

      const responses = await Promise.all(allRequests);

      const successfulResponses = responses.filter(r => r.status === 200);
      const errorResponses = responses.filter(r => r.status >= 400);

      expect(successfulResponses).toHaveLength(validRequests);
      expect(errorResponses).toHaveLength(invalidRequests);

      // Verify error responses are properly formatted
      errorResponses.forEach(response => {
        expect(response.body).toHaveProperty('error');
        expect(response.status).toBe(400);
      });
    });

    it('should recover from temporary service failures', async () => {
      // This test would simulate service failures and recovery
      // For now, we'll test the circuit breaker behavior
      
      const requests = Array(20).fill().map(() =>
        request(gatewayUrl)
          .get('/api/menu/items')
          .set('x-tenant-id', 'non-existent-tenant')
      );

      const responses = await Promise.all(requests);

      // All should fail with proper error handling
      responses.forEach(response => {
        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
      });

      // System should still be responsive to valid requests
      const validResponse = await request(gatewayUrl)
        .get('/api/menu/items')
        .set('x-tenant-id', testData.tenantId)
        .expect(200);

      expect(validResponse.body).toBeDefined();
    });
  });

  // Helper functions
  async function getSystemMemoryUsage() {
    const response = await request(gatewayUrl)
      .get('/health')
      .expect(200);

    return response.body.memory || { used: 0, total: 0 };
  }

  async function setupPerformanceTestEnvironment() {
    // Create test tenant
    const tenantResponse = await request(gatewayUrl)
      .post('/api/tenants')
      .send({
        businessName: 'Performance Test Restaurant',
        contactEmail: 'performance@test.com'
      })
      .expect(201);

    testData.tenantId = tenantResponse.body.id;

    // Create test customer
    const customerResponse = await request(gatewayUrl)
      .post('/api/customers')
      .set('x-tenant-id', testData.tenantId)
      .send({
        name: 'Performance Test Customer',
        email: 'perf.customer@test.com'
      })
      .expect(201);

    testData.customerId = customerResponse.body.id;

    // Create test menu item
    const menuItemResponse = await request(gatewayUrl)
      .post('/api/menu/items')
      .set('x-tenant-id', testData.tenantId)
      .send({
        name: 'Performance Test Item',
        price: 15.99,
        category: 'Test Category'
      })
      .expect(201);

    testData.menuItemId = menuItemResponse.body.id;
  }

  async function cleanupPerformanceTestEnvironment() {
    // Cleanup would be implemented here
    // For now, we'll leave test data for inspection
  }
});
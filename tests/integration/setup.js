const SystemManager = require('../../scripts/start-system');

// Global test configuration
global.testConfig = {
  gatewayUrl: 'http://localhost:3000',
  timeout: {
    short: 5000,
    medium: 15000,
    long: 60000
  },
  performance: {
    maxResponseTime: {
      health: 100,
      simple: 500,
      complex: 2000,
      payment: 5000
    },
    minSuccessRate: 95,
    maxMemoryIncrease: 50 // percentage
  }
};

// Global test utilities
global.testUtils = {
  // Wait for a condition to be true
  waitFor: async (condition, timeout = 30000, interval = 1000) => {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  // Generate test data
  generateTestData: {
    tenant: (suffix = '') => ({
      businessName: `Test Restaurant ${suffix}`,
      contactEmail: `test${suffix}@restaurant.com`,
      contactPhone: '+1234567890',
      address: {
        street: `123 Test Street ${suffix}`,
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      }
    }),

    customer: (suffix = '') => ({
      name: `Test Customer ${suffix}`,
      email: `customer${suffix}@test.com`,
      phone: '+1987654321',
      address: {
        street: `456 Customer Street ${suffix}`,
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      }
    }),

    menuItem: (suffix = '') => ({
      name: `Test Item ${suffix}`,
      description: `Test menu item ${suffix}`,
      price: 10.99 + Math.random() * 20,
      category: 'Test Category',
      preparationTime: 10 + Math.floor(Math.random() * 20),
      ingredients: [`ingredient_${suffix}_1`, `ingredient_${suffix}_2`],
      isAvailable: true
    }),

    order: (customerId, items) => ({
      customerId,
      orderType: 'DINE_IN',
      items: items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 15.99,
        specialInstructions: item.specialInstructions || null
      })),
      subtotal: items.reduce((sum, item) => sum + ((item.unitPrice || 15.99) * (item.quantity || 1)), 0),
      tax: 0,
      discount: 0
    })
  },

  // Performance measurement utilities
  measurePerformance: {
    async responseTime(operation) {
      const startTime = Date.now();
      const result = await operation();
      const endTime = Date.now();
      
      return {
        result,
        responseTime: endTime - startTime
      };
    },

    async throughput(operations, concurrency = 10) {
      const startTime = Date.now();
      const results = [];
      
      // Execute operations in batches
      for (let i = 0; i < operations.length; i += concurrency) {
        const batch = operations.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      return {
        results,
        totalTime,
        throughput: (operations.length / totalTime) * 1000, // operations per second
        averageTime: totalTime / operations.length
      };
    }
  },

  // Validation utilities
  validate: {
    responseStructure: (response, expectedFields) => {
      expectedFields.forEach(field => {
        expect(response.body).toHaveProperty(field);
      });
    },

    tenantIsolation: (dataA, dataB) => {
      // Ensure no data overlap between tenants
      const idsA = Array.isArray(dataA) ? dataA.map(item => item.id) : [dataA.id];
      const idsB = Array.isArray(dataB) ? dataB.map(item => item.id) : [dataB.id];
      const overlap = idsA.filter(id => idsB.includes(id));
      
      expect(overlap).toHaveLength(0);
    },

    performance: (metrics, thresholds) => {
      if (thresholds.maxResponseTime && metrics.responseTime) {
        expect(metrics.responseTime).toBeLessThan(thresholds.maxResponseTime);
      }
      
      if (thresholds.minSuccessRate && metrics.successRate) {
        expect(metrics.successRate).toBeGreaterThan(thresholds.minSuccessRate);
      }
      
      if (thresholds.minThroughput && metrics.throughput) {
        expect(metrics.throughput).toBeGreaterThan(thresholds.minThroughput);
      }
    }
  }
};

// Setup test environment
beforeAll(async () => {
  console.log('Setting up integration test environment...');
  
  // Verify system is running
  try {
    const response = await fetch(global.testConfig.gatewayUrl + '/health');
    if (!response.ok) {
      throw new Error(`API Gateway not responding: ${response.status}`);
    }
    console.log('✅ API Gateway is running');
  } catch (error) {
    console.error('❌ API Gateway is not running. Please start the system first.');
    console.error('Run: npm run start');
    process.exit(1);
  }
  
  // Verify all services are healthy
  try {
    const response = await fetch(global.testConfig.gatewayUrl + '/services/status');
    const status = await response.json();
    
    const unhealthyServices = Object.entries(status.health || {})
      .filter(([name, health]) => health.status !== 'healthy')
      .map(([name]) => name);
    
    if (unhealthyServices.length > 0) {
      console.warn(`⚠️  Some services are not healthy: ${unhealthyServices.join(', ')}`);
    } else {
      console.log('✅ All services are healthy');
    }
  } catch (error) {
    console.warn('⚠️  Could not verify service health:', error.message);
  }
}, 60000);

// Cleanup after all tests
afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  
  // Add any global cleanup here
  // For now, we'll leave test data for inspection
  
  console.log('✅ Integration test cleanup completed');
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
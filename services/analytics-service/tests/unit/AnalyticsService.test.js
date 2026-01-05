const AnalyticsService = require('../../src/services/AnalyticsService');

describe('AnalyticsService', () => {
  let analyticsService;
  let testTenantId;
  let testOutletId;

  beforeAll(() => {
    analyticsService = new AnalyticsService(global.dbPool);
    testTenantId = 'test_tenant_1';
  });

  beforeEach(async () => {
    // Create a test outlet
    testOutletId = await global.createTestOutlet(testTenantId, {
      name: 'Test Analytics Outlet',
      address: { street: '123 Test St', city: 'Test City' },
      operatingHours: { open: '09:00', close: '22:00' },
      taxConfig: { rate: 0.1 }
    });
  });

  describe('generateSalesReport', () => {
    it('should generate sales report with correct summary data', async () => {
      // Create test orders
      const orders = [
        {
          outletId: testOutletId,
          orderNumber: 'TEST-001',
          subtotal: 100,
          tax: 10,
          discount: 5,
          total: 105,
          customerId: 'customer-1',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          outletId: testOutletId,
          orderNumber: 'TEST-002',
          subtotal: 200,
          tax: 20,
          discount: 0,
          total: 220,
          customerId: 'customer-2',
          createdAt: new Date('2024-01-15T14:00:00Z')
        },
        {
          outletId: testOutletId,
          orderNumber: 'TEST-003',
          subtotal: 150,
          tax: 15,
          discount: 10,
          total: 155,
          customerId: 'customer-1',
          createdAt: new Date('2024-01-16T12:00:00Z')
        }
      ];

      for (const order of orders) {
        await global.createTestOrder(testTenantId, order);
      }

      const report = await analyticsService.generateSalesReport(
        testTenantId, 
        '2024-01-01,2024-01-31',
        testOutletId
      );

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalOrders).toBe(3);
      expect(report.summary.totalRevenue).toBe(480); // 105 + 220 + 155
      expect(report.summary.uniqueCustomers).toBe(2);
      expect(report.dailyData).toHaveLength(2); // 2 different dates
    });

    it('should handle empty data gracefully', async () => {
      const report = await analyticsService.generateSalesReport(
        testTenantId, 
        '2023-01-01,2023-01-31',
        testOutletId
      );

      expect(report).toBeDefined();
      expect(report.summary.totalOrders).toBe(0);
      expect(report.summary.totalRevenue).toBe(0);
      expect(report.dailyData).toHaveLength(0);
    });

    it('should filter by outlet when specified', async () => {
      // Create another outlet
      const anotherOutletId = await global.createTestOutlet(testTenantId, {
        name: 'Another Test Outlet'
      });

      // Create orders for both outlets
      await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'OUTLET1-001',
        subtotal: 100,
        tax: 10,
        total: 110,
        customerId: 'customer-1'
      });

      await global.createTestOrder(testTenantId, {
        outletId: anotherOutletId,
        orderNumber: 'OUTLET2-001',
        subtotal: 200,
        tax: 20,
        total: 220,
        customerId: 'customer-2'
      });

      // Get report for specific outlet
      const report = await analyticsService.generateSalesReport(
        testTenantId, 
        'last_30_days',
        testOutletId
      );

      expect(report.summary.totalOrders).toBe(1);
      expect(report.summary.totalRevenue).toBe(110);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics with top selling items', async () => {
      // Create menu category and items
      const categoryResult = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_categories (name, description)
        VALUES ('Main Course', 'Main dishes')
        RETURNING id
      `);
      const categoryId = categoryResult.rows[0].id;

      const menuItemResult = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_items (category_id, name, price)
        VALUES ($1, 'Test Burger', 15.99)
        RETURNING id
      `, [categoryId]);
      const menuItemId = menuItemResult.rows[0].id;

      // Create order with items
      const orderId = await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'PERF-001',
        subtotal: 31.98,
        tax: 3.20,
        total: 35.18,
        customerId: 'customer-1'
      });

      // Add order items
      await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.order_items 
        (order_id, menu_item_id, quantity, unit_price, total_price)
        VALUES ($1, $2, 2, 15.99, 31.98)
      `, [orderId, menuItemId]);

      const metrics = await analyticsService.getPerformanceMetrics(
        testTenantId, 
        testOutletId, 
        'last_30_days'
      );

      expect(metrics).toBeDefined();
      expect(metrics.topSellingItems).toBeDefined();
      expect(metrics.topSellingItems.length).toBeGreaterThan(0);
      expect(metrics.topSellingItems[0].name).toBe('Test Burger');
      expect(metrics.topSellingItems[0].total_quantity).toBe('2');
    });
  });

  describe('getTopSellingItems', () => {
    it('should return top selling items ordered by quantity', async () => {
      // Create menu items
      const categoryResult = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_categories (name)
        VALUES ('Test Category')
        RETURNING id
      `);
      const categoryId = categoryResult.rows[0].id;

      const item1Result = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_items (category_id, name, price)
        VALUES ($1, 'Popular Item', 12.99)
        RETURNING id
      `, [categoryId]);
      const item1Id = item1Result.rows[0].id;

      const item2Result = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_items (category_id, name, price)
        VALUES ($1, 'Less Popular Item', 8.99)
        RETURNING id
      `, [categoryId]);
      const item2Id = item2Result.rows[0].id;

      // Create orders
      const order1Id = await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'TOP-001',
        subtotal: 25.98,
        tax: 2.60,
        total: 28.58,
        customerId: 'customer-1'
      });

      const order2Id = await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'TOP-002',
        subtotal: 8.99,
        tax: 0.90,
        total: 9.89,
        customerId: 'customer-2'
      });

      // Add order items
      await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.order_items 
        (order_id, menu_item_id, quantity, unit_price, total_price)
        VALUES 
        ($1, $2, 2, 12.99, 25.98),
        ($3, $4, 1, 8.99, 8.99)
      `, [order1Id, item1Id, order2Id, item2Id]);

      const topItems = await analyticsService.getTopSellingItems(
        testTenantId, 
        'last_30_days',
        testOutletId,
        10
      );

      expect(topItems).toBeDefined();
      expect(topItems.items).toBeDefined();
      expect(topItems.items.length).toBe(2);
      expect(topItems.items[0].name).toBe('Popular Item');
      expect(topItems.items[0].total_quantity_sold).toBe('2');
      expect(topItems.items[1].name).toBe('Less Popular Item');
      expect(topItems.items[1].total_quantity_sold).toBe('1');
    });
  });

  describe('getInventoryAnalytics', () => {
    it('should return low stock items and consumption patterns', async () => {
      // Create inventory items
      await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.inventory_items 
        (outlet_id, name, category, unit, current_stock, minimum_stock, unit_cost)
        VALUES 
        ($1, 'Low Stock Item', 'Ingredients', 'kg', 2, 10, 5.00),
        ($1, 'Normal Stock Item', 'Ingredients', 'kg', 50, 10, 3.00)
      `, [testOutletId]);

      // Add consumption data
      await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.inventory_consumption 
        (ingredient_name, quantity_consumed, consumed_at)
        VALUES 
        ('Low Stock Item', 5, NOW() - INTERVAL '5 days'),
        ('Low Stock Item', 3, NOW() - INTERVAL '2 days')
      `);

      const analytics = await analyticsService.getInventoryAnalytics(testTenantId, testOutletId);

      expect(analytics).toBeDefined();
      expect(analytics.lowStockItems).toBeDefined();
      expect(analytics.lowStockItems.length).toBe(1);
      expect(analytics.lowStockItems[0].name).toBe('Low Stock Item');
      expect(analytics.summary.totalLowStockItems).toBe(1);
    });
  });

  describe('getTrendAnalysis', () => {
    it('should calculate trend analysis for revenue metric', async () => {
      // Create orders for current period
      await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'TREND-001',
        subtotal: 100,
        tax: 10,
        total: 110,
        customerId: 'customer-1',
        createdAt: new Date('2024-01-15T10:00:00Z')
      });

      await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'TREND-002',
        subtotal: 200,
        tax: 20,
        total: 220,
        customerId: 'customer-2',
        createdAt: new Date('2024-01-16T10:00:00Z')
      });

      const trends = await analyticsService.getTrendAnalysis(
        testTenantId, 
        'revenue', 
        '2024-01-15,2024-01-16',
        testOutletId
      );

      expect(trends).toBeDefined();
      expect(trends.metric).toBe('revenue');
      expect(trends.currentValue).toBe(330); // 110 + 220
      expect(trends.dailyData).toHaveLength(2);
    });

    it('should throw error for invalid metric', async () => {
      await expect(
        analyticsService.getTrendAnalysis(testTenantId, 'invalid_metric', 'last_30_days')
      ).rejects.toThrow('Invalid metric type');
    });
  });

  describe('helper methods', () => {
    it('should parse different period formats correctly', async () => {
      const service = new AnalyticsService(global.dbPool);
      
      // Test today period
      const todayPeriod = service._parsePeriod('today');
      expect(todayPeriod.startDate).toBeDefined();
      expect(todayPeriod.endDate).toBeDefined();
      
      // Test custom date range
      const customPeriod = service._parsePeriod('2024-01-01,2024-01-31');
      expect(customPeriod.startDate).toContain('2024-01-01');
      expect(customPeriod.endDate).toContain('2024-01-31');
    });

    it('should generate correct schema name', async () => {
      const service = new AnalyticsService(global.dbPool);
      const schemaName = service._getSchemaName('test_tenant_123');
      expect(schemaName).toBe('tenant_test_tenant_123');
    });
  });
});
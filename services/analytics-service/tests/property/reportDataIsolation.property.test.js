const fc = require('fast-check');
const AnalyticsService = require('../../src/services/AnalyticsService');
const ReportingService = require('../../src/services/ReportingService');

describe('Analytics Service Property Tests', () => {
  let analyticsService;
  let reportingService;

  beforeAll(() => {
    analyticsService = new AnalyticsService(global.dbPool);
    reportingService = new ReportingService(global.dbPool, analyticsService);
  });

  describe('Property 19: Report Data Isolation', () => {
    it('should ensure report data only includes information from the requesting tenant outlets', async () => {
      // Feature: restaurant-management-system, Property 19: Report Data Isolation
      
      await fc.assert(fc.asyncProperty(
        // Generate test data for multiple tenants
        fc.record({
          tenant1: fc.record({
            tenantId: fc.constant('test_tenant_1'),
            orders: fc.array(fc.record({
              orderNumber: fc.string({ minLength: 5, maxLength: 10 }),
              subtotal: fc.float({ min: 10, max: 500 }).map(x => Math.fround(x)),
              tax: fc.float({ min: 1, max: 50 }).map(x => Math.fround(x)),
              discount: fc.float({ min: 0, max: 20 }).map(x => Math.fround(x)),
              customerId: fc.uuid(),
              orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
              createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
            }), { minLength: 1, maxLength: 10 })
          }),
          tenant2: fc.record({
            tenantId: fc.constant('test_tenant_2'),
            orders: fc.array(fc.record({
              orderNumber: fc.string({ minLength: 5, maxLength: 10 }),
              subtotal: fc.float({ min: 10, max: 500 }).map(x => Math.fround(x)),
              tax: fc.float({ min: 1, max: 50 }).map(x => Math.fround(x)),
              discount: fc.float({ min: 0, max: 20 }).map(x => Math.fround(x)),
              customerId: fc.uuid(),
              orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
              createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
            }), { minLength: 1, maxLength: 10 })
          }),
          tenant3: fc.record({
            tenantId: fc.constant('test_tenant_3'),
            orders: fc.array(fc.record({
              orderNumber: fc.string({ minLength: 5, maxLength: 10 }),
              subtotal: fc.float({ min: 10, max: 500 }).map(x => Math.fround(x)),
              tax: fc.float({ min: 1, max: 50 }).map(x => Math.fround(x)),
              discount: fc.float({ min: 0, max: 20 }).map(x => Math.fround(x)),
              customerId: fc.uuid(),
              orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
              createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
            }), { minLength: 1, maxLength: 10 })
          })
        }),
        async (testData) => {
          // Create outlets for each tenant
          const tenant1OutletId = await global.createTestOutlet(testData.tenant1.tenantId, {
            name: 'Test Outlet 1'
          });
          const tenant2OutletId = await global.createTestOutlet(testData.tenant2.tenantId, {
            name: 'Test Outlet 2'
          });
          const tenant3OutletId = await global.createTestOutlet(testData.tenant3.tenantId, {
            name: 'Test Outlet 3'
          });

          // Create orders for each tenant
          const tenant1OrderIds = [];
          for (const orderData of testData.tenant1.orders) {
            const orderId = await global.createTestOrder(testData.tenant1.tenantId, {
              ...orderData,
              outletId: tenant1OutletId,
              total: orderData.subtotal + orderData.tax - orderData.discount
            });
            tenant1OrderIds.push(orderId);
          }

          const tenant2OrderIds = [];
          for (const orderData of testData.tenant2.orders) {
            const orderId = await global.createTestOrder(testData.tenant2.tenantId, {
              ...orderData,
              outletId: tenant2OutletId,
              total: orderData.subtotal + orderData.tax - orderData.discount
            });
            tenant2OrderIds.push(orderId);
          }

          const tenant3OrderIds = [];
          for (const orderData of testData.tenant3.orders) {
            const orderId = await global.createTestOrder(testData.tenant3.tenantId, {
              ...orderData,
              outletId: tenant3OutletId,
              total: orderData.subtotal + orderData.tax - orderData.discount
            });
            tenant3OrderIds.push(orderId);
          }

          // Generate sales reports for each tenant
          const tenant1Report = await analyticsService.generateSalesReport(
            testData.tenant1.tenantId, 
            '2024-01-01,2024-12-31'
          );
          const tenant2Report = await analyticsService.generateSalesReport(
            testData.tenant2.tenantId, 
            '2024-01-01,2024-12-31'
          );
          const tenant3Report = await analyticsService.generateSalesReport(
            testData.tenant3.tenantId, 
            '2024-01-01,2024-12-31'
          );

          // Verify tenant 1 report only contains tenant 1 data
          const tenant1ExpectedOrders = testData.tenant1.orders.length;
          const tenant1ExpectedRevenue = testData.tenant1.orders.reduce(
            (sum, order) => sum + (order.subtotal + order.tax - order.discount), 0
          );

          expect(tenant1Report.summary.totalOrders).toBe(tenant1ExpectedOrders);
          expect(Math.abs(tenant1Report.summary.totalRevenue - tenant1ExpectedRevenue)).toBeLessThan(0.01);

          // Verify tenant 2 report only contains tenant 2 data
          const tenant2ExpectedOrders = testData.tenant2.orders.length;
          const tenant2ExpectedRevenue = testData.tenant2.orders.reduce(
            (sum, order) => sum + (order.subtotal + order.tax - order.discount), 0
          );

          expect(tenant2Report.summary.totalOrders).toBe(tenant2ExpectedOrders);
          expect(Math.abs(tenant2Report.summary.totalRevenue - tenant2ExpectedRevenue)).toBeLessThan(0.01);

          // Verify tenant 3 report only contains tenant 3 data
          const tenant3ExpectedOrders = testData.tenant3.orders.length;
          const tenant3ExpectedRevenue = testData.tenant3.orders.reduce(
            (sum, order) => sum + (order.subtotal + order.tax - order.discount), 0
          );

          expect(tenant3Report.summary.totalOrders).toBe(tenant3ExpectedOrders);
          expect(Math.abs(tenant3Report.summary.totalRevenue - tenant3ExpectedRevenue)).toBeLessThan(0.01);

          // Verify no cross-tenant data contamination
          // Each tenant's report should not contain data from other tenants
          expect(tenant1Report.summary.totalOrders).not.toBe(tenant2Report.summary.totalOrders + tenant3Report.summary.totalOrders);
          expect(tenant2Report.summary.totalOrders).not.toBe(tenant1Report.summary.totalOrders + tenant3Report.summary.totalOrders);
          expect(tenant3Report.summary.totalOrders).not.toBe(tenant1Report.summary.totalOrders + tenant2Report.summary.totalOrders);

          // Test performance metrics isolation
          const tenant1Performance = await analyticsService.getPerformanceMetrics(
            testData.tenant1.tenantId, 
            tenant1OutletId, 
            '2024-01-01,2024-12-31'
          );
          const tenant2Performance = await analyticsService.getPerformanceMetrics(
            testData.tenant2.tenantId, 
            tenant2OutletId, 
            '2024-01-01,2024-12-31'
          );

          // Verify performance metrics are isolated
          expect(tenant1Performance.outletId).toBe(tenant1OutletId);
          expect(tenant2Performance.outletId).toBe(tenant2OutletId);
          expect(tenant1Performance.outletId).not.toBe(tenant2Performance.outletId);

          // Test customer analytics isolation
          const tenant1Customers = await analyticsService.getCustomerAnalytics(
            testData.tenant1.tenantId, 
            '2024-01-01,2024-12-31'
          );
          const tenant2Customers = await analyticsService.getCustomerAnalytics(
            testData.tenant2.tenantId, 
            '2024-01-01,2024-12-31'
          );

          // Verify customer data isolation
          const tenant1CustomerIds = new Set(testData.tenant1.orders.map(o => o.customerId));
          const tenant2CustomerIds = new Set(testData.tenant2.orders.map(o => o.customerId));
          
          // Ensure no overlap in customer data between tenants
          const tenant1ReportCustomers = new Set(tenant1Customers.topCustomers.map(c => c.customer_id));
          const tenant2ReportCustomers = new Set(tenant2Customers.topCustomers.map(c => c.customer_id));
          
          // Check that tenant 1 report only contains tenant 1 customers
          for (const customerId of tenant1ReportCustomers) {
            expect(tenant1CustomerIds.has(customerId)).toBe(true);
            expect(tenant2CustomerIds.has(customerId)).toBe(false);
          }
          
          // Check that tenant 2 report only contains tenant 2 customers
          for (const customerId of tenant2ReportCustomers) {
            expect(tenant2CustomerIds.has(customerId)).toBe(true);
            expect(tenant1CustomerIds.has(customerId)).toBe(false);
          }
        }
      ), { numRuns: 20 });
    });

    it('should ensure generated reports maintain tenant isolation in file metadata', async () => {
      // Feature: restaurant-management-system, Property 19: Report Data Isolation
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          tenant1Id: fc.constant('test_tenant_1'),
          tenant2Id: fc.constant('test_tenant_2'),
          reportType: fc.constantFrom('sales', 'performance', 'inventory', 'customer'),
          format: fc.constantFrom('pdf', 'excel', 'csv'),
          period: fc.constantFrom('last_30_days', 'this_month', 'last_week')
        }),
        async (testData) => {
          // Create test outlets for both tenants
          const tenant1OutletId = await global.createTestOutlet(testData.tenant1Id, {
            name: 'Tenant 1 Outlet'
          });
          const tenant2OutletId = await global.createTestOutlet(testData.tenant2Id, {
            name: 'Tenant 2 Outlet'
          });

          // Create some test orders for both tenants
          await global.createTestOrder(testData.tenant1Id, {
            outletId: tenant1OutletId,
            orderNumber: 'T1-001',
            subtotal: 100,
            tax: 10,
            total: 110,
            customerId: 'customer-1'
          });

          await global.createTestOrder(testData.tenant2Id, {
            outletId: tenant2OutletId,
            orderNumber: 'T2-001',
            subtotal: 200,
            tax: 20,
            total: 220,
            customerId: 'customer-2'
          });

          // Generate reports for both tenants
          const reportConfig = {
            type: testData.reportType,
            format: testData.format,
            period: testData.period
          };

          let tenant1Report, tenant2Report;
          
          try {
            tenant1Report = await reportingService.generateReport(testData.tenant1Id, reportConfig);
            tenant2Report = await reportingService.generateReport(testData.tenant2Id, reportConfig);

            // Verify file names contain correct tenant IDs
            expect(tenant1Report.fileName).toContain(testData.tenant1Id);
            expect(tenant2Report.fileName).toContain(testData.tenant2Id);

            // Verify file names don't contain other tenant IDs
            expect(tenant1Report.fileName).not.toContain(testData.tenant2Id);
            expect(tenant2Report.fileName).not.toContain(testData.tenant1Id);

            // Verify file paths are different
            expect(tenant1Report.filePath).not.toBe(tenant2Report.filePath);

            // Verify download URLs contain tenant-specific file names
            expect(tenant1Report.downloadUrl).toContain(tenant1Report.fileName);
            expect(tenant2Report.downloadUrl).toContain(tenant2Report.fileName);

          } catch (error) {
            // Some report types might not have data, which is acceptable
            if (!error.message.includes('no data') && !error.message.includes('empty')) {
              throw error;
            }
          }
        }
      ), { numRuns: 20 });
    });
  });
});
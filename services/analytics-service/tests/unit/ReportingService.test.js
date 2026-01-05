const ReportingService = require('../../src/services/ReportingService');
const AnalyticsService = require('../../src/services/AnalyticsService');
const fs = require('fs').promises;
const path = require('path');

describe('ReportingService', () => {
  let reportingService;
  let analyticsService;
  let testTenantId;
  let testOutletId;

  beforeAll(() => {
    analyticsService = new AnalyticsService(global.dbPool);
    reportingService = new ReportingService(global.dbPool, analyticsService);
    testTenantId = 'test_tenant_1';
  });

  beforeEach(async () => {
    // Create a test outlet
    testOutletId = await global.createTestOutlet(testTenantId, {
      name: 'Test Reporting Outlet',
      address: { street: '123 Report St', city: 'Report City' },
      operatingHours: { open: '09:00', close: '22:00' },
      taxConfig: { rate: 0.1 }
    });

    // Create some test data
    await global.createTestOrder(testTenantId, {
      outletId: testOutletId,
      orderNumber: 'REPORT-001',
      subtotal: 100,
      tax: 10,
      discount: 5,
      total: 105,
      customerId: 'customer-1',
      createdAt: new Date('2024-01-15T10:00:00Z')
    });
  });

  describe('generateReport', () => {
    it('should generate PDF sales report', async () => {
      const reportConfig = {
        type: 'sales',
        format: 'pdf',
        period: '2024-01-01,2024-01-31',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);

      expect(report).toBeDefined();
      expect(report.fileName).toContain(testTenantId);
      expect(report.fileName).toContain('sales');
      expect(report.fileName).toEndWith('.pdf');
      expect(report.filePath).toBeDefined();
      expect(report.downloadUrl).toContain(report.fileName);
      expect(report.size).toBeGreaterThan(0);

      // Verify file exists
      const fileExists = await fs.access(report.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });

    it('should generate Excel sales report', async () => {
      const reportConfig = {
        type: 'sales',
        format: 'excel',
        period: '2024-01-01,2024-01-31',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);

      expect(report).toBeDefined();
      expect(report.fileName).toEndWith('.excel');
      expect(report.size).toBeGreaterThan(0);

      // Verify file exists
      const fileExists = await fs.access(report.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });

    it('should generate CSV sales report', async () => {
      const reportConfig = {
        type: 'sales',
        format: 'csv',
        period: '2024-01-01,2024-01-31',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);

      expect(report).toBeDefined();
      expect(report.fileName).toEndWith('.csv');
      expect(report.size).toBeGreaterThan(0);

      // Verify file exists and has content
      const fileExists = await fs.access(report.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      const content = await fs.readFile(report.filePath, 'utf8');
      expect(content).toContain('Date');
      expect(content).toContain('Total Orders');

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });

    it('should generate performance report', async () => {
      // Create menu items and order items for performance report
      const categoryResult = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_categories (name)
        VALUES ('Test Category')
        RETURNING id
      `);
      const categoryId = categoryResult.rows[0].id;

      const menuItemResult = await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.menu_items (category_id, name, price)
        VALUES ($1, 'Test Item', 12.99)
        RETURNING id
      `, [categoryId]);
      const menuItemId = menuItemResult.rows[0].id;

      const orderId = await global.createTestOrder(testTenantId, {
        outletId: testOutletId,
        orderNumber: 'PERF-REPORT-001',
        subtotal: 25.98,
        tax: 2.60,
        total: 28.58,
        customerId: 'customer-1'
      });

      await global.dbPool.query(`
        INSERT INTO tenant_${testTenantId}.order_items 
        (order_id, menu_item_id, quantity, unit_price, total_price)
        VALUES ($1, $2, 2, 12.99, 25.98)
      `, [orderId, menuItemId]);

      const reportConfig = {
        type: 'performance',
        format: 'csv',
        period: 'last_30_days',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);

      expect(report).toBeDefined();
      expect(report.fileName).toContain('performance');

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });

    it('should throw error for invalid report type', async () => {
      const reportConfig = {
        type: 'invalid_type',
        format: 'pdf',
        period: 'last_30_days'
      };

      await expect(
        reportingService.generateReport(testTenantId, reportConfig)
      ).rejects.toThrow('Invalid report type');
    });

    it('should throw error for unsupported format', async () => {
      const reportConfig = {
        type: 'sales',
        format: 'unsupported_format',
        period: 'last_30_days'
      };

      await expect(
        reportingService.generateReport(testTenantId, reportConfig)
      ).rejects.toThrow('Unsupported report format');
    });
  });

  describe('scheduleReport', () => {
    it('should schedule a report successfully', async () => {
      const scheduleConfig = {
        name: 'Daily Sales Report',
        reportConfig: {
          type: 'sales',
          format: 'pdf',
          period: 'yesterday'
        },
        cronExpression: '0 9 * * *', // Daily at 9 AM
        email: 'test@example.com'
      };

      const result = await reportingService.scheduleReport(testTenantId, scheduleConfig);

      expect(result).toBeDefined();
      expect(result.scheduleId).toBeDefined();
      expect(result.scheduleId).toContain(testTenantId);
      expect(result.message).toBe('Report scheduled successfully');

      // Clean up
      await reportingService.deleteScheduledReport(testTenantId, result.scheduleId);
    });

    it('should throw error for invalid cron expression', async () => {
      const scheduleConfig = {
        name: 'Invalid Schedule',
        reportConfig: {
          type: 'sales',
          format: 'pdf',
          period: 'yesterday'
        },
        cronExpression: 'invalid cron',
        email: 'test@example.com'
      };

      await expect(
        reportingService.scheduleReport(testTenantId, scheduleConfig)
      ).rejects.toThrow('Invalid cron expression');
    });
  });

  describe('getScheduledReports', () => {
    it('should return scheduled reports for tenant', async () => {
      // First schedule a report
      const scheduleConfig = {
        name: 'Test Scheduled Report',
        reportConfig: {
          type: 'sales',
          format: 'pdf',
          period: 'yesterday'
        },
        cronExpression: '0 9 * * *',
        email: 'test@example.com'
      };

      const scheduled = await reportingService.scheduleReport(testTenantId, scheduleConfig);
      
      // Get scheduled reports
      const reports = await reportingService.getScheduledReports(testTenantId);

      expect(reports).toBeDefined();
      expect(Array.isArray(reports)).toBe(true);
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].name).toBe('Test Scheduled Report');

      // Clean up
      await reportingService.deleteScheduledReport(testTenantId, scheduled.scheduleId);
    });
  });

  describe('deleteScheduledReport', () => {
    it('should delete scheduled report successfully', async () => {
      // First schedule a report
      const scheduleConfig = {
        name: 'Report to Delete',
        reportConfig: {
          type: 'sales',
          format: 'pdf',
          period: 'yesterday'
        },
        cronExpression: '0 9 * * *',
        email: 'test@example.com'
      };

      const scheduled = await reportingService.scheduleReport(testTenantId, scheduleConfig);
      
      // Delete the scheduled report
      const result = await reportingService.deleteScheduledReport(testTenantId, scheduled.scheduleId);

      expect(result).toBeDefined();
      expect(result.message).toBe('Scheduled report deleted successfully');

      // Verify it's deleted
      const reports = await reportingService.getScheduledReports(testTenantId);
      const deletedReport = reports.find(r => r.schedule_id === scheduled.scheduleId);
      expect(deletedReport).toBeUndefined();
    });
  });

  describe('getReportHistory', () => {
    it('should return report history for tenant', async () => {
      // Generate a report to create history
      const reportConfig = {
        type: 'sales',
        format: 'csv',
        period: 'last_30_days',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);
      
      // Get report history
      const history = await reportingService.getReportHistory(testTenantId, 10);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].file_name).toBe(report.fileName);

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });
  });

  describe('downloadReport', () => {
    it('should return file path for existing report', async () => {
      // Generate a report first
      const reportConfig = {
        type: 'sales',
        format: 'csv',
        period: 'last_30_days',
        outletId: testOutletId
      };

      const report = await reportingService.generateReport(testTenantId, reportConfig);
      
      // Download the report
      const filePath = await reportingService.downloadReport(report.fileName);

      expect(filePath).toBe(report.filePath);

      // Clean up
      await fs.unlink(report.filePath).catch(() => {});
    });

    it('should throw error for non-existent report', async () => {
      await expect(
        reportingService.downloadReport('non-existent-file.pdf')
      ).rejects.toThrow('Report file not found');
    });
  });

  describe('helper methods', () => {
    it('should generate unique file names', async () => {
      const service = new ReportingService(global.dbPool, analyticsService);
      
      const fileName1 = service._generateFileName('tenant1', 'sales', 'pdf', 'today');
      const fileName2 = service._generateFileName('tenant1', 'sales', 'pdf', 'today');
      
      expect(fileName1).not.toBe(fileName2);
      expect(fileName1).toContain('tenant1');
      expect(fileName1).toContain('sales');
      expect(fileName1).toEndWith('.pdf');
    });

    it('should get correct schema name', async () => {
      const service = new ReportingService(global.dbPool, analyticsService);
      const schemaName = service._getSchemaName('test_tenant_123');
      expect(schemaName).toBe('tenant_test_tenant_123');
    });
  });
});
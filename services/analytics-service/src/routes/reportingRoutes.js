const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const ReportingService = require('../services/ReportingService');
const AnalyticsService = require('../services/AnalyticsService');
const { Pool } = require('pg');
const path = require('path');

const router = express.Router();

// Database connection
const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

const analyticsService = new AnalyticsService(dbPool);
const reportingService = new ReportingService(dbPool, analyticsService);

// Generate report
router.post('/generate', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const reportConfig = req.body;

    // Validate report configuration
    const { type, format, period } = reportConfig;
    
    if (!type || !format || !period) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, format, period'
      });
    }

    const validTypes = ['sales', 'performance', 'inventory', 'customer'];
    const validFormats = ['pdf', 'excel', 'xlsx', 'csv'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid report type. Valid options: ' + validTypes.join(', ')
      });
    }

    if (!validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Valid options: ' + validFormats.join(', ')
      });
    }

    const report = await reportingService.generateReport(tenantId, reportConfig);

    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Download report
router.get('/download/:fileName', auth, async (req, res, next) => {
  try {
    const { fileName } = req.params;
    const tenantId = req.tenantId;

    // Verify the file belongs to the requesting tenant
    if (!fileName.startsWith(tenantId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this report'
      });
    }

    const filePath = await reportingService.downloadReport(fileName);
    
    // Set appropriate headers for file download
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.csv':
        contentType = 'text/csv';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    if (error.message === 'Report file not found') {
      return res.status(404).json({
        success: false,
        error: 'Report file not found'
      });
    }
    next(error);
  }
});

// Schedule report
router.post('/schedule', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const scheduleConfig = req.body;

    // Validate schedule configuration
    const { name, reportConfig, cronExpression, email } = scheduleConfig;
    
    if (!name || !reportConfig || !cronExpression) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, reportConfig, cronExpression'
      });
    }

    const result = await reportingService.scheduleReport(tenantId, scheduleConfig);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get scheduled reports
router.get('/scheduled', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    const scheduledReports = await reportingService.getScheduledReports(tenantId);

    res.json({
      success: true,
      data: scheduledReports
    });
  } catch (error) {
    next(error);
  }
});

// Delete scheduled report
router.delete('/scheduled/:scheduleId', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const tenantId = req.tenantId;

    // Verify the schedule belongs to the requesting tenant
    if (!scheduleId.startsWith(tenantId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this scheduled report'
      });
    }

    const result = await reportingService.deleteScheduledReport(tenantId, scheduleId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get report history
router.get('/history', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { limit = 50 } = req.query;

    const history = await reportingService.getReportHistory(tenantId, parseInt(limit));

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
});

// Get available report types and formats
router.get('/options', auth, async (req, res, next) => {
  try {
    const options = {
      reportTypes: [
        { value: 'sales', label: 'Sales Report', description: 'Daily sales data, revenue, and order metrics' },
        { value: 'performance', label: 'Performance Report', description: 'Top selling items, peak hours, and order distribution' },
        { value: 'inventory', label: 'Inventory Report', description: 'Stock levels, low stock alerts, and consumption patterns' },
        { value: 'customer', label: 'Customer Report', description: 'Customer analytics, loyalty metrics, and acquisition data' }
      ],
      formats: [
        { value: 'pdf', label: 'PDF', description: 'Formatted report with charts and summaries' },
        { value: 'excel', label: 'Excel', description: 'Spreadsheet format with multiple sheets' },
        { value: 'csv', label: 'CSV', description: 'Raw data in comma-separated format' }
      ],
      periods: [
        { value: 'today', label: 'Today' },
        { value: 'yesterday', label: 'Yesterday' },
        { value: 'this_week', label: 'This Week' },
        { value: 'last_week', label: 'Last Week' },
        { value: 'this_month', label: 'This Month' },
        { value: 'last_month', label: 'Last Month' },
        { value: 'last_30_days', label: 'Last 30 Days' },
        { value: 'last_90_days', label: 'Last 90 Days' }
      ],
      cronExamples: [
        { expression: '0 9 * * *', description: 'Daily at 9:00 AM' },
        { expression: '0 9 * * 1', description: 'Weekly on Monday at 9:00 AM' },
        { expression: '0 9 1 * *', description: 'Monthly on 1st at 9:00 AM' },
        { expression: '0 9 1 1,4,7,10 *', description: 'Quarterly on 1st at 9:00 AM' }
      ]
    };

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
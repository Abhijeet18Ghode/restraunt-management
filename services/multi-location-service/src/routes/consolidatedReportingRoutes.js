const express = require('express');
const ConsolidatedReportingService = require('../services/ConsolidatedReportingService');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const consolidatedReportingService = new ConsolidatedReportingService();

// Apply authentication to all routes
router.use(auth);

// Generate consolidated sales report
router.post('/sales', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const reportParams = {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      outletIds: req.body.outletIds || [],
      groupBy: req.body.groupBy || 'outlet',
      includeComparisons: req.body.includeComparisons !== false
    };

    // Validate required parameters
    if (!reportParams.startDate || !reportParams.endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const report = await consolidatedReportingService.generateConsolidatedSalesReport(
      tenantId, 
      reportParams
    );

    logger.info('Consolidated sales report generated', {
      tenantId,
      period: `${reportParams.startDate} to ${reportParams.endDate}`,
      outletsIncluded: report.outlets.successful,
      totalRevenue: report.totals.revenue
    });

    res.json({
      success: true,
      message: 'Consolidated sales report generated',
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Generate consolidated inventory report
router.post('/inventory', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const reportParams = {
      outletIds: req.body.outletIds || [],
      includeTransfers: req.body.includeTransfers !== false,
      includeLowStock: req.body.includeLowStock !== false,
      includeValuation: req.body.includeValuation !== false
    };

    const report = await consolidatedReportingService.generateConsolidatedInventoryReport(
      tenantId, 
      reportParams
    );

    logger.info('Consolidated inventory report generated', {
      tenantId,
      outletsIncluded: report.outlets.successful,
      totalItems: report.summary.totalItems,
      totalValue: report.summary.totalValue
    });

    res.json({
      success: true,
      message: 'Consolidated inventory report generated',
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Generate consolidated performance report
router.post('/performance', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const reportParams = {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      outletIds: req.body.outletIds || [],
      metrics: req.body.metrics || ['sales', 'orders', 'customers', 'efficiency']
    };

    // Validate required parameters
    if (!reportParams.startDate || !reportParams.endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate and endDate are required'
      });
    }

    const report = await consolidatedReportingService.generateConsolidatedPerformanceReport(
      tenantId, 
      reportParams
    );

    logger.info('Consolidated performance report generated', {
      tenantId,
      period: `${reportParams.startDate} to ${reportParams.endDate}`,
      outletsAnalyzed: report.outlets.successful,
      topPerformer: report.summary.topPerformer
    });

    res.json({
      success: true,
      message: 'Consolidated performance report generated',
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Generate custom consolidated report
router.post('/custom', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const reportConfig = req.body;

    // Validate required configuration
    if (!reportConfig.reportName || !reportConfig.dataSources || !Array.isArray(reportConfig.dataSources)) {
      return res.status(400).json({
        success: false,
        error: 'reportName and dataSources array are required'
      });
    }

    const report = await consolidatedReportingService.generateCustomConsolidatedReport(
      tenantId, 
      reportConfig
    );

    logger.info('Custom consolidated report generated', {
      tenantId,
      reportName: reportConfig.reportName,
      dataSourcesUsed: report.metadata.dataSourcesUsed,
      recordsProcessed: report.metadata.recordsProcessed
    });

    res.json({
      success: true,
      message: 'Custom consolidated report generated',
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Get available report templates
router.get('/templates', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const templates = [
      {
        id: 'daily_sales_summary',
        name: 'Daily Sales Summary',
        description: 'Daily sales performance across all outlets',
        type: 'sales',
        defaultParams: {
          groupBy: 'outlet',
          includeComparisons: true
        },
        requiredFields: ['startDate', 'endDate']
      },
      {
        id: 'weekly_inventory_status',
        name: 'Weekly Inventory Status',
        description: 'Weekly inventory levels and transfer summary',
        type: 'inventory',
        defaultParams: {
          includeTransfers: true,
          includeLowStock: true,
          includeValuation: true
        },
        requiredFields: []
      },
      {
        id: 'monthly_performance_review',
        name: 'Monthly Performance Review',
        description: 'Comprehensive monthly performance analysis',
        type: 'performance',
        defaultParams: {
          metrics: ['sales', 'orders', 'customers', 'efficiency']
        },
        requiredFields: ['startDate', 'endDate']
      },
      {
        id: 'outlet_comparison',
        name: 'Outlet Comparison Report',
        description: 'Side-by-side comparison of outlet performance',
        type: 'custom',
        defaultParams: {
          dataSources: ['sales', 'inventory', 'customers'],
          aggregations: ['sum', 'average', 'count'],
          outputFormat: 'json'
        },
        requiredFields: ['outletIds']
      }
    ];

    res.json({
      success: true,
      message: 'Report templates retrieved',
      data: { templates }
    });
  } catch (error) {
    next(error);
  }
});

// Generate report from template
router.post('/templates/:templateId/generate', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { templateId } = req.params;
    const customParams = req.body;

    // Get template configuration
    const templates = {
      'daily_sales_summary': {
        type: 'sales',
        defaultParams: {
          groupBy: 'outlet',
          includeComparisons: true
        }
      },
      'weekly_inventory_status': {
        type: 'inventory',
        defaultParams: {
          includeTransfers: true,
          includeLowStock: true,
          includeValuation: true
        }
      },
      'monthly_performance_review': {
        type: 'performance',
        defaultParams: {
          metrics: ['sales', 'orders', 'customers', 'efficiency']
        }
      }
    };

    const template = templates[templateId];
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Merge template defaults with custom parameters
    const reportParams = {
      ...template.defaultParams,
      ...customParams
    };

    let report;
    switch (template.type) {
      case 'sales':
        report = await consolidatedReportingService.generateConsolidatedSalesReport(tenantId, reportParams);
        break;
      case 'inventory':
        report = await consolidatedReportingService.generateConsolidatedInventoryReport(tenantId, reportParams);
        break;
      case 'performance':
        report = await consolidatedReportingService.generateConsolidatedPerformanceReport(tenantId, reportParams);
        break;
      default:
        throw new Error(`Unsupported template type: ${template.type}`);
    }

    logger.info('Report generated from template', {
      tenantId,
      templateId,
      reportType: template.type
    });

    res.json({
      success: true,
      message: 'Report generated from template',
      data: {
        templateId,
        templateType: template.type,
        report
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get report history
router.get('/history', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { 
      reportType, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Mock implementation - in production, fetch from database
    const reportHistory = [
      {
        id: 'report-001',
        type: 'consolidated_sales',
        generatedAt: '2024-01-05T10:00:00Z',
        generatedBy: req.user.id,
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          outletIds: ['outlet-1', 'outlet-2']
        },
        status: 'completed',
        fileSize: '2.5MB'
      },
      {
        id: 'report-002',
        type: 'consolidated_inventory',
        generatedAt: '2024-01-04T15:30:00Z',
        generatedBy: req.user.id,
        parameters: {
          outletIds: ['outlet-1', 'outlet-2', 'outlet-3']
        },
        status: 'completed',
        fileSize: '1.8MB'
      }
    ];

    // Apply filters
    let filteredHistory = reportHistory;
    
    if (reportType) {
      filteredHistory = filteredHistory.filter(r => r.type === reportType);
    }

    if (startDate) {
      filteredHistory = filteredHistory.filter(r => 
        new Date(r.generatedAt) >= new Date(startDate)
      );
    }

    if (endDate) {
      filteredHistory = filteredHistory.filter(r => 
        new Date(r.generatedAt) <= new Date(endDate)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    res.json({
      success: true,
      message: 'Report history retrieved',
      data: {
        reports: paginatedHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredHistory.length,
          pages: Math.ceil(filteredHistory.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Schedule recurring report
router.post('/schedule', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const {
      reportType,
      reportParams,
      schedule, // cron expression
      recipients,
      name,
      description
    } = req.body;

    // Validate required fields
    if (!reportType || !schedule || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'reportType, schedule, and recipients are required'
      });
    }

    // Create scheduled report configuration
    const scheduledReport = {
      id: `scheduled-${Date.now()}`,
      tenantId,
      name: name || `${reportType} Report`,
      description: description || `Automated ${reportType} report`,
      reportType,
      reportParams: reportParams || {},
      schedule,
      recipients,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      isActive: true,
      lastRun: null,
      nextRun: this.calculateNextRun(schedule)
    };

    // In production, save to database and set up cron job
    logger.info('Scheduled report created', {
      tenantId,
      scheduledReportId: scheduledReport.id,
      reportType,
      schedule,
      recipients: recipients.length
    });

    res.status(201).json({
      success: true,
      message: 'Scheduled report created',
      data: { scheduledReport }
    });
  } catch (error) {
    next(error);
  }
});

// Get scheduled reports
router.get('/schedule', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;

    // Mock implementation - in production, fetch from database
    const scheduledReports = [
      {
        id: 'scheduled-001',
        tenantId,
        name: 'Daily Sales Report',
        reportType: 'consolidated_sales',
        schedule: '0 9 * * *', // Daily at 9 AM
        isActive: true,
        lastRun: '2024-01-05T09:00:00Z',
        nextRun: '2024-01-06T09:00:00Z',
        recipients: ['manager@restaurant.com']
      }
    ];

    res.json({
      success: true,
      message: 'Scheduled reports retrieved',
      data: { scheduledReports }
    });
  } catch (error) {
    next(error);
  }
});

// Helper method for calculating next run time
function calculateNextRun(cronExpression) {
  // Mock implementation - in production, use a cron parser library
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Next day
}

module.exports = router;
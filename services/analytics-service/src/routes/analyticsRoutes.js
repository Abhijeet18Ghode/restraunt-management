const express = require('express');
const { auth, requireRole } = require('../middleware/auth');
const AnalyticsService = require('../services/AnalyticsService');
const { Pool } = require('pg');

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

// Get sales report
router.get('/sales', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { period = 'last_30_days', outletId } = req.query;
    const tenantId = req.tenantId;

    const report = await analyticsService.generateSalesReport(tenantId, period, outletId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Get performance metrics
router.get('/performance', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { period = 'last_30_days', outletId } = req.query;
    const tenantId = req.tenantId;

    const metrics = await analyticsService.getPerformanceMetrics(tenantId, outletId, period);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    next(error);
  }
});

// Get top selling items
router.get('/top-items', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { period = 'last_30_days', outletId, limit = 20 } = req.query;
    const tenantId = req.tenantId;

    const topItems = await analyticsService.getTopSellingItems(tenantId, period, outletId, parseInt(limit));

    res.json({
      success: true,
      data: topItems
    });
  } catch (error) {
    next(error);
  }
});

// Get inventory analytics
router.get('/inventory', auth, requireRole(['admin', 'manager', 'inventory_manager']), async (req, res, next) => {
  try {
    const { outletId } = req.query;
    const tenantId = req.tenantId;

    const analytics = await analyticsService.getInventoryAnalytics(tenantId, outletId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get customer analytics
router.get('/customers', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { period = 'last_30_days', outletId } = req.query;
    const tenantId = req.tenantId;

    const analytics = await analyticsService.getCustomerAnalytics(tenantId, period, outletId);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

// Get trend analysis
router.get('/trends/:metric', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { metric } = req.params;
    const { period = 'last_30_days', outletId } = req.query;
    const tenantId = req.tenantId;

    const validMetrics = ['revenue', 'orders', 'customers', 'avg_order_value'];
    if (!validMetrics.includes(metric)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metric. Valid options: ' + validMetrics.join(', ')
      });
    }

    const trends = await analyticsService.getTrendAnalysis(tenantId, metric, period, outletId);

    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    next(error);
  }
});

// Get dashboard summary
router.get('/dashboard', auth, requireRole(['admin', 'manager']), async (req, res, next) => {
  try {
    const { period = 'today', outletId } = req.query;
    const tenantId = req.tenantId;

    // Get multiple analytics in parallel
    const [salesReport, performanceMetrics, inventoryAnalytics, customerAnalytics] = await Promise.all([
      analyticsService.generateSalesReport(tenantId, period, outletId),
      analyticsService.getPerformanceMetrics(tenantId, outletId, period),
      analyticsService.getInventoryAnalytics(tenantId, outletId),
      analyticsService.getCustomerAnalytics(tenantId, period, outletId)
    ]);

    const dashboard = {
      period,
      outletId,
      sales: {
        totalRevenue: salesReport.summary?.totalRevenue || 0,
        totalOrders: salesReport.summary?.totalOrders || 0,
        averageOrderValue: salesReport.summary?.averageOrderValue || 0,
        uniqueCustomers: salesReport.summary?.uniqueCustomers || 0
      },
      topItems: performanceMetrics.topSellingItems?.slice(0, 5) || [],
      peakHours: performanceMetrics.peakHours?.slice(0, 3) || [],
      orderTypes: performanceMetrics.orderTypeDistribution || [],
      inventory: {
        lowStockItems: inventoryAnalytics.summary?.totalLowStockItems || 0,
        criticalItems: inventoryAnalytics.summary?.criticalItems || 0,
        shortageValue: inventoryAnalytics.summary?.totalShortageValue || 0
      },
      customers: {
        totalCustomers: customerAnalytics.summary?.totalCustomers || 0,
        repeatCustomers: customerAnalytics.summary?.repeatCustomers || 0,
        averageOrderValue: customerAnalytics.summary?.averageOrderValue || 0
      }
    };

    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
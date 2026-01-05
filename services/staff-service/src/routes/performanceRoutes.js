const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const PerformanceService = require('../services/PerformanceService');
const { 
  authenticateToken, 
  extractTenantContext, 
  requireRole, 
  requirePermission,
  requireSelfOrAdmin 
} = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const performanceService = new PerformanceService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Record performance metrics
 */
router.post('/metrics',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.update']),
  [
    body('staffId').notEmpty().withMessage('Staff ID is required'),
    body('date').optional().isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
    body('ordersProcessed').optional().isInt({ min: 0 }).withMessage('Orders processed must be a non-negative integer'),
    body('hoursWorked').optional().isFloat({ min: 0 }).withMessage('Hours worked must be a non-negative number'),
    body('customerRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Customer rating must be between 0 and 5'),
    body('customerFeedbackCount').optional().isInt({ min: 0 }).withMessage('Customer feedback count must be a non-negative integer'),
    body('tasksCompleted').optional().isInt({ min: 0 }).withMessage('Tasks completed must be a non-negative integer'),
    body('tasksAssigned').optional().isInt({ min: 0 }).withMessage('Tasks assigned must be a non-negative integer'),
    body('salesAmount').optional().isFloat({ min: 0 }).withMessage('Sales amount must be a non-negative number'),
    body('errors').optional().isInt({ min: 0 }).withMessage('Errors must be a non-negative integer'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const metricsData = {
        ...req.body,
        recordedBy: req.user.id,
      };

      const result = await performanceService.recordPerformanceMetrics(
        req.tenantId, 
        req.body.staffId, 
        metricsData
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get performance metrics for staff member
 */
router.get('/metrics/:staffId',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required (YYYY-MM-DD)'),
    query('endDate').isISO8601().withMessage('Valid end date is required (YYYY-MM-DD)'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await performanceService.getPerformanceMetrics(
        req.tenantId, 
        req.params.staffId, 
        req.query.startDate, 
        req.query.endDate
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Create performance review
 */
router.post('/reviews',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.update']),
  [
    body('staffId').notEmpty().withMessage('Staff ID is required'),
    body('reviewPeriodStart').isISO8601().withMessage('Valid review period start date is required'),
    body('reviewPeriodEnd').isISO8601().withMessage('Valid review period end date is required'),
    body('overallRating').isFloat({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
    body('strengths').optional().isArray().withMessage('Strengths must be an array'),
    body('areasForImprovement').optional().isArray().withMessage('Areas for improvement must be an array'),
    body('goals').optional().isArray().withMessage('Goals must be an array'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('reviewType').optional().isIn(['REGULAR', 'PROBATION', 'ANNUAL', 'PROMOTION']).withMessage('Invalid review type'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const reviewData = {
        ...req.body,
        reviewerId: req.user.id,
      };

      const result = await performanceService.createPerformanceReview(req.tenantId, reviewData);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update performance review
 */
router.patch('/reviews/:reviewId',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.update']),
  [
    param('reviewId').notEmpty().withMessage('Review ID is required'),
    body('overallRating').optional().isFloat({ min: 1, max: 5 }).withMessage('Overall rating must be between 1 and 5'),
    body('strengths').optional().isArray().withMessage('Strengths must be an array'),
    body('areasForImprovement').optional().isArray().withMessage('Areas for improvement must be an array'),
    body('goals').optional().isArray().withMessage('Goals must be an array'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('status').optional().isIn(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).withMessage('Invalid status'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await performanceService.updatePerformanceReview(
        req.tenantId, 
        req.params.reviewId, 
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get performance reviews for staff member
 */
router.get('/reviews/:staffId',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await performanceService.getPerformanceReviews(req.tenantId, req.params.staffId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate performance dashboard
 */
router.get('/dashboard/:staffId',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    query('period').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid period'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const period = req.query.period || '30d';
      const result = await performanceService.generatePerformanceDashboard(
        req.tenantId, 
        req.params.staffId, 
        period
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
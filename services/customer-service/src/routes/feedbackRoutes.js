const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const FeedbackService = require('../services/FeedbackService');
const { 
  authenticateToken, 
  extractTenantContext, 
  requireRole, 
  requirePermission,
  optionalAuth
} = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const feedbackService = new FeedbackService(dbManager);

// Middleware for most routes
router.use(optionalAuth);
router.use(extractTenantContext);

/**
 * Submit customer feedback
 */
router.post('/',
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().withMessage('Comment must be a string'),
    body('category').optional().isIn(['FOOD', 'SERVICE', 'AMBIANCE', 'DELIVERY', 'GENERAL']).withMessage('Invalid category'),
    body('customerId').optional().notEmpty().withMessage('Customer ID must not be empty'),
    body('orderId').optional().notEmpty().withMessage('Order ID must not be empty'),
    body('isAnonymous').optional().isBoolean().withMessage('isAnonymous must be a boolean'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
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

      const result = await feedbackService.submitFeedback(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all feedback (staff only)
 */
router.get('/',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    query('category').optional().isIn(['FOOD', 'SERVICE', 'AMBIANCE', 'DELIVERY', 'GENERAL']).withMessage('Invalid category'),
    query('status').optional().isIn(['PENDING', 'REVIEWED', 'RESPONDED']).withMessage('Invalid status'),
    query('customerId').optional().notEmpty().withMessage('Customer ID must not be empty'),
    query('orderId').optional().notEmpty().withMessage('Order ID must not be empty'),
    query('isPublic').optional().isBoolean().withMessage('isPublic must be a boolean'),
    query('minRating').optional().isInt({ min: 1, max: 5 }).withMessage('minRating must be between 1 and 5'),
    query('maxRating').optional().isInt({ min: 1, max: 5 }).withMessage('maxRating must be between 1 and 5'),
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

      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        rating: req.query.rating,
        category: req.query.category,
        status: req.query.status,
        customerId: req.query.customerId,
        orderId: req.query.orderId,
        isPublic: req.query.isPublic !== undefined ? req.query.isPublic === 'true' : undefined,
        minRating: req.query.minRating,
        maxRating: req.query.maxRating,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const result = await feedbackService.getAllFeedback(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get public feedback (no authentication required)
 */
router.get('/public',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isIn(['FOOD', 'SERVICE', 'AMBIANCE', 'DELIVERY', 'GENERAL']).withMessage('Invalid category'),
    query('minRating').optional().isInt({ min: 1, max: 5 }).withMessage('minRating must be between 1 and 5'),
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

      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        category: req.query.category,
        minRating: req.query.minRating,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const result = await feedbackService.getPublicFeedback(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get feedback by ID
 */
router.get('/:feedbackId',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.read']),
  [
    param('feedbackId').notEmpty().withMessage('Feedback ID is required'),
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

      const result = await feedbackService.getFeedbackById(req.tenantId, req.params.feedbackId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Respond to feedback
 */
router.post('/:feedbackId/respond',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.respond']),
  [
    param('feedbackId').notEmpty().withMessage('Feedback ID is required'),
    body('response').notEmpty().withMessage('Response is required'),
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

      const result = await feedbackService.respondToFeedback(
        req.tenantId, 
        req.params.feedbackId, 
        req.body.response, 
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update feedback status
 */
router.patch('/:feedbackId/status',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.update']),
  [
    param('feedbackId').notEmpty().withMessage('Feedback ID is required'),
    body('status').isIn(['PENDING', 'REVIEWED', 'RESPONDED']).withMessage('Invalid status'),
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

      const result = await feedbackService.updateFeedbackStatus(
        req.tenantId, 
        req.params.feedbackId, 
        req.body.status, 
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Toggle feedback visibility (public/private)
 */
router.patch('/:feedbackId/visibility',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.update']),
  [
    param('feedbackId').notEmpty().withMessage('Feedback ID is required'),
    body('isPublic').isBoolean().withMessage('isPublic must be a boolean'),
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

      const result = await feedbackService.toggleFeedbackVisibility(
        req.tenantId, 
        req.params.feedbackId, 
        req.body.isPublic
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Vote feedback as helpful
 */
router.post('/:feedbackId/helpful',
  [
    param('feedbackId').notEmpty().withMessage('Feedback ID is required'),
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

      const result = await feedbackService.voteFeedbackHelpful(req.tenantId, req.params.feedbackId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get feedback summary
 */
router.get('/analytics/summary',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.read']),
  async (req, res, next) => {
    try {
      const result = await feedbackService.getFeedbackSummary(req.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer feedback history
 */
router.get('/customer/:customerId',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['feedback.read']),
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
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

      const result = await feedbackService.getCustomerFeedback(req.tenantId, req.params.customerId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate feedback report
 */
router.get('/reports/feedback',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['reports.read']),
  [
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

      const result = await feedbackService.generateFeedbackReport(
        req.tenantId, 
        req.query.startDate, 
        req.query.endDate
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
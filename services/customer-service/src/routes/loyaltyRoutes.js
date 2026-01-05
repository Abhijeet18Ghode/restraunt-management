const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const LoyaltyService = require('../services/LoyaltyService');
const CustomerService = require('../services/CustomerService');
const { 
  authenticateToken, 
  extractTenantContext, 
  requireRole, 
  requirePermission,
  requireCustomerOrStaff
} = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const loyaltyService = new LoyaltyService(dbManager);
const customerService = new CustomerService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Award loyalty points
 */
router.post('/points/award',
  requireRole(['ADMIN', 'MANAGER', 'CASHIER']),
  requirePermission(['loyalty.manage']),
  [
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('orderId').optional().notEmpty().withMessage('Order ID must not be empty'),
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

      const { customerId, points, reason, orderId } = req.body;
      const result = await loyaltyService.awardPoints(req.tenantId, customerId, points, reason, orderId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Redeem loyalty points
 */
router.post('/points/redeem',
  requireCustomerOrStaff,
  [
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('rewardId').notEmpty().withMessage('Reward ID is required'),
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

      const { customerId, rewardId } = req.body;
      const result = await loyaltyService.redeemPoints(req.tenantId, customerId, rewardId, customerService);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Use a redeemed reward
 */
router.post('/rewards/use',
  requireRole(['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']),
  requirePermission(['loyalty.manage']),
  [
    body('customerId').notEmpty().withMessage('Customer ID is required'),
    body('redemptionId').notEmpty().withMessage('Redemption ID is required'),
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

      const { customerId, redemptionId } = req.body;
      const result = await loyaltyService.useReward(req.tenantId, customerId, redemptionId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer loyalty summary
 */
router.get('/:customerId/summary',
  requireCustomerOrStaff,
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

      const result = await loyaltyService.getLoyaltySummary(req.tenantId, req.params.customerId, customerService);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer redemption history
 */
router.get('/:customerId/redemptions',
  requireCustomerOrStaff,
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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

      const limit = parseInt(req.query.limit) || 20;
      const result = await loyaltyService.getRedemptionHistory(req.tenantId, req.params.customerId, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get reward catalog
 */
router.get('/rewards/catalog',
  [
    query('activeOnly').optional().isBoolean().withMessage('activeOnly must be a boolean'),
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

      const activeOnly = req.query.activeOnly !== 'false';
      const result = await loyaltyService.getRewardCatalog(req.tenantId, activeOnly);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Add custom reward
 */
router.post('/rewards',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['loyalty.manage']),
  [
    body('name').notEmpty().withMessage('Reward name is required'),
    body('description').notEmpty().withMessage('Reward description is required'),
    body('pointsCost').isInt({ min: 1 }).withMessage('Points cost must be a positive integer'),
    body('category').optional().isString().withMessage('Category must be a string'),
    body('validityDays').optional().isInt({ min: 1 }).withMessage('Validity days must be a positive integer'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
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

      const result = await loyaltyService.addReward(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate loyalty report
 */
router.get('/reports/loyalty',
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

      const result = await loyaltyService.generateLoyaltyReport(
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
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { validateTenantAccess, requireRole } = require('../middleware/auth');
const PricingService = require('../services/PricingService');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

/**
 * POST /api/pricing/percentage-change
 * Apply percentage-based price changes
 */
router.post('/percentage-change',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('itemIds').isArray({ min: 1 }).withMessage('Item IDs array is required'),
  body('itemIds.*').isUUID().withMessage('Each item ID must be a valid UUID'),
  body('percentage').isFloat().withMessage('Percentage must be a number'),
  body('roundTo').optional().isFloat({ min: 0.01 }).withMessage('Round to must be at least 0.01'),
  body('minPrice').optional().isFloat({ min: 0.01 }).withMessage('Min price must be at least 0.01'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.applyPercentageChange(req.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pricing/category-pricing
 * Apply category-based pricing
 */
router.post('/category-pricing',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('categoryId').isUUID().withMessage('Category ID must be a valid UUID'),
  body('priceMultiplier').isFloat({ min: 0.01 }).withMessage('Price multiplier must be positive'),
  body('fixedAdjustment').optional().isFloat().withMessage('Fixed adjustment must be a number'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.applyCategoryPricing(req.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pricing/analytics
 * Get pricing analytics
 */
router.get('/analytics',
  validateTenantAccess,
  query('categoryId').optional().isUUID().withMessage('Category ID must be a valid UUID'),
  query('outletId').optional().isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.getPricingAnalytics(req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pricing/compare-competitors
 * Compare prices with competitors
 */
router.post('/compare-competitors',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('itemIds').isArray({ min: 1 }).withMessage('Item IDs array is required'),
  body('itemIds.*').isUUID().withMessage('Each item ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.compareWithCompetitors(req.tenantId, req.body.itemIds);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pricing/recommendations
 * Generate pricing recommendations
 */
router.get('/recommendations',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  query('categoryId').optional().isUUID().withMessage('Category ID must be a valid UUID'),
  query('targetMargin').optional().isFloat({ min: 0, max: 1 }).withMessage('Target margin must be between 0 and 1'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.generatePricingRecommendations(req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/pricing/schedule-change
 * Schedule price changes
 */
router.post('/schedule-change',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  body('newPrice').isFloat({ min: 0 }).withMessage('New price must be non-negative'),
  body('scheduledTime').isISO8601().withMessage('Scheduled time must be a valid ISO date'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.schedulePriceChange(req.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/pricing/history/:itemId
 * Get price history for item
 */
router.get('/history/:itemId',
  validateTenantAccess,
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const pricingService = new PricingService(req.app.locals.db);
      const result = await pricingService.getPriceHistory(
        req.tenantId, 
        req.params.itemId,
        req.query
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
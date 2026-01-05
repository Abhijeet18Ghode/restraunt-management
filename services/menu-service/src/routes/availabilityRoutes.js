const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { validateTenantAccess, requireRole } = require('../middleware/auth');
const AvailabilityService = require('../services/AvailabilityService');

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
 * POST /api/availability/update-from-inventory/:outletId
 * Update availability based on inventory levels
 */
router.post('/update-from-inventory/:outletId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER', 'CASHIER']),
  param('outletId').isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.updateAvailabilityFromInventory(
        req.tenantId, 
        req.params.outletId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/availability/schedule
 * Schedule availability changes
 */
router.post('/schedule',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('itemIds').isArray({ min: 1 }).withMessage('Item IDs array is required'),
  body('itemIds.*').isUUID().withMessage('Each item ID must be a valid UUID'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  body('scheduledTime').isISO8601().withMessage('Scheduled time must be a valid ISO date'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.scheduleAvailabilityChange(req.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/availability/status/:outletId
 * Get availability status for outlet
 */
router.get('/status/:outletId',
  validateTenantAccess,
  param('outletId').isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.getOutletAvailabilityStatus(
        req.tenantId, 
        req.params.outletId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/availability/bulk-update
 * Bulk availability update with reasons
 */
router.patch('/bulk-update',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('updates').isArray({ min: 1 }).withMessage('Updates array is required'),
  body('updates.*.itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  body('updates.*.isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  body('updates.*.reason').optional().isString().withMessage('Reason must be a string'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.bulkUpdateAvailability(req.tenantId, req.body.updates);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/availability/apply-time-based/:outletId
 * Apply time-based availability rules
 */
router.post('/apply-time-based/:outletId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  param('outletId').isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.applyTimeBasedAvailability(
        req.tenantId, 
        req.params.outletId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/availability/history/:itemId
 * Get availability history for item
 */
router.get('/history/:itemId',
  validateTenantAccess,
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const availabilityService = new AvailabilityService(req.app.locals.db);
      const result = await availabilityService.getAvailabilityHistory(
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
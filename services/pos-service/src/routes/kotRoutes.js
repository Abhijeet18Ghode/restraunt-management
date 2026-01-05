const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const KOTService = require('../services/KOTService');

const router = express.Router();
const dbManager = new DatabaseManager();
const kotService = new KOTService(dbManager);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: errors.array(),
    });
  }
  next();
};

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

/**
 * POST /api/kot/generate
 * Generate KOT for order
 */
router.post('/generate', [
  body('orderId').isUUID(),
  body('orderNumber').notEmpty().isString().trim(),
  body('tableId').optional().isUUID(),
  body('orderType').optional().isIn(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  body('items').isArray({ min: 1 }),
  body('items.*.menuItemId').isUUID(),
  body('items.*.menuItemName').notEmpty().isString().trim(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.specialInstructions').optional().isString().trim(),
  body('priority').optional().isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.generateKOT(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/kot/:id
 * Get KOT by ID
 */
router.get('/:id', [
  param('id').isString(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.getKOT(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/kot/:id/status
 * Update KOT status
 */
router.put('/:id/status', [
  param('id').isString(),
  body('status').isIn(['PENDING', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.updateKOTStatus(req.tenantId, req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/kot/:kotId/items/:itemId/status
 * Update KOT item status
 */
router.put('/:kotId/items/:itemId/status', [
  param('kotId').isString(),
  param('itemId').isString(),
  body('status').isIn(['PENDING', 'IN_PROGRESS', 'READY', 'SERVED']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.updateKOTItemStatus(
      req.tenantId, 
      req.params.kotId, 
      req.params.itemId, 
      req.body.status
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/kot/kitchen/display
 * Get KOTs for kitchen display
 */
router.get('/kitchen/display', [
  query('outletId').optional().isUUID(),
  query('status').optional().isIn(['PENDING', 'IN_PROGRESS', 'READY', 'SERVED', 'CANCELLED']),
  query('orderBy').optional().isIn(['createdAt', 'estimatedCompletionTime', 'priority']),
  query('orderDirection').optional().isIn(['ASC', 'DESC']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.getKitchenDisplay(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/kot/:id/assign
 * Assign KOT to kitchen staff
 */
router.post('/:id/assign', [
  param('id').isString(),
  body('staffId').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.assignKOT(req.tenantId, req.params.id, req.body.staffId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/kot/statistics/:outletId
 * Get KOT statistics for outlet
 */
router.get('/statistics/:outletId', [
  param('outletId').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.getKOTStatistics(req.tenantId, req.params.outletId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/kot/overdue/:outletId
 * Get overdue KOTs for outlet
 */
router.get('/overdue/:outletId', [
  param('outletId').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.getOverdueKOTs(req.tenantId, req.params.outletId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/kot/:id/preparation-time
 * Update preparation time estimate
 */
router.put('/:id/preparation-time', [
  param('id').isString(),
  body('estimatedCompletionTime').isISO8601(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await kotService.updatePreparationTime(
      req.tenantId, 
      req.params.id, 
      req.body.estimatedCompletionTime
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
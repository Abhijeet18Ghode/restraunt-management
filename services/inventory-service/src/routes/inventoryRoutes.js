const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const InventoryService = require('../services/InventoryService');

const router = express.Router();
const dbManager = new DatabaseManager();
const inventoryService = new InventoryService(dbManager);

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
 * GET /api/inventory
 * Get inventory items with pagination and filtering
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('outletId').optional().isUUID(),
  query('category').optional().isString(),
  query('lowStock').optional().isBoolean(),
  query('search').optional().isString(),
  query('orderBy').optional().isIn(['name', 'currentStock', 'minimumStock', 'unitCost', 'createdAt']),
  query('orderDirection').optional().isIn(['ASC', 'DESC']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryItems(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inventory
 * Create a new inventory item
 */
router.post('/', [
  body('name').notEmpty().isString().trim(),
  body('outletId').isUUID(),
  body('currentStock').isFloat({ min: 0 }),
  body('minimumStock').isFloat({ min: 0 }),
  body('unit').notEmpty().isString().trim(),
  body('category').optional().isString().trim(),
  body('unitCost').optional().isFloat({ min: 0 }),
  body('supplierId').optional().isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.createInventoryItem(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/inventory/:id
 * Get inventory item by ID
 */
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryItem(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/inventory/:id
 * Update inventory item
 */
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().isString().trim(),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minimumStock').optional().isFloat({ min: 0 }),
  body('unit').optional().isString().trim(),
  body('category').optional().isString().trim(),
  body('unitCost').optional().isFloat({ min: 0 }),
  body('supplierId').optional().isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.updateInventoryItem(req.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/inventory/:id
 * Delete inventory item
 */
router.delete('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.deleteInventoryItem(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inventory/bulk-import
 * Bulk import inventory items
 */
router.post('/bulk-import', [
  body('items').isArray({ min: 1 }),
  body('items.*.name').notEmpty().isString().trim(),
  body('items.*.outletId').isUUID(),
  body('items.*.currentStock').isFloat({ min: 0 }),
  body('items.*.minimumStock').isFloat({ min: 0 }),
  body('items.*.unit').notEmpty().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.bulkImportItems(req.tenantId, req.body.items);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/inventory/statistics
 * Get inventory statistics
 */
router.get('/statistics', [
  query('outletId').optional().isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryStatistics(req.tenantId, req.query.outletId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/inventory/low-stock
 * Get low stock alerts
 */
router.get('/low-stock', [
  query('outletId').optional().isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.checkLowStock(req.tenantId, req.query.outletId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/inventory/transfer
 * Transfer stock between outlets
 */
router.post('/transfer', [
  body('itemName').notEmpty().isString().trim(),
  body('fromOutletId').isUUID(),
  body('toOutletId').isUUID(),
  body('quantity').isFloat({ min: 0.01 }),
  body('reason').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.transferStock(req.tenantId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const StockService = require('../services/StockService');
const InventoryService = require('../services/InventoryService');

const router = express.Router();
const dbManager = new DatabaseManager();
const stockService = new StockService(dbManager);
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
 * POST /api/stock/update
 * Update stock levels (IN/OUT/ADJUSTMENT)
 */
router.post('/update', [
  body('itemId').isUUID(),
  body('quantity').isFloat(),
  body('type').isIn(['IN', 'OUT', 'ADJUSTMENT']),
  body('reason').optional().isString().trim(),
  body('reference').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await inventoryService.updateStock(req.tenantId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stock/receipt
 * Process stock receipt from supplier
 */
router.post('/receipt', [
  body('supplierId').optional().isUUID(),
  body('outletId').isUUID(),
  body('receiptNumber').notEmpty().isString().trim(),
  body('deliveryDate').optional().isISO8601(),
  body('items').isArray({ min: 1 }),
  body('items.*.itemName').notEmpty().isString().trim(),
  body('items.*.quantityReceived').isFloat({ min: 0.01 }),
  body('items.*.unitCost').optional().isFloat({ min: 0 }),
  body('items.*.expiryDate').optional().isISO8601(),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await stockService.processStockReceipt(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stock/consumption
 * Process recipe-based consumption
 */
router.post('/consumption', [
  body('outletId').isUUID(),
  body('recipeId').optional().isString().trim(),
  body('recipeName').notEmpty().isString().trim(),
  body('quantity').optional().isInt({ min: 1 }),
  body('ingredients').isArray({ min: 1 }),
  body('ingredients.*.name').notEmpty().isString().trim(),
  body('ingredients.*.quantityPerUnit').isFloat({ min: 0.01 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await stockService.processRecipeConsumption(req.tenantId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stock/purchase-order
 * Generate purchase order
 */
router.post('/purchase-order', [
  body('outletId').isUUID(),
  body('supplierId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.itemName').notEmpty().isString().trim(),
  body('items.*.quantityOrdered').isFloat({ min: 0.01 }),
  body('items.*.estimatedUnitCost').optional().isFloat({ min: 0 }),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await stockService.generatePurchaseOrder(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stock/movements
 * Get stock movement history
 */
router.get('/movements', [
  query('itemId').optional().isUUID(),
  query('outletId').optional().isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('type').optional().isIn(['IN', 'OUT', 'ADJUSTMENT']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await stockService.getStockMovements(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/stock/validate-order
 * Validate stock availability for order
 */
router.post('/validate-order', [
  body('outletId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('items.*.itemName').notEmpty().isString().trim(),
  body('items.*.quantityRequired').isFloat({ min: 0.01 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await stockService.validateStockForOrder(req.tenantId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
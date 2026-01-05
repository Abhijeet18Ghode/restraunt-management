const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const POSService = require('../services/POSService');

const router = express.Router();
const dbManager = new DatabaseManager();
const posService = new POSService(dbManager);

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
 * POST /api/orders
 * Create a new order
 */
router.post('/', [
  body('outletId').isUUID(),
  body('tableId').optional().isUUID(),
  body('customerId').optional().isUUID(),
  body('orderType').optional().isIn(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  body('items').isArray({ min: 1 }),
  body('items.*.menuItemId').isUUID(),
  body('items.*.menuItemName').notEmpty().isString().trim(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.unitPrice').isFloat({ min: 0 }),
  body('items.*.specialInstructions').optional().isString().trim(),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.createOrder(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/orders/:id
 * Get order by ID
 */
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.getOrder(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/orders/:id/status
 * Update order status
 */
router.put('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.updateOrderStatus(req.tenantId, req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/payment
 * Process payment for order
 */
router.post('/:id/payment', [
  param('id').isUUID(),
  body('paymentMethod').isIn(['CASH', 'CARD', 'DIGITAL_WALLET', 'UPI']),
  body('amount').isFloat({ min: 0 }),
  body('paymentReference').optional().isString().trim(),
  body('splitDetails').optional().isObject(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const paymentData = {
      orderId: req.params.id,
      ...req.body,
    };
    const result = await posService.processPayment(req.tenantId, paymentData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/kot
 * Generate Kitchen Order Ticket
 */
router.post('/:id/kot', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.generateKOT(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/:id/split
 * Split bill for order
 */
router.post('/:id/split', [
  param('id').isUUID(),
  body('splitType').isIn(['EQUAL', 'BY_ITEMS', 'BY_AMOUNT']),
  body('splits').isObject(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.splitBill(req.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/orders/merge-tables
 * Merge tables and their orders
 */
router.post('/merge-tables', [
  body('tableIds').isArray({ min: 2 }),
  body('tableIds.*').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await posService.mergeTables(req.tenantId, req.body.tableIds);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const BillingService = require('../services/BillingService');

const router = express.Router();
const dbManager = new DatabaseManager();
const billingService = new BillingService(dbManager);

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
 * POST /api/billing/generate
 * Generate bill for order
 */
router.post('/generate', [
  body('orderId').isUUID(),
  body('discounts').optional().isArray(),
  body('discounts.*.type').optional().isIn(['PERCENTAGE', 'FIXED']),
  body('discounts.*.value').optional().isFloat({ min: 0 }),
  body('discounts.*.description').optional().isString().trim(),
  body('taxes').optional().isArray(),
  body('taxes.*.name').optional().isString().trim(),
  body('taxes.*.rate').optional().isFloat({ min: 0, max: 100 }),
  body('serviceCharge').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await billingService.generateBill(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/:billId/payment
 * Process payment for bill
 */
router.post('/:billId/payment', [
  param('billId').isString(),
  body('payments').isArray({ min: 1 }),
  body('payments.*.method').isIn(['CASH', 'CARD', 'DIGITAL_WALLET', 'UPI', 'CREDIT']),
  body('payments.*.amount').isFloat({ min: 0.01 }),
  body('payments.*.reference').optional().isString().trim(),
  body('payments.*.cardLast4').optional().isString().isLength({ min: 4, max: 4 }),
  body('payments.*.approvalCode').optional().isString().trim(),
  body('customerInfo').optional().isObject(),
  body('customerInfo.name').optional().isString().trim(),
  body('customerInfo.phone').optional().isString().trim(),
  body('customerInfo.email').optional().isEmail(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const paymentData = {
      billId: req.params.billId,
      ...req.body,
    };
    const result = await billingService.processPayment(req.tenantId, paymentData);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/:billId/split/amount
 * Split bill by amount
 */
router.post('/:billId/split/amount', [
  param('billId').isString(),
  body('splitAmounts').isArray({ min: 2 }),
  body('splitAmounts.*').isFloat({ min: 0.01 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await billingService.splitBillByAmount(
      req.tenantId, 
      req.params.billId, 
      req.body.splitAmounts
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/billing/:billId/split/items
 * Split bill by items
 */
router.post('/:billId/split/items', [
  param('billId').isString(),
  body('itemSplits').isArray({ min: 1 }),
  body('itemSplits.*.itemIds').isArray({ min: 1 }),
  body('itemSplits.*.itemIds.*').isString(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await billingService.splitBillByItems(
      req.tenantId, 
      req.params.billId, 
      req.body.itemSplits
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/billing/:billId/receipt
 * Generate receipt for paid bill
 */
router.get('/:billId/receipt', [
  param('billId').isString(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await billingService.generateReceipt(req.tenantId, req.params.billId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
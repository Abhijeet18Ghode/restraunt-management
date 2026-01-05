const express = require('express');
const { query, validationResult } = require('express-validator');
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
 * GET /api/alerts/low-stock
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

module.exports = router;
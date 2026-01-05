const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const TableService = require('../services/TableService');

const router = express.Router();
const dbManager = new DatabaseManager();
const tableService = new TableService(dbManager);

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
 * GET /api/tables
 * Get tables with pagination and filtering
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('outletId').optional().isUUID(),
  query('section').optional().isString(),
  query('status').optional().isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_ORDER']),
  query('isActive').optional().isBoolean(),
  query('orderBy').optional().isIn(['table_number', 'capacity', 'status', 'created_at']),
  query('orderDirection').optional().isIn(['ASC', 'DESC']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.getTables(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables
 * Create a new table
 */
router.post('/', [
  body('outletId').isUUID(),
  body('tableNumber').notEmpty().isString().trim(),
  body('capacity').isInt({ min: 1 }),
  body('section').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.createTable(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/:id
 * Get table by ID
 */
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.getTable(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tables/:id
 * Update table
 */
router.put('/:id', [
  param('id').isUUID(),
  body('tableNumber').optional().isString().trim(),
  body('capacity').optional().isInt({ min: 1 }),
  body('section').optional().isString().trim(),
  body('isActive').optional().isBoolean(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.updateTable(req.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tables/:id
 * Delete table
 */
router.delete('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.deleteTable(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tables/:id/status
 * Update table status
 */
router.put('/:id/status', [
  param('id').isUUID(),
  body('status').isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_ORDER']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.updateTableStatus(req.tenantId, req.params.id, req.body.status);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/available/:outletId
 * Get available tables for outlet
 */
router.get('/available/:outletId', [
  param('outletId').isUUID(),
  query('capacity').optional().isInt({ min: 1 }),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.getAvailableTables(
      req.tenantId, 
      req.params.outletId, 
      req.query.capacity
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables/:id/assign
 * Assign table to customer
 */
router.post('/:id/assign', [
  param('id').isUUID(),
  body('customerId').optional().isUUID(),
  body('customerName').optional().isString().trim(),
  body('partySize').optional().isInt({ min: 1 }),
  body('reservationTime').optional().isISO8601(),
  body('notes').optional().isString().trim(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.assignTable(req.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tables/:id/release
 * Release table
 */
router.post('/:id/release', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.releaseTable(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tables/statistics/:outletId
 * Get table occupancy statistics
 */
router.get('/statistics/:outletId', [
  param('outletId').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await tableService.getTableStatistics(req.tenantId, req.params.outletId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
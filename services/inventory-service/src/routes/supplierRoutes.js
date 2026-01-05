const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireTenant } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');
const SupplierService = require('../services/SupplierService');

const router = express.Router();
const dbManager = new DatabaseManager();
const supplierService = new SupplierService(dbManager);

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
 * GET /api/suppliers
 * Get suppliers with pagination and filtering
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('isActive').optional().isBoolean(),
  query('search').optional().isString(),
  query('orderBy').optional().isIn(['name', 'contactPerson', 'createdAt']),
  query('orderDirection').optional().isIn(['ASC', 'DESC']),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.getSuppliers(req.tenantId, req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/suppliers
 * Create a new supplier
 */
router.post('/', [
  body('name').notEmpty().isString().trim(),
  body('contactPerson').notEmpty().isString().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().isString().trim(),
  body('address').optional().isObject(),
  body('address.street').optional().isString().trim(),
  body('address.city').optional().isString().trim(),
  body('address.state').optional().isString().trim(),
  body('address.zipCode').optional().isString().trim(),
  body('address.country').optional().isString().trim(),
  body('paymentTerms').optional().isIn(['NET_15', 'NET_30', 'NET_45', 'NET_60', 'COD']),
  body('isActive').optional().isBoolean(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.createSupplier(req.tenantId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/suppliers/:id
 * Get supplier by ID
 */
router.get('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.getSupplier(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/suppliers/:id
 * Update supplier
 */
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().isString().trim(),
  body('contactPerson').optional().isString().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().trim(),
  body('address').optional().isObject(),
  body('paymentTerms').optional().isIn(['NET_15', 'NET_30', 'NET_45', 'NET_60', 'COD']),
  body('isActive').optional().isBoolean(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.updateSupplier(req.tenantId, req.params.id, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/suppliers/:id
 * Delete supplier
 */
router.delete('/:id', [
  param('id').isUUID(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.deleteSupplier(req.tenantId, req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/suppliers/:id/performance
 * Get supplier performance metrics
 */
router.get('/:id/performance', [
  param('id').isUUID(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], handleValidationErrors, async (req, res, next) => {
  try {
    const result = await supplierService.getSupplierPerformance(
      req.tenantId, 
      req.params.id, 
      req.query
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
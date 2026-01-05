const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { validateTenantAccess, requireRole } = require('../middleware/auth');
const CategoryService = require('../services/CategoryService');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Create category validation
const createCategoryValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
];

// Update category validation
const updateCategoryValidation = [
  param('categoryId')
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// List categories validation
const listCategoriesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * POST /api/categories
 * Create a new category
 */
router.post('/',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  createCategoryValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.createCategory(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories/:categoryId
 * Get category by ID
 */
router.get('/:categoryId',
  validateTenantAccess,
  param('categoryId').isUUID().withMessage('Category ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.getCategory(req.tenantId, req.params.categoryId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/categories/:categoryId
 * Update category
 */
router.put('/:categoryId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  updateCategoryValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.updateCategory(req.tenantId, req.params.categoryId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/categories/:categoryId
 * Delete category
 */
router.delete('/:categoryId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  param('categoryId').isUUID().withMessage('Category ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.deleteCategory(req.tenantId, req.params.categoryId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories
 * Get all categories
 */
router.get('/',
  validateTenantAccess,
  listCategoriesValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.getCategories(req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories/with-counts
 * Get categories with item counts
 */
router.get('/with-counts',
  validateTenantAccess,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.getCategoriesWithItemCounts(req.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/categories/reorder
 * Reorder categories
 */
router.patch('/reorder',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('orders').isArray({ min: 1 }).withMessage('Orders array is required'),
  body('orders.*.categoryId').isUUID().withMessage('Category ID must be a valid UUID'),
  body('orders.*.sortOrder').isInt({ min: 0 }).withMessage('Sort order must be a non-negative integer'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.reorderCategories(req.tenantId, req.body.orders);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/categories/statistics
 * Get category statistics
 */
router.get('/statistics',
  validateTenantAccess,
  async (req, res, next) => {
    try {
      const categoryService = new CategoryService(req.app.locals.db);
      const result = await categoryService.getCategoryStatistics(req.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
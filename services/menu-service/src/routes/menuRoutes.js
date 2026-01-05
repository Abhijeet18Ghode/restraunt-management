const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { validateTenantAccess, requireRole } = require('../middleware/auth');
const MenuService = require('../services/MenuService');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Create menu item validation
const createMenuItemValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive integer'),
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  body('ingredients.*.name')
    .if(body('ingredients').exists())
    .notEmpty()
    .withMessage('Ingredient name is required'),
  body('ingredients.*.quantity')
    .if(body('ingredients').exists())
    .isFloat({ min: 0 })
    .withMessage('Ingredient quantity must be positive'),
  body('ingredients.*.unit')
    .if(body('ingredients').exists())
    .isIn(['KG', 'GRAM', 'LITER', 'ML', 'PIECE', 'PACKET', 'BOX'])
    .withMessage('Invalid ingredient unit'),
  body('outletIds')
    .optional()
    .isArray()
    .withMessage('Outlet IDs must be an array'),
  body('outletIds.*')
    .if(body('outletIds').exists())
    .isUUID()
    .withMessage('Each outlet ID must be a valid UUID'),
];

// Update menu item validation
const updateMenuItemValidation = [
  param('itemId')
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('preparationTime')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Preparation time must be a positive integer'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
];

// List menu items validation
const listMenuItemsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('categoryId')
    .optional()
    .isUUID()
    .withMessage('Category ID must be a valid UUID'),
  query('outletId')
    .optional()
    .isUUID()
    .withMessage('Outlet ID must be a valid UUID'),
  query('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean'),
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
];

/**
 * POST /api/menu/items
 * Create a new menu item
 */
router.post('/items',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  createMenuItemValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.createMenuItem(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/menu/items/:itemId
 * Get menu item by ID
 */
router.get('/items/:itemId',
  validateTenantAccess,
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.getMenuItem(req.tenantId, req.params.itemId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/menu/items/:itemId
 * Update menu item
 */
router.put('/items/:itemId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  updateMenuItemValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.updateMenuItem(req.tenantId, req.params.itemId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/menu/items/:itemId
 * Delete menu item
 */
router.delete('/items/:itemId',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.deleteMenuItem(req.tenantId, req.params.itemId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/menu/items
 * Get menu items with pagination and filtering
 */
router.get('/items',
  validateTenantAccess,
  listMenuItemsValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.getMenuItems(req.tenantId, req.query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/menu/items/:itemId/availability
 * Update item availability
 */
router.patch('/items/:itemId/availability',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER', 'CASHIER']),
  param('itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.updateItemAvailability(
        req.tenantId, 
        req.params.itemId, 
        req.body.isAvailable
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/menu/items/availability
 * Update multiple items availability
 */
router.patch('/items/availability',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('itemIds').isArray({ min: 1 }).withMessage('Item IDs array is required'),
  body('itemIds.*').isUUID().withMessage('Each item ID must be a valid UUID'),
  body('isAvailable').isBoolean().withMessage('isAvailable must be a boolean'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.updateMultipleItemsAvailability(
        req.tenantId, 
        req.body.itemIds, 
        req.body.isAvailable
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/menu/pricing
 * Update pricing for multiple items
 */
router.patch('/pricing',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('updates').isArray({ min: 1 }).withMessage('Updates array is required'),
  body('updates.*.itemId').isUUID().withMessage('Item ID must be a valid UUID'),
  body('updates.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.updatePricing(req.tenantId, req.body.updates);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/menu/low-inventory/:outletId
 * Get items with low inventory for outlet
 */
router.get('/low-inventory/:outletId',
  validateTenantAccess,
  param('outletId').isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.getItemsWithLowInventory(req.tenantId, req.params.outletId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/menu/bulk-import
 * Bulk import menu items
 */
router.post('/bulk-import',
  validateTenantAccess,
  requireRole(['TENANT_ADMIN', 'MANAGER']),
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.bulkImportItems(req.tenantId, req.body.items);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/menu/statistics
 * Get menu statistics
 */
router.get('/statistics',
  validateTenantAccess,
  query('outletId').optional().isUUID().withMessage('Outlet ID must be a valid UUID'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const menuService = new MenuService(req.app.locals.db);
      const result = await menuService.getMenuStatistics(req.tenantId, req.query.outletId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
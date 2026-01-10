const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { authenticateToken, requireTenantAdmin, requireTenantContext } = require('../middleware/auth');
const TenantService = require('../services/TenantService');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Create tenant validation
const createTenantValidation = [
  body('businessName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('contactInfo.email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('contactInfo.phone')
    .matches(/^[+]?[1-9][\d\s\-()]{7,15}$/)
    .withMessage('Valid phone number is required'),
  body('contactInfo.address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  body('contactInfo.address.city')
    .notEmpty()
    .withMessage('City is required'),
  body('contactInfo.address.state')
    .notEmpty()
    .withMessage('State is required'),
  body('contactInfo.address.country')
    .notEmpty()
    .withMessage('Country is required'),
  body('contactInfo.address.zipCode')
    .notEmpty()
    .withMessage('Zip code is required'),
  body('subscriptionPlan')
    .optional()
    .isIn(['BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
  body('adminUser.firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('adminUser.lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('adminUser.email')
    .optional()
    .isEmail()
    .withMessage('Valid admin email is required'),
  body('adminUser.password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Admin password must be at least 8 characters'),
];

// Update tenant validation
const updateTenantValidation = [
  param('tenantId')
    .isUUID()
    .withMessage('Valid tenant ID is required'),
  body('businessName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('contactInfo.email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required'),
  body('contactInfo.phone')
    .optional()
    .matches(/^[+]?[1-9][\d\s\-()]{7,15}$/)
    .withMessage('Valid phone number is required'),
  body('subscriptionPlan')
    .optional()
    .isIn(['BASIC', 'PREMIUM', 'ENTERPRISE'])
    .withMessage('Invalid subscription plan'),
];

// List tenants validation
const listTenantsValidation = [
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
 * POST /api/tenants
 * Create a new tenant
 */
router.post('/', createTenantValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const tenantService = new TenantService(req.app.locals.db);
    const result = await tenantService.createTenant(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId
 * Get tenant by ID
 */
router.get('/:tenantId', 
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.getTenant(req.params.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/tenants/:tenantId
 * Update tenant
 */
router.put('/:tenantId',
  authenticateToken,
  requireTenantContext,
  requireTenantAdmin,
  updateTenantValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.updateTenant(req.params.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/tenants/:tenantId
 * Delete (deactivate) tenant
 */
router.delete('/:tenantId',
  authenticateToken,
  requireTenantContext,
  requireTenantAdmin,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.deleteTenant(req.params.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tenants
 * List all tenants (system admin only)
 */
router.get('/',
  // Note: This would need system admin authentication in production
  listTenantsValidation,
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, isActive } = req.query;
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.listTenants(
        parseInt(page), 
        parseInt(limit), 
        isActive !== undefined ? isActive === 'true' : null
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tenants/:tenantId/config
 * Get tenant configuration
 */
router.get('/:tenantId/config',
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.getTenantConfig(req.params.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tenants/:tenantId/outlets
 * Get outlets for a tenant
 */
router.get('/:tenantId/outlets',
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.getTenantOutlets(req.params.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/tenants/:tenantId/outlets
 * Create a new outlet for a tenant
 */
router.post('/:tenantId/outlets',
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  body('name').isLength({ min: 2, max: 100 }).withMessage('Outlet name must be between 2 and 100 characters'),
  body('address').isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('phone').optional().matches(/^[+]?[1-9][\d\s\-()]{7,15}$/).withMessage('Valid phone number is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.createTenantOutlet(req.params.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/tenants/:tenantId/outlets/:outletId
 * Update an outlet
 */
router.put('/:tenantId/outlets/:outletId',
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  param('outletId').isUUID().withMessage('Valid outlet ID is required'),
  body('name').optional().isLength({ min: 2, max: 100 }).withMessage('Outlet name must be between 2 and 100 characters'),
  body('address').optional().isLength({ min: 5, max: 500 }).withMessage('Address must be between 5 and 500 characters'),
  body('phone').optional().matches(/^[+]?[1-9][\d\s\-()]{7,15}$/).withMessage('Valid phone number is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.updateTenantOutlet(req.params.tenantId, req.params.outletId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/tenants/:tenantId/outlets/:outletId
 * Delete an outlet
 */
router.delete('/:tenantId/outlets/:outletId',
  authenticateToken,
  requireTenantContext,
  param('tenantId').isUUID().withMessage('Valid tenant ID is required'),
  param('outletId').isUUID().withMessage('Valid outlet ID is required'),
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const tenantService = new TenantService(req.app.locals.db);
      const result = await tenantService.deleteTenantOutlet(req.params.tenantId, req.params.outletId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
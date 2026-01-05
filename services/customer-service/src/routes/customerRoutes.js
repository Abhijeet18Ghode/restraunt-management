const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const CustomerService = require('../services/CustomerService');
const { 
  authenticateToken, 
  extractTenantContext, 
  requireRole, 
  requirePermission,
  requireCustomerOrStaff,
  optionalAuth
} = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const customerService = new CustomerService(dbManager);

// Middleware
router.use(optionalAuth);
router.use(extractTenantContext);

/**
 * Create a new customer
 */
router.post('/',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('address').optional().isObject().withMessage('Address must be an object'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object'),
    body('source').optional().isIn(['DIRECT', 'ONLINE', 'REFERRAL']).withMessage('Invalid source'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await customerService.createCustomer(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all customers
 */
router.get('/',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER', 'CASHIER']),
  requirePermission(['customers.read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    query('loyaltyTier').optional().isIn(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).withMessage('Invalid loyalty tier'),
    query('source').optional().isIn(['DIRECT', 'ONLINE', 'REFERRAL']).withMessage('Invalid source'),
    query('search').optional().isString().withMessage('Search must be a string'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        loyaltyTier: req.query.loyaltyTier,
        source: req.query.source,
        search: req.query.search,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const result = await customerService.getAllCustomers(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Search customers
 */
router.get('/search',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']),
  requirePermission(['customers.read']),
  [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const result = await customerService.searchCustomers(req.tenantId, req.query.q, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer by ID
 */
router.get('/:customerId',
  authenticateToken,
  requireCustomerOrStaff,
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await customerService.getCustomerById(req.tenantId, req.params.customerId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update customer
 */
router.patch('/:customerId',
  authenticateToken,
  requireCustomerOrStaff,
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date of birth is required'),
    body('address').optional().isObject().withMessage('Address must be an object'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await customerService.updateCustomer(req.tenantId, req.params.customerId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Record customer order
 */
router.post('/:customerId/orders',
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER', 'CASHIER', 'WAITER']),
  requirePermission(['orders.create']),
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('orderValue').isFloat({ min: 0 }).withMessage('Order value must be a positive number'),
    body('items').optional().isArray().withMessage('Items must be an array'),
    body('orderDate').optional().isISO8601().withMessage('Valid order date is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await customerService.recordCustomerOrder(
        req.tenantId, 
        req.params.customerId, 
        req.body
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer order history
 */
router.get('/:customerId/orders',
  authenticateToken,
  requireCustomerOrStaff,
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const limit = parseInt(req.query.limit) || 20;
      const result = await customerService.getCustomerOrderHistory(
        req.tenantId, 
        req.params.customerId, 
        limit
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get customer analytics
 */
router.get('/:customerId/analytics',
  authenticateToken,
  requireCustomerOrStaff,
  [
    param('customerId').notEmpty().withMessage('Customer ID is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          details: errors.array(),
        });
      }

      const result = await customerService.getCustomerAnalytics(req.tenantId, req.params.customerId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
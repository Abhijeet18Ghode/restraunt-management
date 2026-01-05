const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const StaffService = require('../services/StaffService');
const { 
  authenticateToken, 
  extractTenantContext, 
  requireRole, 
  requirePermission,
  requireSelfOrAdmin 
} = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const staffService = new StaffService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Register a new staff member
 */
router.post('/',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.create']),
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('role').isIn(['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER', 'DELIVERY_PARTNER']).withMessage('Invalid role'),
    body('outletId').optional().isUUID().withMessage('Valid outlet ID is required'),
    body('department').optional().isString().withMessage('Department must be a string'),
    body('position').optional().isString().withMessage('Position must be a string'),
    body('salary').optional().isNumeric().withMessage('Salary must be a number'),
    body('hireDate').optional().isISO8601().withMessage('Hire date must be a valid date'),
    body('emergencyContact').optional().isObject().withMessage('Emergency contact must be an object'),
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

      const result = await staffService.registerStaff(req.tenantId, req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Authenticate staff member (login)
 */
router.post('/auth/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
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

      const { email, password } = req.body;
      const result = await staffService.authenticateStaff(req.tenantId, email, password);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get all staff members
 */
router.get('/',
  requirePermission(['staff.read']),
  [
    query('role').optional().isIn(['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER', 'DELIVERY_PARTNER']).withMessage('Invalid role filter'),
    query('outletId').optional().isUUID().withMessage('Valid outlet ID is required'),
    query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    query('department').optional().isString().withMessage('Department must be a string'),
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
        role: req.query.role,
        outletId: req.query.outletId,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
        department: req.query.department,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const result = await staffService.getAllStaff(req.tenantId, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get staff member by ID
 */
router.get('/:staffId',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
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

      const result = await staffService.getStaffById(req.tenantId, req.params.staffId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update staff member
 */
router.patch('/:staffId',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.update']),
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number is required'),
    body('role').optional().isIn(['ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'WAITER', 'CASHIER', 'DELIVERY_PARTNER']).withMessage('Invalid role'),
    body('outletId').optional().isUUID().withMessage('Valid outlet ID is required'),
    body('department').optional().isString().withMessage('Department must be a string'),
    body('position').optional().isString().withMessage('Position must be a string'),
    body('salary').optional().isNumeric().withMessage('Salary must be a number'),
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

      const result = await staffService.updateStaff(req.tenantId, req.params.staffId, req.body, req.user.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Deactivate staff member
 */
router.patch('/:staffId/deactivate',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.update']),
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    body('reason').optional().isString().withMessage('Reason must be a string'),
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

      const result = await staffService.deactivateStaff(
        req.tenantId, 
        req.params.staffId, 
        req.user.id, 
        req.body.reason
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Change password
 */
router.patch('/:staffId/change-password',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
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

      const { currentPassword, newPassword } = req.body;
      const result = await staffService.changePassword(
        req.tenantId, 
        req.params.staffId, 
        currentPassword, 
        newPassword
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Reset password (admin only)
 */
router.patch('/:staffId/reset-password',
  requireRole(['ADMIN']),
  requirePermission(['staff.update']),
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
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

      const result = await staffService.resetPassword(
        req.tenantId, 
        req.params.staffId, 
        req.body.newPassword, 
        req.user.id
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
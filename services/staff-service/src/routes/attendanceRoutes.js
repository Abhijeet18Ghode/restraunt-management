const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const AttendanceService = require('../services/AttendanceService');
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
const attendanceService = new AttendanceService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Clock in
 */
router.post('/clock-in',
  [
    body('staffId').optional().notEmpty().withMessage('Staff ID must not be empty'),
    body('location').optional().isString().withMessage('Location must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
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

      // Use staffId from body or current user's ID
      const staffId = req.body.staffId || req.user.id;
      
      // Check if user can clock in for this staff member
      if (staffId !== req.user.id && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only clock in for yourself',
        });
      }

      const result = await attendanceService.clockIn(req.tenantId, staffId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Clock out
 */
router.post('/clock-out',
  [
    body('staffId').optional().notEmpty().withMessage('Staff ID must not be empty'),
    body('location').optional().isString().withMessage('Location must be a string'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
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

      // Use staffId from body or current user's ID
      const staffId = req.body.staffId || req.user.id;
      
      // Check if user can clock out for this staff member
      if (staffId !== req.user.id && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only clock out for yourself',
        });
      }

      const result = await attendanceService.clockOut(req.tenantId, staffId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Start break
 */
router.post('/break/start',
  [
    body('staffId').optional().notEmpty().withMessage('Staff ID must not be empty'),
    body('type').optional().isIn(['REGULAR', 'LUNCH', 'EMERGENCY']).withMessage('Invalid break type'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
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

      // Use staffId from body or current user's ID
      const staffId = req.body.staffId || req.user.id;
      
      // Check if user can start break for this staff member
      if (staffId !== req.user.id && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only start break for yourself',
        });
      }

      const result = await attendanceService.startBreak(req.tenantId, staffId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * End break
 */
router.post('/break/end',
  [
    body('staffId').optional().notEmpty().withMessage('Staff ID must not be empty'),
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

      // Use staffId from body or current user's ID
      const staffId = req.body.staffId || req.user.id;
      
      // Check if user can end break for this staff member
      if (staffId !== req.user.id && !['ADMIN', 'MANAGER'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'You can only end break for yourself',
        });
      }

      const result = await attendanceService.endBreak(req.tenantId, staffId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get current status
 */
router.get('/status/:staffId',
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

      const result = await attendanceService.getCurrentStatus(req.tenantId, req.params.staffId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attendance for specific date
 */
router.get('/:staffId/:date',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    param('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
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

      const result = await attendanceService.getAttendance(
        req.tenantId, 
        req.params.staffId, 
        req.params.date
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get attendance history
 */
router.get('/:staffId/history',
  requireSelfOrAdmin,
  [
    param('staffId').notEmpty().withMessage('Staff ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required (YYYY-MM-DD)'),
    query('endDate').isISO8601().withMessage('Valid end date is required (YYYY-MM-DD)'),
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

      const result = await attendanceService.getAttendanceHistory(
        req.tenantId, 
        req.params.staffId, 
        req.query.startDate, 
        req.query.endDate
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get team attendance for date
 */
router.get('/team/:date',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['staff.read']),
  [
    param('date').isISO8601().withMessage('Valid date is required (YYYY-MM-DD)'),
    query('outletId').optional().isUUID().withMessage('Valid outlet ID is required'),
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

      const result = await attendanceService.getTeamAttendance(
        req.tenantId, 
        req.params.date, 
        req.query.outletId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Generate attendance report
 */
router.get('/reports/attendance',
  requireRole(['ADMIN', 'MANAGER']),
  requirePermission(['reports.read']),
  [
    query('startDate').isISO8601().withMessage('Valid start date is required (YYYY-MM-DD)'),
    query('endDate').isISO8601().withMessage('Valid end date is required (YYYY-MM-DD)'),
    query('staffId').optional().notEmpty().withMessage('Staff ID must not be empty'),
    query('outletId').optional().isUUID().withMessage('Valid outlet ID is required'),
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
        staffId: req.query.staffId,
        outletId: req.query.outletId,
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

      const result = await attendanceService.generateAttendanceReport(
        req.tenantId, 
        req.query.startDate, 
        req.query.endDate, 
        filters
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
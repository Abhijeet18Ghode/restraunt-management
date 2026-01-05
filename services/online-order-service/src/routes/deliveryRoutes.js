const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const DeliveryPartnerService = require('../services/DeliveryPartnerService');
const { authenticateToken, extractTenantContext, requireRole } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const deliveryPartnerService = new DeliveryPartnerService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Register a new delivery partner
 */
router.post('/partners',
  requireRole(['ADMIN', 'MANAGER']),
  [
    body('name').notEmpty().withMessage('Partner name is required'),
    body('contactInfo').isObject().withMessage('Contact info is required'),
    body('contactInfo.phone').notEmpty().withMessage('Phone number is required'),
    body('vehicleType').isIn(['BIKE', 'SCOOTER', 'CAR', 'BICYCLE']).withMessage('Invalid vehicle type'),
    body('licenseNumber').optional().isString().withMessage('License number must be a string'),
    body('serviceAreas').optional().isArray().withMessage('Service areas must be an array'),
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

      const result = await deliveryPartnerService.registerDeliveryPartner(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Assign delivery partner to order
 */
router.post('/assign',
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']),
  [
    body('orderId').isUUID().withMessage('Valid order ID is required'),
    body('deliveryAddress').isObject().withMessage('Delivery address is required'),
    body('deliveryAddress.street').notEmpty().withMessage('Street address is required'),
    body('deliveryAddress.city').notEmpty().withMessage('City is required'),
    body('deliveryAddress.pincode').notEmpty().withMessage('Pincode is required'),
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

      const result = await deliveryPartnerService.assignDeliveryPartner(
        req.tenantId, 
        req.body.orderId, 
        req.body.deliveryAddress
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update delivery status
 */
router.patch('/:deliveryId/status',
  requireRole(['ADMIN', 'MANAGER', 'DELIVERY_PARTNER']),
  [
    param('deliveryId').notEmpty().withMessage('Valid delivery ID is required'),
    body('status').isIn(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']).withMessage('Invalid status'),
    body('statusData').optional().isObject().withMessage('Status data must be an object'),
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

      const result = await deliveryPartnerService.updateDeliveryStatus(
        req.tenantId, 
        req.params.deliveryId, 
        req.body.status,
        req.body.statusData
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get delivery tracking information
 */
router.get('/:deliveryId/tracking',
  [
    param('deliveryId').notEmpty().withMessage('Valid delivery ID is required'),
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

      const result = await deliveryPartnerService.getDeliveryTracking(req.tenantId, req.params.deliveryId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get partner performance metrics
 */
router.get('/partners/:partnerId/metrics',
  requireRole(['ADMIN', 'MANAGER']),
  [
    param('partnerId').notEmpty().withMessage('Valid partner ID is required'),
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

      const result = await deliveryPartnerService.getPartnerMetrics(req.tenantId, req.params.partnerId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
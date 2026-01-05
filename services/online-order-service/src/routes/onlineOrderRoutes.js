const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const OnlineOrderService = require('../services/OnlineOrderService');
const OrderValidationService = require('../services/OrderValidationService');
const { authenticateToken, extractTenantContext, requireRole } = require('../middleware/auth');
const { DatabaseManager } = require('@rms/shared');

const router = express.Router();
const dbManager = new DatabaseManager();
const onlineOrderService = new OnlineOrderService(dbManager);
const orderValidationService = new OrderValidationService(dbManager);

// Middleware
router.use(authenticateToken);
router.use(extractTenantContext);

/**
 * Create a new online order
 */
router.post('/',
  [
    body('outletId').isUUID().withMessage('Valid outlet ID is required'),
    body('orderType').isIn(['DELIVERY', 'PICKUP']).withMessage('Order type must be DELIVERY or PICKUP'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').isUUID().withMessage('Valid menu item ID is required'),
    body('items.*.menuItemName').notEmpty().withMessage('Menu item name is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
    body('deliveryAddress').optional().isObject().withMessage('Delivery address must be an object'),
    body('customerInfo').optional().isObject().withMessage('Customer info must be an object'),
    body('scheduledTime').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    body('promotionCode').optional().isString().withMessage('Promotion code must be a string'),
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

      // Validate order before creating
      const validation = await orderValidationService.validateOrder(req.tenantId, req.body);
      if (!validation.data.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Order Validation Failed',
          message: 'Order cannot be processed',
          details: validation.data.errors,
          warnings: validation.data.warnings,
        });
      }

      const result = await onlineOrderService.createOnlineOrder(req.tenantId, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get online order by ID
 */
router.get('/:orderId',
  [
    param('orderId').isUUID().withMessage('Valid order ID is required'),
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

      const result = await onlineOrderService.getOnlineOrder(req.tenantId, req.params.orderId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Update online order status
 */
router.patch('/:orderId/status',
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']),
  [
    param('orderId').isUUID().withMessage('Valid order ID is required'),
    body('status').isIn([
      'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 
      'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
    ]).withMessage('Invalid status'),
    body('statusDetails').optional().isObject().withMessage('Status details must be an object'),
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

      const result = await onlineOrderService.updateOrderStatus(
        req.tenantId, 
        req.params.orderId, 
        req.body.status,
        req.body.statusDetails
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get order queue for outlet
 */
router.get('/queue/:outletId',
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']),
  [
    param('outletId').isUUID().withMessage('Valid outlet ID is required'),
    query('status').optional().isIn(['all', 'PENDING', 'CONFIRMED', 'PREPARING']).withMessage('Invalid status filter'),
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

      const status = req.query.status || 'all';
      const result = await onlineOrderService.getOrderQueue(req.tenantId, req.params.outletId, status);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Process next order in queue
 */
router.post('/queue/:outletId/process-next',
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN_STAFF']),
  [
    param('outletId').isUUID().withMessage('Valid outlet ID is required'),
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

      const result = await onlineOrderService.processNextOrder(req.tenantId, req.params.outletId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Validate order before submission
 */
router.post('/validate',
  [
    body('outletId').isUUID().withMessage('Valid outlet ID is required'),
    body('orderType').isIn(['DELIVERY', 'PICKUP']).withMessage('Order type must be DELIVERY or PICKUP'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('deliveryAddress').optional().isObject().withMessage('Delivery address must be an object'),
    body('scheduledTime').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    body('promotionCode').optional().isString().withMessage('Promotion code must be a string'),
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

      const result = await orderValidationService.validateOrder(req.tenantId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Get order tracking information
 */
router.get('/:orderId/tracking',
  [
    param('orderId').isUUID().withMessage('Valid order ID is required'),
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

      const order = await onlineOrderService.getOnlineOrder(req.tenantId, req.params.orderId);
      const trackingInfo = {
        orderId: req.params.orderId,
        orderNumber: order.data.orderNumber,
        status: order.data.status,
        queuePosition: order.data.queuePosition,
        estimatedTime: order.data.estimatedTime,
        trackingInfo: order.data.trackingInfo,
      };

      res.json({
        success: true,
        data: trackingInfo,
        message: 'Order tracking information retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
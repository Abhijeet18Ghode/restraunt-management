const express = require('express');
const InventoryTransferService = require('../services/InventoryTransferService');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const inventoryTransferService = new InventoryTransferService();

// Apply authentication to all routes
router.use(auth);

// Create inventory transfer request
router.post('/requests', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const transferData = {
      ...req.body,
      requestedBy: req.user.id
    };

    // Validate required fields
    const { fromOutletId, toOutletId, items } = transferData;
    if (!fromOutletId || !toOutletId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'fromOutletId, toOutletId, and items array are required'
      });
    }

    if (fromOutletId === toOutletId) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination outlets cannot be the same'
      });
    }

    const result = await inventoryTransferService.createTransferRequest(tenantId, transferData);

    logger.info('Transfer request created', {
      tenantId,
      transferId: result.transferId,
      fromOutletId,
      toOutletId,
      itemCount: items.length
    });

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get transfer requests with filtering
router.get('/requests', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const filters = {
      outletId: req.query.outletId,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20
    };

    const result = await inventoryTransferService.getTransferHistory(tenantId, filters);

    res.json({
      success: true,
      message: 'Transfer history retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get specific transfer request
router.get('/requests/:transferId', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { transferId } = req.params;

    const transfer = await inventoryTransferService.getTransferById(tenantId, transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        error: 'Transfer request not found'
      });
    }

    res.json({
      success: true,
      message: 'Transfer request retrieved',
      data: { transfer }
    });
  } catch (error) {
    next(error);
  }
});

// Approve transfer request
router.patch('/requests/:transferId/approve', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { transferId } = req.params;
    const { approvalNotes } = req.body;

    const result = await inventoryTransferService.approveTransferRequest(
      tenantId, 
      transferId, 
      req.user.id, 
      approvalNotes
    );

    logger.info('Transfer request approved', {
      tenantId,
      transferId,
      approvedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Transfer request approved',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Complete transfer delivery
router.patch('/requests/:transferId/complete', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { transferId } = req.params;
    const { receivedItems, deliveryNotes } = req.body;

    if (!Array.isArray(receivedItems) || receivedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'receivedItems array is required'
      });
    }

    const result = await inventoryTransferService.completeTransferDelivery(
      tenantId, 
      transferId, 
      req.user.id, 
      receivedItems, 
      deliveryNotes
    );

    logger.info('Transfer delivery completed', {
      tenantId,
      transferId,
      receivedBy: req.user.id,
      discrepancies: result.validationResult.discrepancies.length
    });

    res.json({
      success: true,
      message: 'Transfer delivery completed',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Cancel transfer request
router.patch('/requests/:transferId/cancel', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { transferId } = req.params;
    const { cancellationReason } = req.body;

    if (!cancellationReason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }

    const result = await inventoryTransferService.cancelTransferRequest(
      tenantId, 
      transferId, 
      req.user.id, 
      cancellationReason
    );

    logger.info('Transfer request cancelled', {
      tenantId,
      transferId,
      cancelledBy: req.user.id,
      reason: cancellationReason
    });

    res.json({
      success: true,
      message: 'Transfer request cancelled',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get outlet inventory levels
router.get('/outlets/:outletId/inventory', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { outletId } = req.params;

    const result = await inventoryTransferService.getOutletInventoryLevels(tenantId, outletId);

    res.json({
      success: true,
      message: 'Outlet inventory levels retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get transfer analytics
router.get('/analytics', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { startDate, endDate, outletId } = req.query;

    // Get transfer history for analytics
    const transferHistory = await inventoryTransferService.getTransferHistory(tenantId, {
      startDate,
      endDate,
      outletId
    });

    // Calculate analytics
    const analytics = {
      totalTransfers: transferHistory.transfers.length,
      statusBreakdown: transferHistory.summary.byStatus,
      totalValue: transferHistory.summary.totalValue,
      averageTransferValue: transferHistory.transfers.length > 0 
        ? transferHistory.summary.totalValue / transferHistory.transfers.length 
        : 0,
      completionRate: this.calculateCompletionRate(transferHistory.transfers),
      averageDeliveryTime: this.calculateAverageDeliveryTime(transferHistory.transfers),
      topTransferRoutes: this.getTopTransferRoutes(transferHistory.transfers),
      monthlyTrends: this.calculateMonthlyTrends(transferHistory.transfers)
    };

    res.json({
      success: true,
      message: 'Transfer analytics retrieved',
      data: {
        period: { startDate, endDate },
        analytics,
        transferHistory: transferHistory.transfers.slice(0, 10) // Recent 10 transfers
      }
    });
  } catch (error) {
    next(error);
  }
});

// Bulk transfer operations
router.post('/bulk', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Operations array is required'
      });
    }

    const results = [];

    for (const operation of operations) {
      try {
        let result;

        switch (operation.type) {
          case 'create':
            result = await inventoryTransferService.createTransferRequest(tenantId, {
              ...operation.data,
              requestedBy: req.user.id
            });
            break;

          case 'approve':
            result = await inventoryTransferService.approveTransferRequest(
              tenantId, 
              operation.transferId, 
              req.user.id, 
              operation.approvalNotes
            );
            break;

          case 'cancel':
            result = await inventoryTransferService.cancelTransferRequest(
              tenantId, 
              operation.transferId, 
              req.user.id, 
              operation.cancellationReason
            );
            break;

          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }

        results.push({
          operation: operation.type,
          transferId: operation.transferId || result.transferId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          operation: operation.type,
          transferId: operation.transferId,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info('Bulk transfer operations completed', {
      tenantId,
      totalOperations: operations.length,
      successCount,
      failureCount
    });

    res.json({
      success: failureCount === 0,
      message: 'Bulk transfer operations completed',
      data: {
        totalOperations: operations.length,
        successCount,
        failureCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper methods for analytics
function calculateCompletionRate(transfers) {
  if (transfers.length === 0) return 0;
  
  const completedTransfers = transfers.filter(t => t.status === 'delivered').length;
  return (completedTransfers / transfers.length) * 100;
}

function calculateAverageDeliveryTime(transfers) {
  const completedTransfers = transfers.filter(t => 
    t.status === 'delivered' && t.approvedAt && t.receivedAt
  );

  if (completedTransfers.length === 0) return 0;

  const totalTime = completedTransfers.reduce((sum, transfer) => {
    const approvedTime = new Date(transfer.approvedAt);
    const receivedTime = new Date(transfer.receivedAt);
    return sum + (receivedTime - approvedTime);
  }, 0);

  return totalTime / completedTransfers.length / (1000 * 60 * 60); // Convert to hours
}

function getTopTransferRoutes(transfers) {
  const routes = {};

  transfers.forEach(transfer => {
    const route = `${transfer.fromOutletId} → ${transfer.toOutletId}`;
    if (!routes[route]) {
      routes[route] = { count: 0, totalValue: 0 };
    }
    routes[route].count++;
    routes[route].totalValue += transfer.totalEstimatedValue || 0;
  });

  return Object.entries(routes)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5)
    .map(([route, data]) => ({ route, ...data }));
}

function calculateMonthlyTrends(transfers) {
  const monthlyData = {};

  transfers.forEach(transfer => {
    const month = transfer.requestedAt.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, value: 0 };
    }
    monthlyData[month].count++;
    monthlyData[month].value += transfer.totalEstimatedValue || 0;
  });

  return Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));
}

module.exports = router;
const express = require('express');
const CentralizedMenuService = require('../services/CentralizedMenuService');
const { auth, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const centralizedMenuService = new CentralizedMenuService();

// Apply authentication to all routes
router.use(auth);

// Create global menu item across outlets
router.post('/global-items', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { itemData, outletIds } = req.body;

    if (!itemData || !itemData.name) {
      return res.status(400).json({
        success: false,
        error: 'Item data with name is required'
      });
    }

    const result = await centralizedMenuService.createGlobalMenuItem(tenantId, itemData, outletIds);

    logger.info('Global menu item created', {
      tenantId,
      itemName: itemData.name,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.status(201).json({
      success: true,
      message: 'Global menu item created',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Update global menu pricing
router.patch('/global-items/:globalItemId/pricing', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { globalItemId } = req.params;
    const { pricingData, outletIds } = req.body;

    if (!pricingData || typeof pricingData.price !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Valid pricing data with price is required'
      });
    }

    const result = await centralizedMenuService.updateGlobalMenuPricing(
      tenantId, 
      globalItemId, 
      pricingData, 
      outletIds
    );

    logger.info('Global menu pricing updated', {
      tenantId,
      globalItemId,
      newPrice: pricingData.price,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json({
      success: true,
      message: 'Global menu pricing updated',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Update global menu availability
router.patch('/global-items/:globalItemId/availability', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { globalItemId } = req.params;
    const { isAvailable, outletIds } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isAvailable must be a boolean value'
      });
    }

    const result = await centralizedMenuService.updateGlobalMenuAvailability(
      tenantId, 
      globalItemId, 
      isAvailable, 
      outletIds
    );

    logger.info('Global menu availability updated', {
      tenantId,
      globalItemId,
      isAvailable,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

    res.json({
      success: true,
      message: 'Global menu availability updated',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Sync menu across outlets
router.post('/sync', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { sourceOutletId, targetOutletIds } = req.body;

    if (!sourceOutletId) {
      return res.status(400).json({
        success: false,
        error: 'Source outlet ID is required'
      });
    }

    const result = await centralizedMenuService.syncMenuAcrossOutlets(
      tenantId, 
      sourceOutletId, 
      targetOutletIds
    );

    logger.info('Menu synced across outlets', {
      tenantId,
      sourceOutletId,
      targetOutlets: result.targetOutlets,
      success: result.success
    });

    res.json({
      success: true,
      message: 'Menu synced across outlets',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get global menu item status
router.get('/global-items/:globalItemId/status', authorize('admin', 'manager', 'staff'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { globalItemId } = req.params;

    const result = await centralizedMenuService.getGlobalMenuStatus(tenantId, globalItemId);

    res.json({
      success: true,
      message: 'Global menu status retrieved',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Bulk update global menu items
router.patch('/global-items/bulk', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { updates, outletIds } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates array is required'
      });
    }

    const results = [];

    for (const update of updates) {
      try {
        let result;
        
        if (update.type === 'pricing') {
          result = await centralizedMenuService.updateGlobalMenuPricing(
            tenantId, 
            update.globalItemId, 
            update.pricingData, 
            outletIds
          );
        } else if (update.type === 'availability') {
          result = await centralizedMenuService.updateGlobalMenuAvailability(
            tenantId, 
            update.globalItemId, 
            update.isAvailable, 
            outletIds
          );
        } else {
          throw new Error(`Unsupported update type: ${update.type}`);
        }

        results.push({
          globalItemId: update.globalItemId,
          type: update.type,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          globalItemId: update.globalItemId,
          type: update.type,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    logger.info('Bulk menu update completed', {
      tenantId,
      totalUpdates: updates.length,
      successCount,
      failureCount
    });

    res.json({
      success: failureCount === 0,
      message: 'Bulk menu update completed',
      data: {
        totalUpdates: updates.length,
        successCount,
        failureCount,
        results
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get menu synchronization status
router.get('/sync/status', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { tenantId } = req;
    const { outletIds } = req.query;

    // Parse outlet IDs from query parameter
    const targetOutlets = outletIds ? outletIds.split(',') : await centralizedMenuService.getAllOutletIds(tenantId);

    const syncStatus = [];

    for (const outletId of targetOutlets) {
      try {
        const menuItems = await centralizedMenuService.getOutletMenuItems(tenantId, outletId);
        const globalItems = menuItems.filter(item => item.isGlobalItem);
        const localItems = menuItems.filter(item => !item.isGlobalItem);

        syncStatus.push({
          outletId,
          success: true,
          totalItems: menuItems.length,
          globalItems: globalItems.length,
          localItems: localItems.length,
          lastSyncDate: this.getLastSyncDate(menuItems),
          syncHealth: this.calculateSyncHealth(globalItems)
        });
      } catch (error) {
        syncStatus.push({
          outletId,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Menu synchronization status retrieved',
      data: {
        outlets: syncStatus,
        summary: {
          totalOutlets: targetOutlets.length,
          healthyOutlets: syncStatus.filter(s => s.success && s.syncHealth === 'good').length,
          outOfSyncOutlets: syncStatus.filter(s => s.success && s.syncHealth !== 'good').length,
          errorOutlets: syncStatus.filter(s => !s.success).length
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Helper methods for sync status
function getLastSyncDate(menuItems) {
  const syncDates = menuItems
    .filter(item => item.syncedAt)
    .map(item => new Date(item.syncedAt))
    .sort((a, b) => b - a);
  
  return syncDates.length > 0 ? syncDates[0].toISOString() : null;
}

function calculateSyncHealth(globalItems) {
  if (globalItems.length === 0) return 'no_global_items';
  
  const recentlyUpdated = globalItems.filter(item => {
    const updatedAt = new Date(item.updatedAt);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return updatedAt > oneDayAgo;
  });

  const healthRatio = recentlyUpdated.length / globalItems.length;
  
  if (healthRatio > 0.8) return 'good';
  if (healthRatio > 0.5) return 'fair';
  return 'poor';
}

module.exports = router;
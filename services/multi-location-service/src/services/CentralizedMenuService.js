const axios = require('axios');
const logger = require('../utils/logger');

class CentralizedMenuService {
  constructor() {
    this.menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3002';
    this.inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
  }

  // Centralized menu management across outlets
  async createGlobalMenuItem(tenantId, itemData, outletIds = []) {
    try {
      logger.info('Creating global menu item', { tenantId, itemName: itemData.name, outletIds });

      const results = [];
      
      // If no specific outlets provided, apply to all outlets
      if (outletIds.length === 0) {
        outletIds = await this.getAllOutletIds(tenantId);
      }

      // Create menu item in each specified outlet
      for (const outletId of outletIds) {
        try {
          const response = await axios.post(
            `${this.menuServiceUrl}/menu/items`,
            {
              ...itemData,
              outletId,
              isGlobalItem: true,
              globalItemId: itemData.globalItemId || `global-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            },
            {
              headers: {
                'x-tenant-id': tenantId,
                'Authorization': 'Bearer mock-token'
              }
            }
          );

          results.push({
            outletId,
            success: true,
            itemId: response.data.id,
            data: response.data
          });

          logger.info('Menu item created successfully', { 
            tenantId, 
            outletId, 
            itemId: response.data.id 
          });
        } catch (error) {
          logger.error('Failed to create menu item in outlet', { 
            tenantId, 
            outletId, 
            error: error.message 
          });
          
          results.push({
            outletId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        totalOutlets: results.length,
        successCount,
        failureCount,
        results,
        globalItemId: itemData.globalItemId
      };
    } catch (error) {
      logger.error('Failed to create global menu item:', error);
      throw error;
    }
  }

  async updateGlobalMenuPricing(tenantId, globalItemId, pricingData, outletIds = []) {
    try {
      logger.info('Updating global menu pricing', { tenantId, globalItemId, outletIds });

      const results = [];
      
      if (outletIds.length === 0) {
        outletIds = await this.getAllOutletIds(tenantId);
      }

      // Update pricing in each outlet
      for (const outletId of outletIds) {
        try {
          // First, find the menu item by globalItemId
          const menuItems = await this.getOutletMenuItems(tenantId, outletId);
          const targetItem = menuItems.find(item => item.globalItemId === globalItemId);

          if (!targetItem) {
            results.push({
              outletId,
              success: false,
              error: 'Menu item not found in outlet'
            });
            continue;
          }

          // Update the pricing
          const response = await axios.patch(
            `${this.menuServiceUrl}/menu/items/${targetItem.id}`,
            {
              price: pricingData.price,
              discountPrice: pricingData.discountPrice,
              taxRate: pricingData.taxRate,
              updatedAt: new Date().toISOString(),
              updatedBy: 'central-management'
            },
            {
              headers: {
                'x-tenant-id': tenantId,
                'Authorization': 'Bearer mock-token'
              }
            }
          );

          results.push({
            outletId,
            success: true,
            itemId: targetItem.id,
            oldPrice: targetItem.price,
            newPrice: pricingData.price,
            data: response.data
          });

          logger.info('Menu pricing updated successfully', { 
            tenantId, 
            outletId, 
            itemId: targetItem.id,
            oldPrice: targetItem.price,
            newPrice: pricingData.price
          });
        } catch (error) {
          logger.error('Failed to update menu pricing in outlet', { 
            tenantId, 
            outletId, 
            error: error.message 
          });
          
          results.push({
            outletId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        totalOutlets: results.length,
        successCount,
        failureCount,
        results,
        globalItemId,
        pricingData
      };
    } catch (error) {
      logger.error('Failed to update global menu pricing:', error);
      throw error;
    }
  }

  async updateGlobalMenuAvailability(tenantId, globalItemId, isAvailable, outletIds = []) {
    try {
      logger.info('Updating global menu availability', { tenantId, globalItemId, isAvailable, outletIds });

      const results = [];
      
      if (outletIds.length === 0) {
        outletIds = await this.getAllOutletIds(tenantId);
      }

      // Update availability in each outlet
      for (const outletId of outletIds) {
        try {
          const menuItems = await this.getOutletMenuItems(tenantId, outletId);
          const targetItem = menuItems.find(item => item.globalItemId === globalItemId);

          if (!targetItem) {
            results.push({
              outletId,
              success: false,
              error: 'Menu item not found in outlet'
            });
            continue;
          }

          const response = await axios.patch(
            `${this.menuServiceUrl}/menu/items/${targetItem.id}/availability`,
            {
              isAvailable,
              updatedAt: new Date().toISOString(),
              updatedBy: 'central-management'
            },
            {
              headers: {
                'x-tenant-id': tenantId,
                'Authorization': 'Bearer mock-token'
              }
            }
          );

          results.push({
            outletId,
            success: true,
            itemId: targetItem.id,
            previousAvailability: targetItem.isAvailable,
            newAvailability: isAvailable,
            data: response.data
          });

          logger.info('Menu availability updated successfully', { 
            tenantId, 
            outletId, 
            itemId: targetItem.id,
            isAvailable
          });
        } catch (error) {
          logger.error('Failed to update menu availability in outlet', { 
            tenantId, 
            outletId, 
            error: error.message 
          });
          
          results.push({
            outletId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      return {
        success: failureCount === 0,
        totalOutlets: results.length,
        successCount,
        failureCount,
        results,
        globalItemId,
        isAvailable
      };
    } catch (error) {
      logger.error('Failed to update global menu availability:', error);
      throw error;
    }
  }

  async syncMenuAcrossOutlets(tenantId, sourceOutletId, targetOutletIds = []) {
    try {
      logger.info('Syncing menu across outlets', { tenantId, sourceOutletId, targetOutletIds });

      // Get source outlet menu
      const sourceMenu = await this.getOutletMenuItems(tenantId, sourceOutletId);
      
      if (targetOutletIds.length === 0) {
        const allOutlets = await this.getAllOutletIds(tenantId);
        targetOutletIds = allOutlets.filter(id => id !== sourceOutletId);
      }

      const results = [];

      for (const targetOutletId of targetOutletIds) {
        try {
          const syncResult = await this.syncMenuToOutlet(tenantId, sourceMenu, targetOutletId);
          results.push({
            outletId: targetOutletId,
            success: true,
            syncedItems: syncResult.syncedItems,
            skippedItems: syncResult.skippedItems
          });
        } catch (error) {
          results.push({
            outletId: targetOutletId,
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: results.every(r => r.success),
        sourceOutletId,
        targetOutlets: results.length,
        results
      };
    } catch (error) {
      logger.error('Failed to sync menu across outlets:', error);
      throw error;
    }
  }

  async getGlobalMenuStatus(tenantId, globalItemId) {
    try {
      const outletIds = await this.getAllOutletIds(tenantId);
      const status = [];

      for (const outletId of outletIds) {
        try {
          const menuItems = await this.getOutletMenuItems(tenantId, outletId);
          const item = menuItems.find(item => item.globalItemId === globalItemId);

          status.push({
            outletId,
            found: !!item,
            item: item || null,
            isAvailable: item?.isAvailable || false,
            price: item?.price || null,
            lastUpdated: item?.updatedAt || null
          });
        } catch (error) {
          status.push({
            outletId,
            found: false,
            error: error.message
          });
        }
      }

      return {
        globalItemId,
        totalOutlets: outletIds.length,
        availableInOutlets: status.filter(s => s.found && s.isAvailable).length,
        status
      };
    } catch (error) {
      logger.error('Failed to get global menu status:', error);
      throw error;
    }
  }

  // Helper methods
  async getAllOutletIds(tenantId) {
    try {
      // Mock implementation - in production, fetch from tenant service
      return ['outlet-1', 'outlet-2', 'outlet-3'];
    } catch (error) {
      logger.error('Failed to get outlet IDs:', error);
      return [];
    }
  }

  async getOutletMenuItems(tenantId, outletId) {
    try {
      const response = await axios.get(
        `${this.menuServiceUrl}/menu/items?outletId=${outletId}`,
        {
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': 'Bearer mock-token'
          }
        }
      );

      return response.data.items || [];
    } catch (error) {
      logger.error('Failed to get outlet menu items:', { tenantId, outletId, error: error.message });
      return [];
    }
  }

  async syncMenuToOutlet(tenantId, sourceMenu, targetOutletId) {
    const syncedItems = [];
    const skippedItems = [];

    for (const item of sourceMenu) {
      try {
        await axios.post(
          `${this.menuServiceUrl}/menu/items`,
          {
            ...item,
            outletId: targetOutletId,
            syncedFrom: item.outletId,
            syncedAt: new Date().toISOString()
          },
          {
            headers: {
              'x-tenant-id': tenantId,
              'Authorization': 'Bearer mock-token'
            }
          }
        );

        syncedItems.push(item.id);
      } catch (error) {
        skippedItems.push({
          itemId: item.id,
          error: error.message
        });
      }
    }

    return { syncedItems, skippedItems };
  }
}

module.exports = CentralizedMenuService;
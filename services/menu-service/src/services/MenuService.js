const { 
  MenuItemModel, 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Menu management service
 */
class MenuService {
  constructor(dbManager) {
    this.db = dbManager;
    this.menuItemModel = new MenuItemModel(dbManager);
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(tenantId, menuItemData) {
    try {
      const menuItem = await this.menuItemModel.create(tenantId, menuItemData);
      return createApiResponse(menuItem, 'Menu item created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create menu item', error.message);
    }
  }

  /**
   * Get menu item by ID
   */
  async getMenuItem(tenantId, itemId) {
    try {
      const menuItem = await this.menuItemModel.findById(tenantId, itemId);
      
      if (!menuItem) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      return createApiResponse(menuItem, 'Menu item retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get menu item', error.message);
    }
  }

  /**
   * Update menu item
   */
  async updateMenuItem(tenantId, itemId, updateData) {
    try {
      const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, updateData);
      
      if (!updatedItem) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      return createApiResponse(updatedItem, 'Menu item updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update menu item', error.message);
    }
  }

  /**
   * Delete menu item
   */
  async deleteMenuItem(tenantId, itemId) {
    try {
      const deleted = await this.menuItemModel.deleteById(tenantId, itemId);
      
      if (!deleted) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      return createApiResponse(null, 'Menu item deleted successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete menu item', error.message);
    }
  }

  /**
   * Get menu items with pagination and filtering
   */
  async getMenuItems(tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        categoryId, 
        outletId, 
        isAvailable, 
        search,
        orderBy = 'name',
        orderDirection = 'ASC'
      } = options;

      let result;

      if (search) {
        // Search by name
        result = await this.menuItemModel.searchByName(tenantId, search, { page, limit });
      } else if (outletId) {
        // Get items available for specific outlet
        result = await this.menuItemModel.getAvailableForOutlet(tenantId, outletId, { 
          page, 
          limit, 
          orderBy, 
          orderDirection 
        });
      } else if (categoryId) {
        // Get items by category
        result = await this.menuItemModel.findByCategory(tenantId, categoryId, { 
          page, 
          limit, 
          orderBy, 
          orderDirection 
        });
      } else {
        // Get all items with optional availability filter
        const conditions = {};
        if (isAvailable !== undefined) {
          conditions.is_available = isAvailable;
        }
        
        result = await this.menuItemModel.find(tenantId, conditions, { 
          page, 
          limit, 
          orderBy, 
          orderDirection 
        });
      }

      return createApiResponse(result.data, 'Menu items retrieved successfully', result.meta);
    } catch (error) {
      throw new DatabaseError('Failed to get menu items', error.message);
    }
  }

  /**
   * Update item availability
   */
  async updateItemAvailability(tenantId, itemId, isAvailable) {
    try {
      const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, { 
        is_available: isAvailable 
      });
      
      if (!updatedItem) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      return createApiResponse(
        updatedItem, 
        `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update item availability', error.message);
    }
  }

  /**
   * Update multiple items availability
   */
  async updateMultipleItemsAvailability(tenantId, itemIds, isAvailable) {
    try {
      const updatedItems = await this.menuItemModel.updateAvailability(
        tenantId, 
        itemIds, 
        isAvailable
      );

      return createApiResponse(
        updatedItems, 
        `${updatedItems.length} menu items ${isAvailable ? 'enabled' : 'disabled'} successfully`
      );
    } catch (error) {
      throw new DatabaseError('Failed to update items availability', error.message);
    }
  }

  /**
   * Update pricing for multiple items
   */
  async updatePricing(tenantId, pricingUpdates) {
    try {
      const results = [];
      
      // Process each pricing update
      for (const update of pricingUpdates) {
        const { itemId, price } = update;
        
        if (price < 0) {
          throw new ValidationError(`Invalid price for item ${itemId}: ${price}`);
        }
        
        const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, { price });
        
        if (updatedItem) {
          results.push(updatedItem);
        }
      }

      return createApiResponse(
        results, 
        `Pricing updated for ${results.length} menu items`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update pricing', error.message);
    }
  }

  /**
   * Get items with low inventory
   */
  async getItemsWithLowInventory(tenantId, outletId) {
    try {
      const items = await this.menuItemModel.getItemsWithLowInventory(tenantId, outletId);
      
      return createApiResponse(
        items, 
        'Items with low inventory retrieved successfully'
      );
    } catch (error) {
      throw new DatabaseError('Failed to get items with low inventory', error.message);
    }
  }

  /**
   * Bulk import menu items
   */
  async bulkImportItems(tenantId, menuItems) {
    try {
      const results = [];
      const errors = [];

      for (let i = 0; i < menuItems.length; i++) {
        try {
          const item = await this.menuItemModel.create(tenantId, menuItems[i]);
          results.push(item);
        } catch (error) {
          errors.push({
            index: i,
            item: menuItems[i],
            error: error.message,
          });
        }
      }

      return createApiResponse(
        {
          imported: results,
          errors: errors,
          summary: {
            total: menuItems.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        `Bulk import completed: ${results.length}/${menuItems.length} items imported`
      );
    } catch (error) {
      throw new DatabaseError('Failed to bulk import menu items', error.message);
    }
  }

  /**
   * Get menu statistics
   */
  async getMenuStatistics(tenantId, outletId = null) {
    try {
      const conditions = {};
      if (outletId) {
        // This would need to be implemented in the model to filter by outlet
        conditions.outlet_id = outletId;
      }

      const allItems = await this.menuItemModel.find(tenantId, {}, { limit: 1000 });
      const availableItems = await this.menuItemModel.find(
        tenantId, 
        { is_available: true }, 
        { limit: 1000 }
      );

      // Calculate statistics
      const stats = {
        totalItems: allItems.meta.total,
        availableItems: availableItems.meta.total,
        unavailableItems: allItems.meta.total - availableItems.meta.total,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        categoryCounts: {},
      };

      if (allItems.data.length > 0) {
        const prices = allItems.data.map(item => item.price);
        stats.averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        stats.priceRange.min = Math.min(...prices);
        stats.priceRange.max = Math.max(...prices);

        // Count items by category
        allItems.data.forEach(item => {
          const category = item.categoryId || 'Uncategorized';
          stats.categoryCounts[category] = (stats.categoryCounts[category] || 0) + 1;
        });
      }

      return createApiResponse(stats, 'Menu statistics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get menu statistics', error.message);
    }
  }
}

module.exports = MenuService;
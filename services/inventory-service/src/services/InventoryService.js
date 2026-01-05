const { 
  InventoryItemModel,
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Inventory management service
 */
class InventoryService {
  constructor(dbManager) {
    this.db = dbManager;
    this.inventoryItemModel = new InventoryItemModel(dbManager);
  }

  /**
   * Create a new inventory item
   */
  async createInventoryItem(tenantId, itemData) {
    try {
      const item = await this.inventoryItemModel.create(tenantId, itemData);
      return createApiResponse(item, 'Inventory item created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create inventory item', error.message);
    }
  }

  /**
   * Get inventory item by ID
   */
  async getInventoryItem(tenantId, itemId) {
    try {
      const item = await this.inventoryItemModel.findById(tenantId, itemId);
      
      if (!item) {
        throw new ResourceNotFoundError('Inventory item', itemId);
      }

      return createApiResponse(item, 'Inventory item retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get inventory item', error.message);
    }
  }

  /**
   * Update inventory item
   */
  async updateInventoryItem(tenantId, itemId, updateData) {
    try {
      const updatedItem = await this.inventoryItemModel.updateById(tenantId, itemId, updateData);
      
      if (!updatedItem) {
        throw new ResourceNotFoundError('Inventory item', itemId);
      }

      return createApiResponse(updatedItem, 'Inventory item updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update inventory item', error.message);
    }
  }

  /**
   * Delete inventory item
   */
  async deleteInventoryItem(tenantId, itemId) {
    try {
      const deleted = await this.inventoryItemModel.deleteById(tenantId, itemId);
      
      if (!deleted) {
        throw new ResourceNotFoundError('Inventory item', itemId);
      }

      return createApiResponse(null, 'Inventory item deleted successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete inventory item', error.message);
    }
  }

  /**
   * Get inventory items with pagination and filtering
   */
  async getInventoryItems(tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        outletId, 
        category, 
        lowStock = false,
        search,
        orderBy = 'name',
        orderDirection = 'ASC'
      } = options;

      let result;

      if (lowStock) {
        // Get items with low stock
        result = await this.inventoryItemModel.getLowStockItems(tenantId, outletId, { page, limit });
      } else if (search) {
        // Search by name
        result = await this.inventoryItemModel.searchByName(tenantId, search, { 
          page, 
          limit, 
          outletId 
        });
      } else {
        // Get all items with optional filters
        const conditions = {};
        if (outletId) conditions.outlet_id = outletId;
        if (category) conditions.category = category;
        
        result = await this.inventoryItemModel.find(tenantId, conditions, { 
          page, 
          limit, 
          orderBy, 
          orderDirection 
        });
      }

      return createApiResponse(result.data, 'Inventory items retrieved successfully', result.meta);
    } catch (error) {
      throw new DatabaseError('Failed to get inventory items', error.message);
    }
  }

  /**
   * Update stock level
   */
  async updateStock(tenantId, stockUpdate) {
    const { itemId, quantity, type, reason, reference } = stockUpdate;

    try {
      if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
        throw new ValidationError('Invalid stock update type. Must be IN, OUT, or ADJUSTMENT');
      }

      const item = await this.inventoryItemModel.findById(tenantId, itemId);
      if (!item) {
        throw new ResourceNotFoundError('Inventory item', itemId);
      }

      let newStock;
      switch (type) {
        case 'IN':
          newStock = item.currentStock + Math.abs(quantity);
          break;
        case 'OUT':
          newStock = item.currentStock - Math.abs(quantity);
          break;
        case 'ADJUSTMENT':
          newStock = quantity; // Direct stock level adjustment
          break;
      }

      // Ensure stock doesn't go negative
      if (newStock < 0) {
        throw new ValidationError(`Insufficient stock. Current: ${item.currentStock}, Requested: ${quantity}`);
      }

      // Update the stock
      const updatedItem = await this.inventoryItemModel.updateById(tenantId, itemId, {
        currentStock: newStock,
        lastRestocked: type === 'IN' ? new Date() : item.lastRestocked,
      });

      // Log the stock movement (in a real system, this would go to a stock_movements table)
      const stockMovement = {
        itemId,
        type,
        quantity: type === 'OUT' ? -Math.abs(quantity) : Math.abs(quantity),
        previousStock: item.currentStock,
        newStock,
        reason,
        reference,
        timestamp: new Date(),
      };

      return createApiResponse(
        {
          item: updatedItem,
          movement: stockMovement,
        },
        `Stock ${type.toLowerCase()} recorded successfully`
      );
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update stock', error.message);
    }
  }

  /**
   * Check for low stock items and generate alerts
   */
  async checkLowStock(tenantId, outletId = null) {
    try {
      const lowStockItems = await this.inventoryItemModel.getLowStockItems(tenantId, outletId);
      
      const alerts = lowStockItems.map(item => ({
        itemId: item.id,
        itemName: item.name,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        outletId: item.outletId,
        severity: item.currentStock === 0 ? 'CRITICAL' : 'WARNING',
        message: item.currentStock === 0 
          ? `${item.name} is out of stock`
          : `${item.name} is running low (${item.currentStock} ${item.unit} remaining)`,
        createdAt: new Date(),
      }));

      return createApiResponse(
        alerts,
        `Found ${alerts.length} low stock alerts`
      );
    } catch (error) {
      throw new DatabaseError('Failed to check low stock', error.message);
    }
  }

  /**
   * Transfer stock between outlets
   */
  async transferStock(tenantId, transferData) {
    const { itemName, fromOutletId, toOutletId, quantity, reason } = transferData;

    try {
      if (fromOutletId === toOutletId) {
        throw new ValidationError('Cannot transfer stock to the same outlet');
      }

      if (quantity <= 0) {
        throw new ValidationError('Transfer quantity must be positive');
      }

      // Find items in both outlets
      const fromItem = await this.inventoryItemModel.findByNameAndOutlet(tenantId, itemName, fromOutletId);
      const toItem = await this.inventoryItemModel.findByNameAndOutlet(tenantId, itemName, toOutletId);

      if (!fromItem) {
        throw new ResourceNotFoundError(`Inventory item '${itemName}' in source outlet`, fromOutletId);
      }

      if (fromItem.currentStock < quantity) {
        throw new ValidationError(`Insufficient stock in source outlet. Available: ${fromItem.currentStock}`);
      }

      // Update source outlet (decrease stock)
      const updatedFromItem = await this.inventoryItemModel.updateById(tenantId, fromItem.id, {
        currentStock: fromItem.currentStock - quantity,
      });

      let updatedToItem;
      if (toItem) {
        // Update destination outlet (increase stock)
        updatedToItem = await this.inventoryItemModel.updateById(tenantId, toItem.id, {
          currentStock: toItem.currentStock + quantity,
          lastRestocked: new Date(),
        });
      } else {
        // Create new item in destination outlet
        updatedToItem = await this.inventoryItemModel.create(tenantId, {
          ...fromItem,
          id: undefined, // Let database generate new ID
          outletId: toOutletId,
          currentStock: quantity,
          lastRestocked: new Date(),
        });
      }

      const transfer = {
        itemName,
        fromOutletId,
        toOutletId,
        quantity,
        reason,
        fromItem: updatedFromItem,
        toItem: updatedToItem,
        timestamp: new Date(),
      };

      return createApiResponse(
        transfer,
        `Successfully transferred ${quantity} ${fromItem.unit} of ${itemName}`
      );
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to transfer stock', error.message);
    }
  }

  /**
   * Get inventory statistics
   */
  async getInventoryStatistics(tenantId, outletId = null) {
    try {
      const conditions = {};
      if (outletId) conditions.outlet_id = outletId;

      const allItems = await this.inventoryItemModel.find(tenantId, conditions, { limit: 1000 });
      const lowStockItems = await this.inventoryItemModel.getLowStockItems(tenantId, outletId);

      // Calculate statistics
      const stats = {
        totalItems: allItems.meta.total,
        lowStockItems: lowStockItems.length,
        outOfStockItems: allItems.data.filter(item => item.currentStock === 0).length,
        totalValue: 0,
        categoryBreakdown: {},
        stockLevels: {
          critical: 0, // 0 stock
          low: 0,      // below minimum
          normal: 0,   // above minimum
        },
      };

      // Calculate detailed statistics
      allItems.data.forEach(item => {
        // Total inventory value
        stats.totalValue += (item.currentStock * (item.unitCost || 0));

        // Category breakdown
        const category = item.category || 'Uncategorized';
        if (!stats.categoryBreakdown[category]) {
          stats.categoryBreakdown[category] = {
            count: 0,
            totalValue: 0,
            lowStockCount: 0,
          };
        }
        stats.categoryBreakdown[category].count++;
        stats.categoryBreakdown[category].totalValue += (item.currentStock * (item.unitCost || 0));

        // Stock level categorization
        if (item.currentStock === 0) {
          stats.stockLevels.critical++;
          stats.categoryBreakdown[category].lowStockCount++;
        } else if (item.currentStock <= item.minimumStock) {
          stats.stockLevels.low++;
          stats.categoryBreakdown[category].lowStockCount++;
        } else {
          stats.stockLevels.normal++;
        }
      });

      return createApiResponse(stats, 'Inventory statistics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get inventory statistics', error.message);
    }
  }

  /**
   * Bulk import inventory items
   */
  async bulkImportItems(tenantId, inventoryItems) {
    try {
      const results = [];
      const errors = [];

      for (let i = 0; i < inventoryItems.length; i++) {
        try {
          const item = await this.inventoryItemModel.create(tenantId, inventoryItems[i]);
          results.push(item);
        } catch (error) {
          errors.push({
            index: i,
            item: inventoryItems[i],
            error: error.message,
          });
        }
      }

      return createApiResponse(
        {
          imported: results,
          errors: errors,
          summary: {
            total: inventoryItems.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        `Bulk import completed: ${results.length}/${inventoryItems.length} items imported`
      );
    } catch (error) {
      throw new DatabaseError('Failed to bulk import inventory items', error.message);
    }
  }
}

module.exports = InventoryService;
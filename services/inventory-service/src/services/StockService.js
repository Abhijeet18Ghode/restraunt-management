const { 
  InventoryItemModel,
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Stock operations service
 */
class StockService {
  constructor(dbManager) {
    this.db = dbManager;
    this.inventoryItemModel = new InventoryItemModel(dbManager);
  }

  /**
   * Process stock receipt from supplier
   */
  async processStockReceipt(tenantId, receiptData) {
    const { 
      supplierId, 
      outletId, 
      items, 
      receiptNumber, 
      deliveryDate,
      notes 
    } = receiptData;

    try {
      if (!items || items.length === 0) {
        throw new ValidationError('Receipt must contain at least one item');
      }

      const processedItems = [];
      const errors = [];

      for (const receiptItem of items) {
        try {
          const { itemName, quantityReceived, unitCost, expiryDate } = receiptItem;

          if (quantityReceived <= 0) {
            throw new ValidationError(`Invalid quantity for ${itemName}: ${quantityReceived}`);
          }

          // Find existing inventory item or create new one
          let inventoryItem = await this.inventoryItemModel.findByNameAndOutlet(
            tenantId, 
            itemName, 
            outletId
          );

          if (inventoryItem) {
            // Update existing item
            const newStock = inventoryItem.currentStock + quantityReceived;
            const newUnitCost = unitCost || inventoryItem.unitCost;

            inventoryItem = await this.inventoryItemModel.updateById(tenantId, inventoryItem.id, {
              currentStock: newStock,
              unitCost: newUnitCost,
              lastRestocked: new Date(),
              supplierId: supplierId || inventoryItem.supplierId,
            });
          } else {
            // Create new inventory item
            inventoryItem = await this.inventoryItemModel.create(tenantId, {
              name: itemName,
              outletId,
              currentStock: quantityReceived,
              minimumStock: 10, // Default minimum stock
              unitCost: unitCost || 0,
              unit: 'piece', // Default unit
              category: 'General',
              supplierId,
              lastRestocked: new Date(),
            });
          }

          processedItems.push({
            inventoryItem,
            quantityReceived,
            unitCost,
            expiryDate,
            totalValue: quantityReceived * (unitCost || 0),
          });

        } catch (error) {
          errors.push({
            itemName: receiptItem.itemName,
            error: error.message,
          });
        }
      }

      const receipt = {
        receiptNumber,
        supplierId,
        outletId,
        deliveryDate: deliveryDate || new Date(),
        processedItems,
        errors,
        totalItems: processedItems.length,
        totalValue: processedItems.reduce((sum, item) => sum + item.totalValue, 0),
        notes,
        processedAt: new Date(),
      };

      return createApiResponse(
        receipt,
        `Stock receipt processed: ${processedItems.length}/${items.length} items successful`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to process stock receipt', error.message);
    }
  }

  /**
   * Process recipe-based consumption
   */
  async processRecipeConsumption(tenantId, consumptionData) {
    const { outletId, recipeId, recipeName, ingredients, quantity = 1 } = consumptionData;

    try {
      if (!ingredients || ingredients.length === 0) {
        throw new ValidationError('Recipe must contain at least one ingredient');
      }

      const consumedItems = [];
      const insufficientItems = [];

      // Check availability first
      for (const ingredient of ingredients) {
        const { name, quantityPerUnit } = ingredient;
        const totalRequired = quantityPerUnit * quantity;

        const inventoryItem = await this.inventoryItemModel.findByNameAndOutlet(
          tenantId, 
          name, 
          outletId
        );

        if (!inventoryItem) {
          insufficientItems.push({
            name,
            required: totalRequired,
            available: 0,
            shortage: totalRequired,
          });
        } else if (inventoryItem.currentStock < totalRequired) {
          insufficientItems.push({
            name,
            required: totalRequired,
            available: inventoryItem.currentStock,
            shortage: totalRequired - inventoryItem.currentStock,
          });
        }
      }

      // If any ingredients are insufficient, return error
      if (insufficientItems.length > 0) {
        return createApiResponse(
          {
            success: false,
            insufficientItems,
            recipeId,
            recipeName,
            quantity,
          },
          'Insufficient ingredients for recipe consumption'
        );
      }

      // Process consumption
      for (const ingredient of ingredients) {
        const { name, quantityPerUnit } = ingredient;
        const totalRequired = quantityPerUnit * quantity;

        const inventoryItem = await this.inventoryItemModel.findByNameAndOutlet(
          tenantId, 
          name, 
          outletId
        );

        const newStock = inventoryItem.currentStock - totalRequired;
        
        const updatedItem = await this.inventoryItemModel.updateById(tenantId, inventoryItem.id, {
          currentStock: newStock,
        });

        consumedItems.push({
          inventoryItem: updatedItem,
          consumed: totalRequired,
          previousStock: inventoryItem.currentStock,
          newStock,
        });
      }

      const consumption = {
        recipeId,
        recipeName,
        outletId,
        quantity,
        consumedItems,
        totalIngredients: consumedItems.length,
        processedAt: new Date(),
      };

      return createApiResponse(
        consumption,
        `Recipe consumption processed: ${consumedItems.length} ingredients updated`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to process recipe consumption', error.message);
    }
  }

  /**
   * Generate purchase order based on low stock
   */
  async generatePurchaseOrder(tenantId, orderData) {
    const { outletId, supplierId, items, notes } = orderData;

    try {
      if (!items || items.length === 0) {
        throw new ValidationError('Purchase order must contain at least one item');
      }

      const orderItems = [];
      let totalValue = 0;

      for (const item of items) {
        const { itemName, quantityOrdered, estimatedUnitCost } = item;

        if (quantityOrdered <= 0) {
          throw new ValidationError(`Invalid quantity for ${itemName}: ${quantityOrdered}`);
        }

        const itemTotal = quantityOrdered * (estimatedUnitCost || 0);
        totalValue += itemTotal;

        orderItems.push({
          itemName,
          quantityOrdered,
          estimatedUnitCost: estimatedUnitCost || 0,
          totalCost: itemTotal,
        });
      }

      const purchaseOrder = {
        orderNumber: `PO-${Date.now()}`, // Simple order number generation
        supplierId,
        outletId,
        items: orderItems,
        totalItems: orderItems.length,
        totalValue,
        status: 'PENDING',
        notes,
        createdAt: new Date(),
        expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };

      // In a real implementation, this would be saved to a purchase_orders table
      return createApiResponse(
        purchaseOrder,
        `Purchase order generated with ${orderItems.length} items`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to generate purchase order', error.message);
    }
  }

  /**
   * Get stock movement history
   */
  async getStockMovements(tenantId, options = {}) {
    try {
      const { 
        itemId, 
        outletId, 
        startDate, 
        endDate, 
        type,
        page = 1, 
        limit = 20 
      } = options;

      // In a real implementation, this would query a stock_movements table
      // For now, return mock movement data
      const movements = [];
      const totalMovements = Math.floor(Math.random() * 100) + 20;

      for (let i = 0; i < Math.min(limit, totalMovements); i++) {
        movements.push({
          id: `mov_${Date.now()}_${i}`,
          itemId: itemId || `item_${Math.floor(Math.random() * 100)}`,
          itemName: `Item ${i + 1}`,
          outletId: outletId || `outlet_${Math.floor(Math.random() * 5)}`,
          type: type || ['IN', 'OUT', 'ADJUSTMENT'][Math.floor(Math.random() * 3)],
          quantity: Math.floor(Math.random() * 100) + 1,
          previousStock: Math.floor(Math.random() * 500) + 50,
          newStock: Math.floor(Math.random() * 500) + 50,
          reason: 'Stock movement',
          reference: `REF-${Date.now()}`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        });
      }

      const meta = {
        total: totalMovements,
        page,
        limit,
        totalPages: Math.ceil(totalMovements / limit),
        hasNext: page < Math.ceil(totalMovements / limit),
        hasPrev: page > 1,
      };

      return createApiResponse(movements, 'Stock movements retrieved successfully', meta);
    } catch (error) {
      throw new DatabaseError('Failed to get stock movements', error.message);
    }
  }

  /**
   * Validate stock levels for order fulfillment
   */
  async validateStockForOrder(tenantId, orderData) {
    const { outletId, items } = orderData;

    try {
      const validationResults = [];
      let canFulfill = true;

      for (const orderItem of items) {
        const { itemName, quantityRequired } = orderItem;

        const inventoryItem = await this.inventoryItemModel.findByNameAndOutlet(
          tenantId, 
          itemName, 
          outletId
        );

        const validation = {
          itemName,
          quantityRequired,
          available: inventoryItem ? inventoryItem.currentStock : 0,
          canFulfill: inventoryItem && inventoryItem.currentStock >= quantityRequired,
          shortage: inventoryItem 
            ? Math.max(0, quantityRequired - inventoryItem.currentStock)
            : quantityRequired,
        };

        if (!validation.canFulfill) {
          canFulfill = false;
        }

        validationResults.push(validation);
      }

      return createApiResponse(
        {
          canFulfill,
          items: validationResults,
          totalItems: validationResults.length,
          availableItems: validationResults.filter(item => item.canFulfill).length,
          unavailableItems: validationResults.filter(item => !item.canFulfill).length,
        },
        canFulfill 
          ? 'All items available for order fulfillment'
          : 'Some items have insufficient stock'
      );
    } catch (error) {
      throw new DatabaseError('Failed to validate stock for order', error.message);
    }
  }
}

module.exports = StockService;
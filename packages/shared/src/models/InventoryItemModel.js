const BaseModel = require('./BaseModel');
const { ValidationError, DatabaseError } = require('../errors');
const { INVENTORY_UNITS } = require('../constants');

/**
 * InventoryItem model for managing restaurant inventory
 */
class InventoryItemModel extends BaseModel {
  constructor(dbManager) {
    super(dbManager, 'inventory_items');
  }

  /**
   * Create a new inventory item
   */
  async create(tenantId, inventoryData) {
    const { 
      outletId, 
      name, 
      category, 
      unit, 
      currentStock = 0, 
      minimumStock = 0, 
      maximumStock = null,
      unitCost = 0,
      supplierId = null
    } = inventoryData;

    // Validate required fields
    if (!outletId || !name || !unit) {
      throw new ValidationError('Outlet ID, name, and unit are required');
    }

    if (!Object.values(INVENTORY_UNITS).includes(unit)) {
      throw new ValidationError('Invalid inventory unit');
    }

    if (currentStock < 0 || minimumStock < 0 || (maximumStock !== null && maximumStock < 0)) {
      throw new ValidationError('Stock quantities cannot be negative');
    }

    if (maximumStock !== null && maximumStock < minimumStock) {
      throw new ValidationError('Maximum stock cannot be less than minimum stock');
    }

    const data = {
      outlet_id: outletId,
      name,
      category,
      unit,
      current_stock: currentStock,
      minimum_stock: minimumStock,
      maximum_stock: maximumStock,
      unit_cost: unitCost,
      supplier_id: supplierId,
      last_restocked: currentStock > 0 ? new Date().toISOString() : null,
    };

    return await super.create(tenantId, data);
  }

  /**
   * Update stock level
   */
  async updateStock(tenantId, itemId, quantity, operation = 'SET', reason = '') {
    try {
      const item = await this.findById(tenantId, itemId);
      if (!item) {
        throw new ValidationError('Inventory item not found');
      }

      let newStock;
      switch (operation) {
        case 'ADD':
          newStock = item.currentStock + quantity;
          break;
        case 'SUBTRACT':
          newStock = item.currentStock - quantity;
          break;
        case 'SET':
          newStock = quantity;
          break;
        default:
          throw new ValidationError('Invalid stock operation. Use ADD, SUBTRACT, or SET');
      }

      if (newStock < 0) {
        throw new ValidationError('Stock cannot be negative');
      }

      const updateData = {
        current_stock: newStock,
      };

      // Update last_restocked if stock is being added
      if (operation === 'ADD' && quantity > 0) {
        updateData.last_restocked = new Date().toISOString();
      }

      const updatedItem = await this.updateById(tenantId, itemId, updateData);

      // Log stock movement (could be implemented as a separate table)
      await this.logStockMovement(tenantId, itemId, operation, quantity, item.currentStock, newStock, reason);

      return updatedItem;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update stock', error.message);
    }
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(tenantId, outletId = null) {
    try {
      let whereClause = 'WHERE current_stock <= minimum_stock';
      let values = [];
      let paramIndex = 1;

      if (outletId) {
        whereClause += ` AND outlet_id = $${paramIndex++}`;
        values.push(outletId);
      }

      const query = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY (current_stock / NULLIF(minimum_stock, 0)) ASC, name ASC
      `;

      const result = await this.db.query(tenantId, query, values);
      return result.rows.map(row => this.mapRowToObject(row));
    } catch (error) {
      throw new DatabaseError('Failed to get low stock items', error.message);
    }
  }

  /**
   * Get items by category
   */
  async findByCategory(tenantId, category, outletId = null, options = {}) {
    const conditions = { category };
    if (outletId) {
      conditions.outlet_id = outletId;
    }
    return await this.find(tenantId, conditions, options);
  }

  /**
   * Get items by outlet
   */
  async findByOutlet(tenantId, outletId, options = {}) {
    return await this.find(tenantId, { outlet_id: outletId }, options);
  }

  /**
   * Search items by name
   */
  async searchByName(tenantId, searchTerm, outletId = null, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE name ILIKE $1';
      let values = [`%${searchTerm}%`];
      let paramIndex = 2;

      if (outletId) {
        whereClause += ` AND outlet_id = $${paramIndex++}`;
        values.push(outletId);
      }

      const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
      const dataQuery = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY name ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        this.db.query(tenantId, countQuery, values.slice(0, -2)),
        this.db.query(tenantId, dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const records = dataResult.rows.map(row => this.mapRowToObject(row));

      return {
        data: records,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new DatabaseError('Failed to search inventory items', error.message);
    }
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(tenantId, outletId = null) {
    try {
      let whereClause = '';
      let values = [];

      if (outletId) {
        whereClause = 'WHERE outlet_id = $1';
        values.push(outletId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_items,
          SUM(current_stock * unit_cost) as total_value,
          SUM(current_stock) as total_quantity,
          AVG(unit_cost) as average_unit_cost,
          COUNT(CASE WHEN current_stock <= minimum_stock THEN 1 END) as low_stock_items
        FROM ${this.tableName} 
        ${whereClause}
      `;

      const result = await this.db.query(tenantId, query, values);
      const row = result.rows[0];

      return {
        totalItems: parseInt(row.total_items) || 0,
        totalValue: parseFloat(row.total_value) || 0,
        totalQuantity: parseFloat(row.total_quantity) || 0,
        averageUnitCost: parseFloat(row.average_unit_cost) || 0,
        lowStockItems: parseInt(row.low_stock_items) || 0,
      };
    } catch (error) {
      throw new DatabaseError('Failed to get inventory valuation', error.message);
    }
  }

  /**
   * Check if sufficient stock is available
   */
  async checkStockAvailability(tenantId, itemId, requiredQuantity) {
    const item = await this.findById(tenantId, itemId);
    if (!item) {
      return { available: false, reason: 'Item not found' };
    }

    if (item.currentStock >= requiredQuantity) {
      return { available: true, currentStock: item.currentStock };
    }

    return { 
      available: false, 
      reason: 'Insufficient stock',
      currentStock: item.currentStock,
      required: requiredQuantity,
      shortage: requiredQuantity - item.currentStock
    };
  }

  /**
   * Log stock movement (placeholder for audit trail)
   */
  async logStockMovement(tenantId, itemId, operation, quantity, previousStock, newStock, reason) {
    // This could be implemented as a separate stock_movements table
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Stock Movement: Item ${itemId}, ${operation} ${quantity}, ${previousStock} -> ${newStock}, Reason: ${reason}`);
    }
  }

  /**
   * Map database row to object
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    const obj = super.mapRowToObject(row);
    
    // Convert numeric fields
    if (obj.currentStock) obj.currentStock = parseFloat(obj.currentStock);
    if (obj.minimumStock) obj.minimumStock = parseFloat(obj.minimumStock);
    if (obj.maximumStock) obj.maximumStock = parseFloat(obj.maximumStock);
    if (obj.unitCost) obj.unitCost = parseFloat(obj.unitCost);
    
    return obj;
  }
}

module.exports = InventoryItemModel;
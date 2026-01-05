const BaseModel = require('./BaseModel');
const { ValidationError, DatabaseError } = require('../errors');

/**
 * MenuItem model for managing restaurant menu items
 */
class MenuItemModel extends BaseModel {
  constructor(dbManager) {
    super(dbManager, 'menu_items');
  }

  /**
   * Create a new menu item
   */
  async create(tenantId, menuItemData) {
    const { 
      categoryId, 
      name, 
      description, 
      price, 
      preparationTime = 0, 
      ingredients = [], 
      isAvailable = true,
      outletIds = []
    } = menuItemData;

    // Validate required fields
    if (!name || price === undefined || price === null) {
      throw new ValidationError('Name and price are required');
    }

    if (price < 0) {
      throw new ValidationError('Price cannot be negative');
    }

    const data = {
      category_id: categoryId,
      name,
      description,
      price,
      preparation_time: preparationTime,
      ingredients: JSON.stringify(ingredients),
      is_available: isAvailable,
      outlet_ids: JSON.stringify(outletIds),
    };

    return await super.create(tenantId, data);
  }

  /**
   * Update menu item
   */
  async updateById(tenantId, id, updateData) {
    const data = { ...updateData };
    
    // Validate price if provided
    if (data.price !== undefined && data.price < 0) {
      throw new ValidationError('Price cannot be negative');
    }

    // Convert objects to JSON strings and handle field mapping
    if (data.categoryId !== undefined) {
      data.category_id = data.categoryId;
      delete data.categoryId;
    }
    if (data.preparationTime !== undefined) {
      data.preparation_time = data.preparationTime;
      delete data.preparationTime;
    }
    if (data.ingredients) {
      data.ingredients = JSON.stringify(data.ingredients);
    }
    if (data.isAvailable !== undefined) {
      data.is_available = data.isAvailable;
      delete data.isAvailable;
    }
    if (data.outletIds) {
      data.outlet_ids = JSON.stringify(data.outletIds);
      delete data.outletIds;
    }

    return await super.updateById(tenantId, id, data);
  }

  /**
   * Get menu items by category
   */
  async findByCategory(tenantId, categoryId, options = {}) {
    return await this.find(tenantId, { category_id: categoryId, is_available: true }, options);
  }

  /**
   * Get available menu items for outlet
   */
  async getAvailableForOutlet(tenantId, outletId, options = {}) {
    try {
      const { page = 1, limit = 20, orderBy = 'name', orderDirection = 'ASC' } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE is_available = true 
        AND (outlet_ids = '[]' OR outlet_ids::jsonb ? $1)
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) FROM ${this.tableName} 
        WHERE is_available = true 
        AND (outlet_ids = '[]' OR outlet_ids::jsonb ? $1)
      `;

      const [countResult, dataResult] = await Promise.all([
        this.db.query(tenantId, countQuery, [outletId]),
        this.db.query(tenantId, query, [outletId, limit, offset])
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
      throw new DatabaseError('Failed to get available menu items for outlet', error.message);
    }
  }

  /**
   * Update availability for multiple items
   */
  async updateAvailability(tenantId, itemIds, isAvailable) {
    try {
      const placeholders = itemIds.map((_, index) => `$${index + 2}`).join(', ');
      const query = `
        UPDATE ${this.tableName} 
        SET is_available = $1, updated_at = NOW()
        WHERE id IN (${placeholders})
        RETURNING *
      `;

      const values = [isAvailable, ...itemIds];
      const result = await this.db.query(tenantId, query, values);
      
      return result.rows.map(row => this.mapRowToObject(row));
    } catch (error) {
      throw new DatabaseError('Failed to update menu item availability', error.message);
    }
  }

  /**
   * Search menu items by name
   */
  async searchByName(tenantId, searchTerm, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT * FROM ${this.tableName} 
        WHERE name ILIKE $1 AND is_available = true
        ORDER BY name ASC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) FROM ${this.tableName} 
        WHERE name ILIKE $1 AND is_available = true
      `;

      const searchPattern = `%${searchTerm}%`;
      const [countResult, dataResult] = await Promise.all([
        this.db.query(tenantId, countQuery, [searchPattern]),
        this.db.query(tenantId, query, [searchPattern, limit, offset])
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
      throw new DatabaseError('Failed to search menu items', error.message);
    }
  }

  /**
   * Get menu items with low inventory
   */
  async getItemsWithLowInventory(tenantId, outletId) {
    try {
      const query = `
        SELECT mi.*, ii.current_stock, ii.minimum_stock
        FROM ${this.tableName} mi
        JOIN menu_items_ingredients mii ON mi.id = mii.menu_item_id
        JOIN inventory_items ii ON mii.ingredient_name = ii.name
        WHERE ii.outlet_id = $1 
        AND ii.current_stock <= ii.minimum_stock
        AND mi.is_available = true
        GROUP BY mi.id, ii.current_stock, ii.minimum_stock
      `;

      const result = await this.db.query(tenantId, query, [outletId]);
      return result.rows.map(row => this.mapRowToObject(row));
    } catch (error) {
      // If the join fails (tables don't exist yet), return empty array
      return [];
    }
  }

  /**
   * Map database row to object
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    const obj = super.mapRowToObject(row);
    
    // Parse JSON fields
    if (obj.ingredients && typeof obj.ingredients === 'string') {
      try {
        obj.ingredients = JSON.parse(obj.ingredients);
      } catch (e) {
        obj.ingredients = [];
      }
    }
    if (obj.outletIds && typeof obj.outletIds === 'string') {
      try {
        obj.outletIds = JSON.parse(obj.outletIds);
      } catch (e) {
        obj.outletIds = [];
      }
    }
    
    return obj;
  }
}

module.exports = MenuItemModel;
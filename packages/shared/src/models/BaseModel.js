const { generateId } = require('../utils');
const { ValidationError, DatabaseError } = require('../errors');

/**
 * Base model class with common functionality
 */
class BaseModel {
  constructor(dbManager, tableName) {
    this.db = dbManager;
    this.tableName = tableName;
  }

  /**
   * Create a new record
   */
  async create(tenantId, data) {
    try {
      const id = generateId();
      const now = new Date().toISOString();
      
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      // Add standard fields
      fields.unshift('id');
      values.unshift(id);
      
      if (!fields.includes('created_at')) {
        fields.push('created_at');
        values.push(now);
      }
      
      if (!fields.includes('updated_at')) {
        fields.push('updated_at');
        values.push(now);
      }

      const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
      const fieldNames = fields.join(', ');

      const query = `
        INSERT INTO ${this.tableName} (${fieldNames})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await this.db.query(tenantId, query, values);
      return this.mapRowToObject(result.rows[0]);
    } catch (error) {
      throw new DatabaseError(`Failed to create ${this.tableName}`, error.message);
    }
  }

  /**
   * Find record by ID
   */
  async findById(tenantId, id) {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const result = await this.db.query(tenantId, query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToObject(result.rows[0]);
    } catch (error) {
      throw new DatabaseError(`Failed to find ${this.tableName}`, error.message);
    }
  }

  /**
   * Update record by ID
   */
  async updateById(tenantId, id, data) {
    try {
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      if (fields.length === 0) {
        throw new ValidationError('No fields to update');
      }

      // Add updated_at
      fields.push('updated_at');
      values.push(new Date().toISOString());
      values.push(id);

      const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE ${this.tableName} 
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `;

      const result = await this.db.query(tenantId, query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToObject(result.rows[0]);
    } catch (error) {
      throw new DatabaseError(`Failed to update ${this.tableName}`, error.message);
    }
  }

  /**
   * Delete record by ID (soft delete if has is_active field)
   */
  async deleteById(tenantId, id) {
    try {
      // Check if table has is_active field for soft delete
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'is_active'
      `;
      const checkResult = await this.db.query(tenantId, checkQuery, [this.tableName]);
      
      let query;
      let values;
      
      if (checkResult.rows.length > 0) {
        // Soft delete
        query = `
          UPDATE ${this.tableName} 
          SET is_active = false, updated_at = $1
          WHERE id = $2
          RETURNING *
        `;
        values = [new Date().toISOString(), id];
      } else {
        // Hard delete
        query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
        values = [id];
      }

      const result = await this.db.query(tenantId, query, values);
      return result.rows.length > 0;
    } catch (error) {
      throw new DatabaseError(`Failed to delete ${this.tableName}`, error.message);
    }
  }

  /**
   * Find records with conditions
   */
  async find(tenantId, conditions = {}, options = {}) {
    try {
      const { page = 1, limit = 20, orderBy = 'created_at', orderDirection = 'DESC' } = options;
      const offset = (page - 1) * limit;

      let whereClause = '';
      let values = [];
      let paramIndex = 1;

      if (Object.keys(conditions).length > 0) {
        const conditionParts = [];
        for (const [field, value] of Object.entries(conditions)) {
          if (value !== undefined && value !== null) {
            conditionParts.push(`${field} = $${paramIndex++}`);
            values.push(value);
          }
        }
        if (conditionParts.length > 0) {
          whereClause = `WHERE ${conditionParts.join(' AND ')}`;
        }
      }

      // Count query
      const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
      const countResult = await this.db.query(tenantId, countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      values.push(limit, offset);
      const dataQuery = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await this.db.query(tenantId, dataQuery, values);
      const records = result.rows.map(row => this.mapRowToObject(row));

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
      throw new DatabaseError(`Failed to find ${this.tableName}`, error.message);
    }
  }

  /**
   * Map database row to object (override in subclasses)
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    // Convert snake_case to camelCase
    const obj = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      obj[camelKey] = value;
    }
    return obj;
  }

  /**
   * Map object to database row (override in subclasses)
   */
  mapObjectToRow(obj) {
    if (!obj) return null;
    
    // Convert camelCase to snake_case
    const row = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      row[snakeKey] = value;
    }
    return row;
  }
}

module.exports = BaseModel;
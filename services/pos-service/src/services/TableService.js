const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Table management service
 */
class TableService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Create a new table
   */
  async createTable(tenantId, tableData) {
    const { 
      outletId, 
      tableNumber, 
      capacity, 
      section,
      isActive = true 
    } = tableData;

    try {
      // Validate required fields
      if (!outletId || !tableNumber || !capacity) {
        throw new ValidationError('Outlet ID, table number, and capacity are required');
      }

      if (capacity < 1) {
        throw new ValidationError('Table capacity must be at least 1');
      }

      const query = `
        INSERT INTO tables (
          outlet_id, table_number, capacity, section, 
          status, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        outletId,
        tableNumber,
        capacity,
        section || null,
        'AVAILABLE',
        isActive,
      ];

      const result = await this.db.query(tenantId, query, values);
      const table = result.rows[0];

      return createApiResponse(table, 'Table created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create table', error.message);
    }
  }

  /**
   * Get table by ID
   */
  async getTable(tenantId, tableId) {
    try {
      const query = 'SELECT * FROM tables WHERE id = $1';
      const result = await this.db.query(tenantId, query, [tableId]);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Table', tableId);
      }

      const table = result.rows[0];
      return createApiResponse(table, 'Table retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get table', error.message);
    }
  }

  /**
   * Update table
   */
  async updateTable(tenantId, tableId, updateData) {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          setClause.push(`${key} = $${paramIndex++}`);
          values.push(updateData[key]);
        }
      });

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      setClause.push(`updated_at = NOW()`);
      values.push(tableId);

      const query = `
        UPDATE tables 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(tenantId, query, values);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Table', tableId);
      }

      const table = result.rows[0];
      return createApiResponse(table, 'Table updated successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update table', error.message);
    }
  }

  /**
   * Delete table
   */
  async deleteTable(tenantId, tableId) {
    try {
      const query = 'DELETE FROM tables WHERE id = $1 RETURNING id';
      const result = await this.db.query(tenantId, query, [tableId]);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Table', tableId);
      }

      return createApiResponse(null, 'Table deleted successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete table', error.message);
    }
  }

  /**
   * Get tables with pagination and filtering
   */
  async getTables(tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        outletId, 
        section,
        status,
        isActive,
        orderBy = 'table_number',
        orderDirection = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      // Build where clause
      const conditions = [];
      
      if (outletId) {
        conditions.push(`outlet_id = $${paramIndex++}`);
        queryParams.push(outletId);
      }

      if (section) {
        conditions.push(`section = $${paramIndex++}`);
        queryParams.push(section);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(isActive);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) FROM tables ${whereClause}`;
      const countResult = await this.db.query(tenantId, countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM tables 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await this.db.query(tenantId, dataQuery, queryParams);
      
      const tables = dataResult.rows;

      const meta = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return createApiResponse(tables, 'Tables retrieved successfully', meta);
    } catch (error) {
      throw new DatabaseError('Failed to get tables', error.message);
    }
  }

  /**
   * Update table status
   */
  async updateTableStatus(tenantId, tableId, status) {
    try {
      const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_ORDER'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updatedTable = await this.updateTable(tenantId, tableId, { 
        status,
        statusUpdatedAt: new Date(),
      });

      return createApiResponse(
        updatedTable.data, 
        `Table status updated to ${status}`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update table status', error.message);
    }
  }

  /**
   * Get available tables
   */
  async getAvailableTables(tenantId, outletId, capacity = null) {
    try {
      let whereClause = 'WHERE outlet_id = $1 AND status = $2 AND is_active = $3';
      const queryParams = [outletId, 'AVAILABLE', true];
      let paramIndex = 4;

      if (capacity) {
        whereClause += ` AND capacity >= $${paramIndex++}`;
        queryParams.push(capacity);
      }

      const query = `
        SELECT * FROM tables 
        ${whereClause}
        ORDER BY capacity ASC, table_number ASC
      `;

      const result = await this.db.query(tenantId, query, queryParams);
      const tables = result.rows;

      return createApiResponse(
        tables, 
        `Found ${tables.length} available tables`
      );
    } catch (error) {
      throw new DatabaseError('Failed to get available tables', error.message);
    }
  }

  /**
   * Assign table to customer
   */
  async assignTable(tenantId, tableId, assignmentData) {
    const { customerId, customerName, partySize, reservationTime, notes } = assignmentData;

    try {
      const table = await this.getTable(tenantId, tableId);
      
      if (table.data.status !== 'AVAILABLE') {
        throw new ValidationError(`Table is not available. Current status: ${table.data.status}`);
      }

      if (partySize && partySize > table.data.capacity) {
        throw new ValidationError(`Party size (${partySize}) exceeds table capacity (${table.data.capacity})`);
      }

      // Update table status
      await this.updateTableStatus(tenantId, tableId, 'OCCUPIED');

      // Create table assignment record (in a real system, this would be a separate table)
      const assignment = {
        tableId,
        customerId,
        customerName,
        partySize,
        assignedAt: new Date(),
        reservationTime,
        notes,
      };

      return createApiResponse(
        assignment,
        'Table assigned successfully'
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to assign table', error.message);
    }
  }

  /**
   * Release table
   */
  async releaseTable(tenantId, tableId) {
    try {
      await this.updateTableStatus(tenantId, tableId, 'CLEANING');

      // In a real system, you might want to:
      // 1. Clear any table assignment records
      // 2. Trigger cleaning notification
      // 3. Set a timer to automatically mark as available after cleaning

      return createApiResponse(
        null,
        'Table released and marked for cleaning'
      );
    } catch (error) {
      throw new DatabaseError('Failed to release table', error.message);
    }
  }

  /**
   * Get table occupancy statistics
   */
  async getTableStatistics(tenantId, outletId) {
    try {
      const query = `
        SELECT 
          status,
          COUNT(*) as count
        FROM tables 
        WHERE outlet_id = $1 AND is_active = true
        GROUP BY status
      `;

      const result = await this.db.query(tenantId, query, [outletId]);
      
      const stats = {
        total: 0,
        available: 0,
        occupied: 0,
        reserved: 0,
        cleaning: 0,
        outOfOrder: 0,
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        stats.total += count;
        
        switch (row.status) {
          case 'AVAILABLE':
            stats.available = count;
            break;
          case 'OCCUPIED':
            stats.occupied = count;
            break;
          case 'RESERVED':
            stats.reserved = count;
            break;
          case 'CLEANING':
            stats.cleaning = count;
            break;
          case 'OUT_OF_ORDER':
            stats.outOfOrder = count;
            break;
        }
      });

      // Calculate occupancy rate
      const occupiedTables = stats.occupied + stats.reserved;
      stats.occupancyRate = stats.total > 0 
        ? Math.round((occupiedTables / stats.total) * 100) 
        : 0;

      return createApiResponse(stats, 'Table statistics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get table statistics', error.message);
    }
  }
}

module.exports = TableService;
const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Supplier management service
 */
class SupplierService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Create a new supplier
   */
  async createSupplier(tenantId, supplierData) {
    const { 
      name, 
      contactPerson, 
      email, 
      phone, 
      address, 
      paymentTerms = 'NET_30',
      isActive = true 
    } = supplierData;

    try {
      // Validate required fields
      if (!name || !contactPerson || !email || !phone) {
        throw new ValidationError('Name, contact person, email, and phone are required');
      }

      const query = `
        INSERT INTO suppliers (
          name, contact_person, email, phone, address, 
          payment_terms, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const values = [
        name,
        contactPerson,
        email,
        phone,
        JSON.stringify(address),
        paymentTerms,
        isActive,
      ];

      const result = await this.db.query(tenantId, query, values);
      const supplier = this.mapRowToObject(result.rows[0]);

      return createApiResponse(supplier, 'Supplier created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create supplier', error.message);
    }
  }

  /**
   * Get supplier by ID
   */
  async getSupplier(tenantId, supplierId) {
    try {
      const query = 'SELECT * FROM suppliers WHERE id = $1';
      const result = await this.db.query(tenantId, query, [supplierId]);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Supplier', supplierId);
      }

      const supplier = this.mapRowToObject(result.rows[0]);
      return createApiResponse(supplier, 'Supplier retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get supplier', error.message);
    }
  }

  /**
   * Update supplier
   */
  async updateSupplier(tenantId, supplierId, updateData) {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          if (key === 'address') {
            setClause.push(`${key} = $${paramIndex++}`);
            values.push(JSON.stringify(updateData[key]));
          } else {
            setClause.push(`${key} = $${paramIndex++}`);
            values.push(updateData[key]);
          }
        }
      });

      if (setClause.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      setClause.push(`updated_at = NOW()`);
      values.push(supplierId);

      const query = `
        UPDATE suppliers 
        SET ${setClause.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.query(tenantId, query, values);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Supplier', supplierId);
      }

      const supplier = this.mapRowToObject(result.rows[0]);
      return createApiResponse(supplier, 'Supplier updated successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update supplier', error.message);
    }
  }

  /**
   * Delete supplier
   */
  async deleteSupplier(tenantId, supplierId) {
    try {
      const query = 'DELETE FROM suppliers WHERE id = $1 RETURNING id';
      const result = await this.db.query(tenantId, query, [supplierId]);
      
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Supplier', supplierId);
      }

      return createApiResponse(null, 'Supplier deleted successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete supplier', error.message);
    }
  }

  /**
   * Get suppliers with pagination and filtering
   */
  async getSuppliers(tenantId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        isActive, 
        search,
        orderBy = 'name',
        orderDirection = 'ASC'
      } = options;

      const offset = (page - 1) * limit;
      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      // Build where clause
      const conditions = [];
      
      if (isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(isActive);
      }

      if (search) {
        conditions.push(`(name ILIKE $${paramIndex++} OR contact_person ILIKE $${paramIndex++})`);
        queryParams.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        whereClause = `WHERE ${conditions.join(' AND ')}`;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) FROM suppliers ${whereClause}`;
      const countResult = await this.db.query(tenantId, countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Data query
      const dataQuery = `
        SELECT * FROM suppliers 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await this.db.query(tenantId, dataQuery, queryParams);
      
      const suppliers = dataResult.rows.map(row => this.mapRowToObject(row));

      const meta = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return createApiResponse(suppliers, 'Suppliers retrieved successfully', meta);
    } catch (error) {
      throw new DatabaseError('Failed to get suppliers', error.message);
    }
  }

  /**
   * Get supplier performance metrics
   */
  async getSupplierPerformance(tenantId, supplierId, options = {}) {
    try {
      const { startDate, endDate } = options;
      
      // In a real implementation, this would query purchase orders and deliveries
      // For now, return mock performance data
      const performance = {
        supplierId,
        totalOrders: Math.floor(Math.random() * 100) + 10,
        onTimeDeliveries: Math.floor(Math.random() * 90) + 80,
        averageDeliveryTime: Math.floor(Math.random() * 5) + 2, // days
        qualityRating: (Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        totalValue: (Math.random() * 50000 + 10000).toFixed(2),
        period: {
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate: endDate || new Date(),
        },
      };

      return createApiResponse(performance, 'Supplier performance retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get supplier performance', error.message);
    }
  }

  /**
   * Map database row to object
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    const obj = { ...row };
    
    // Parse JSON fields
    if (obj.address && typeof obj.address === 'string') {
      try {
        obj.address = JSON.parse(obj.address);
      } catch (e) {
        obj.address = {};
      }
    }
    
    return obj;
  }
}

module.exports = SupplierService;
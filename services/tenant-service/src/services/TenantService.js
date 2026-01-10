const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { 
  generateId, 
  generateSchemaName, 
  createApiResponse,
  ValidationError,
  TenantNotFoundError,
  DatabaseError,
  SUBSCRIPTION_PLANS 
} = require('@rms/shared');

/**
 * Tenant management service
 */
class TenantService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Create a new tenant
   */
  async createTenant(tenantData) {
    const { businessName, subscriptionPlan = 'BASIC' } = tenantData;
    
    // Validate subscription plan
    if (!Object.values(SUBSCRIPTION_PLANS).includes(subscriptionPlan)) {
      throw new ValidationError(`Invalid subscription plan: ${subscriptionPlan}`);
    }

    const tenantId = generateId();
    const schemaName = generateSchemaName(tenantId);

    try {
      // Start transaction
      const client = await this.db.getConnection();
      
      try {
        await client.query('BEGIN');

        // Create tenant registry entry (simplified for current schema)
        await client.query(`
          INSERT INTO tenant_registry (
            tenant_id, business_name, schema_name, subscription_plan, 
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `, [
          tenantId,
          businessName,
          schemaName,
          subscriptionPlan,
          true
        ]);

        // Create tenant schema and tables
        await this.db.createTenantSchema(tenantId);

        await client.query('COMMIT');

        const tenant = {
          id: tenantId,
          tenantId: tenantId,
          businessName,
          schemaName,
          subscriptionPlan,
          isActive: true,
          createdAt: new Date().toISOString(),
        };

        return createApiResponse(tenant, 'Tenant created successfully');

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      // Clean up schema if it was created
      try {
        await this.db.dropTenantSchema(tenantId);
      } catch (cleanupError) {
        console.error('Failed to cleanup tenant schema:', cleanupError);
      }
      
      throw new DatabaseError('Failed to create tenant', error.message);
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId) {
    try {
      const result = await this.db.systemQuery(`
        SELECT 
          id,
          tenant_id,
          business_name,
          schema_name,
          subscription_plan,
          is_active,
          created_at,
          updated_at
        FROM tenant_registry 
        WHERE tenant_id = $1
      `, [tenantId]);

      if (result.rows.length === 0) {
        throw new TenantNotFoundError(tenantId);
      }

      const tenant = {
        id: result.rows[0].id,
        tenantId: result.rows[0].tenant_id,
        businessName: result.rows[0].business_name,
        schemaName: result.rows[0].schema_name,
        subscriptionPlan: result.rows[0].subscription_plan,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return createApiResponse(tenant, 'Tenant retrieved successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get tenant', error.message);
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updateData) {
    const { businessName, contactInfo, subscriptionPlan } = updateData;

    // Validate subscription plan if provided
    if (subscriptionPlan && !Object.values(SUBSCRIPTION_PLANS).includes(subscriptionPlan)) {
      throw new ValidationError(`Invalid subscription plan: ${subscriptionPlan}`);
    }

    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (businessName) {
        updateFields.push(`business_name = $${paramIndex++}`);
        updateValues.push(businessName);
      }

      if (contactInfo) {
        updateFields.push(`contact_info = $${paramIndex++}`);
        updateValues.push(JSON.stringify(contactInfo));
      }

      if (subscriptionPlan) {
        updateFields.push(`subscription_plan = $${paramIndex++}`);
        updateValues.push(subscriptionPlan);
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(tenantId);

      const query = `
        UPDATE tenant_registry 
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.db.systemQuery(query, updateValues);

      const tenant = {
        id: result.rows[0].tenant_id,
        businessName: result.rows[0].business_name,
        contactInfo: result.rows[0].contact_info,
        subscriptionPlan: result.rows[0].subscription_plan,
        schemaName: result.rows[0].schema_name,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return createApiResponse(tenant, 'Tenant updated successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update tenant', error.message);
    }
  }

  /**
   * Delete tenant (soft delete)
   */
  async deleteTenant(tenantId) {
    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      await this.db.systemQuery(`
        UPDATE tenant_registry 
        SET is_active = false, updated_at = NOW()
        WHERE tenant_id = $1
      `, [tenantId]);

      return createApiResponse(null, 'Tenant deactivated successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete tenant', error.message);
    }
  }

  /**
   * List all tenants (system admin only)
   */
  async listTenants(page = 1, limit = 20, isActive = null) {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let countParams = [];
      let queryParams = [];

      if (isActive !== null) {
        whereClause = 'WHERE is_active = $1';
        countParams = [isActive];
        queryParams = [isActive, limit, offset];
      } else {
        queryParams = [limit, offset];
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM tenant_registry ${whereClause}`;
      const countResult = await this.db.systemQuery(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      // Get tenants - using actual database columns
      const paramOffset = isActive !== null ? 2 : 0;
      const query = `
        SELECT 
          id,
          tenant_id,
          business_name,
          schema_name,
          subscription_plan,
          is_active,
          created_at,
          updated_at
        FROM tenant_registry 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}
      `;

      const result = await this.db.systemQuery(query, queryParams);

      const tenants = result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenant_id,
        businessName: row.business_name,
        schemaName: row.schema_name,
        subscriptionPlan: row.subscription_plan,
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const meta = {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      };

      return createApiResponse(tenants, 'Tenants retrieved successfully', meta);

    } catch (error) {
      throw new DatabaseError('Failed to list tenants', error.message);
    }
  }

  /**
   * Create tenant admin user
   */
  async createTenantAdmin(tenantId, adminData) {
    const { firstName, lastName, email, password } = adminData;
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const adminId = generateId();

      // Create admin user in tenant schema
      await this.db.query(tenantId, `
        INSERT INTO staff_members (
          id, outlet_id, employee_id, first_name, last_name, 
          email, role, permissions, is_active, created_at, updated_at
        ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        adminId,
        `ADMIN-${tenantId.substring(0, 8)}`,
        firstName,
        lastName,
        email,
        'TENANT_ADMIN',
        JSON.stringify({ 
          password: hashedPassword,
          isAdmin: true,
          canManageUsers: true,
          canManageOutlets: true,
          canViewReports: true 
        }),
        true
      ]);

      return adminId;

    } catch (error) {
      throw new DatabaseError('Failed to create tenant admin', error.message);
    }
  }

  /**
   * Authenticate tenant user
   */
  async authenticateUser(email, password, tenantId = null) {
    try {
      let user = null;
      let userTenantId = tenantId;

      if (tenantId) {
        // Search in specific tenant
        const result = await this.db.query(tenantId, `
          SELECT id, first_name, last_name, email, role, permissions, is_active
          FROM staff_members 
          WHERE email = $1 AND is_active = true
        `, [email]);

        if (result.rows.length > 0) {
          user = result.rows[0];
        }
      } else {
        // Search across all tenants (less efficient, but needed for login)
        const tenantsResult = await this.db.systemQuery(`
          SELECT tenant_id FROM tenant_registry WHERE is_active = true
        `);

        for (const tenant of tenantsResult.rows) {
          try {
            const result = await this.db.query(tenant.tenant_id, `
              SELECT id, first_name, last_name, email, role, permissions, is_active
              FROM staff_members 
              WHERE email = $1 AND is_active = true
            `, [email]);

            if (result.rows.length > 0) {
              user = result.rows[0];
              userTenantId = tenant.tenant_id;
              break;
            }
          } catch (error) {
            // Skip if tenant schema doesn't exist or other errors
            continue;
          }
        }
      }

      if (!user) {
        throw new ValidationError('Invalid email or password');
      }

      // Verify password
      const storedPassword = user.permissions?.password;
      if (!storedPassword || !await bcrypt.compare(password, storedPassword)) {
        throw new ValidationError('Invalid email or password');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: userTenantId,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const authData = {
        token,
        user: {
          id: user.id,
          tenantId: userTenantId,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          role: user.role,
        },
      };

      return createApiResponse(authData, 'Authentication successful');

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Authentication failed', error.message);
    }
  }

  /**
   * Get tenant configuration
   */
  async getTenantConfig(tenantId) {
    try {
      const tenant = await this.getTenant(tenantId);
      
      // Get additional configuration from tenant schema
      const outletsResult = await this.db.query(tenantId, `
        SELECT COUNT(*) as outlet_count FROM outlets WHERE is_active = true
      `);

      const staffResult = await this.db.query(tenantId, `
        SELECT COUNT(*) as staff_count FROM staff_members WHERE is_active = true
      `);

      const config = {
        ...tenant.data,
        stats: {
          outletCount: parseInt(outletsResult.rows[0].outlet_count),
          staffCount: parseInt(staffResult.rows[0].staff_count),
        },
        features: this.getFeaturesByPlan(tenant.data.subscriptionPlan),
      };

      return createApiResponse(config, 'Tenant configuration retrieved successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get tenant configuration', error.message);
    }
  }

  /**
   * Get outlets for a tenant
   */
  async getTenantOutlets(tenantId) {
    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      // Get outlets from tenant schema
      const result = await this.db.query(tenantId, `
        SELECT 
          id,
          name,
          address,
          operating_hours,
          tax_config,
          is_active,
          created_at,
          updated_at
        FROM outlets 
        WHERE is_active = true
        ORDER BY name
      `);

      const outlets = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        address: typeof row.address === 'string' ? row.address : JSON.stringify(row.address),
        phone: row.address?.phone || null,
        email: row.address?.email || null,
        managerId: null, // Not in current schema
        isActive: row.is_active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      return createApiResponse(outlets, 'Outlets retrieved successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get tenant outlets', error.message);
    }
  }

  /**
   * Create a new outlet for a tenant
   */
  async createTenantOutlet(tenantId, outletData) {
    const { name, address, phone, email, isActive = true } = outletData;

    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      const outletId = generateId();

      // Prepare address as JSONB
      const addressData = {
        street: address,
        phone: phone || null,
        email: email || null
      };

      // Default operating hours
      const operatingHours = {
        monday: { open: '09:00', close: '22:00', closed: false },
        tuesday: { open: '09:00', close: '22:00', closed: false },
        wednesday: { open: '09:00', close: '22:00', closed: false },
        thursday: { open: '09:00', close: '22:00', closed: false },
        friday: { open: '09:00', close: '22:00', closed: false },
        saturday: { open: '09:00', close: '22:00', closed: false },
        sunday: { open: '09:00', close: '22:00', closed: false }
      };

      // Default tax configuration
      const taxConfig = {
        taxRate: 0.18,
        taxType: 'GST',
        taxNumber: null
      };

      // Create outlet in tenant schema
      await this.db.query(tenantId, `
        INSERT INTO outlets (
          id, name, address, operating_hours, tax_config, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [
        outletId,
        name,
        JSON.stringify(addressData),
        JSON.stringify(operatingHours),
        JSON.stringify(taxConfig),
        isActive
      ]);

      // Get the created outlet
      const result = await this.db.query(tenantId, `
        SELECT 
          id, name, address, operating_hours, tax_config, is_active, created_at, updated_at
        FROM outlets 
        WHERE id = $1
      `, [outletId]);

      const outlet = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        address: typeof result.rows[0].address === 'string' ? result.rows[0].address : JSON.stringify(result.rows[0].address),
        phone: result.rows[0].address?.phone || phone,
        email: result.rows[0].address?.email || email,
        managerId: null,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return createApiResponse(outlet, 'Outlet created successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to create outlet', error.message);
    }
  }

  /**
   * Update an outlet
   */
  async updateTenantOutlet(tenantId, outletId, updateData) {
    const { name, address, phone, email, isActive } = updateData;

    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }

      if (address !== undefined || phone !== undefined || email !== undefined) {
        // Get current address data
        const currentResult = await this.db.query(tenantId, `
          SELECT address FROM outlets WHERE id = $1
        `, [outletId]);

        if (currentResult.rows.length === 0) {
          throw new ValidationError('Outlet not found');
        }

        const currentAddress = currentResult.rows[0].address || {};
        const updatedAddress = {
          ...currentAddress,
          street: address !== undefined ? address : currentAddress.street,
          phone: phone !== undefined ? phone : currentAddress.phone,
          email: email !== undefined ? email : currentAddress.email
        };

        updateFields.push(`address = $${paramIndex++}`);
        updateValues.push(JSON.stringify(updatedAddress));
      }

      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(isActive);
      }

      if (updateFields.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      updateValues.push(outletId);

      const query = `
        UPDATE outlets 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, address, operating_hours, tax_config, is_active, created_at, updated_at
      `;

      const result = await this.db.query(tenantId, query, updateValues);

      if (result.rows.length === 0) {
        throw new ValidationError('Outlet not found');
      }

      const outlet = {
        id: result.rows[0].id,
        name: result.rows[0].name,
        address: typeof result.rows[0].address === 'string' ? result.rows[0].address : JSON.stringify(result.rows[0].address),
        phone: result.rows[0].address?.phone || null,
        email: result.rows[0].address?.email || null,
        managerId: null,
        isActive: result.rows[0].is_active,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      };

      return createApiResponse(outlet, 'Outlet updated successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update outlet', error.message);
    }
  }

  /**
   * Delete an outlet
   */
  async deleteTenantOutlet(tenantId, outletId) {
    try {
      // Check if tenant exists
      await this.getTenant(tenantId);

      // Soft delete the outlet
      const result = await this.db.query(tenantId, `
        UPDATE outlets 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `, [outletId]);

      if (result.rows.length === 0) {
        throw new ValidationError('Outlet not found');
      }

      return createApiResponse(null, 'Outlet deleted successfully');

    } catch (error) {
      if (error instanceof TenantNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete outlet', error.message);
    }
  }

  /**
   * Get features by subscription plan
   */
  getFeaturesByPlan(plan) {
    const features = {
      BASIC: {
        maxOutlets: 1,
        maxStaff: 10,
        maxMenuItems: 100,
        analyticsRetention: 30, // days
        supportLevel: 'email',
        customReports: false,
        apiAccess: false,
      },
      PREMIUM: {
        maxOutlets: 5,
        maxStaff: 50,
        maxMenuItems: 500,
        analyticsRetention: 90,
        supportLevel: 'priority',
        customReports: true,
        apiAccess: true,
      },
      ENTERPRISE: {
        maxOutlets: -1, // unlimited
        maxStaff: -1,
        maxMenuItems: -1,
        analyticsRetention: 365,
        supportLevel: 'dedicated',
        customReports: true,
        apiAccess: true,
      },
    };

    return features[plan] || features.BASIC;
  }
}

module.exports = TenantService;
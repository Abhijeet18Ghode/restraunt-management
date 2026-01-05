const { Pool } = require('pg');
const { generateSchemaName } = require('./utils');
const { DatabaseError, TenantNotFoundError } = require('./errors');

/**
 * Database connection pool manager
 */
class DatabaseManager {
  constructor(config) {
    this.pool = new Pool(config);
    this.tenantSchemas = new Map(); // Cache for tenant schemas
  }

  /**
   * Get database connection
   */
  async getConnection() {
    try {
      return await this.pool.connect();
    } catch (error) {
      throw new DatabaseError('Failed to get database connection', error.message);
    }
  }

  /**
   * Execute query with tenant context
   */
  async query(tenantId, sql, params = []) {
    const client = await this.getConnection();
    try {
      const schemaName = generateSchemaName(tenantId);
      
      // Set search path to tenant schema
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      throw new DatabaseError('Database query failed', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Execute query without tenant context (for system operations)
   */
  async systemQuery(sql, params = []) {
    const client = await this.getConnection();
    try {
      const result = await client.query(sql, params);
      return result;
    } catch (error) {
      throw new DatabaseError('System query failed', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * Create tenant schema
   */
  async createTenantSchema(tenantId) {
    const schemaName = generateSchemaName(tenantId);
    
    try {
      // Create schema
      await this.systemQuery(`SELECT create_tenant_schema($1)`, [schemaName]);
      
      // Create tenant-specific tables
      await this.createTenantTables(schemaName);
      
      // Cache schema
      this.tenantSchemas.set(tenantId, schemaName);
      
      return schemaName;
    } catch (error) {
      throw new DatabaseError(`Failed to create tenant schema: ${schemaName}`, error.message);
    }
  }

  /**
   * Create tables in tenant schema
   */
  async createTenantTables(schemaName) {
    const client = await this.getConnection();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      // Create outlets table
      await client.query(`
        CREATE TABLE IF NOT EXISTS outlets (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          address JSONB NOT NULL,
          operating_hours JSONB NOT NULL,
          tax_config JSONB NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create menu categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS menu_categories (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          sort_order INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create menu items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          category_id UUID REFERENCES menu_categories(id),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          preparation_time INTEGER DEFAULT 0,
          ingredients JSONB DEFAULT '[]',
          is_available BOOLEAN DEFAULT true,
          outlet_ids JSONB DEFAULT '[]',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create tables table
      await client.query(`
        CREATE TABLE IF NOT EXISTS tables (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          outlet_id UUID REFERENCES outlets(id),
          table_number VARCHAR(50) NOT NULL,
          capacity INTEGER NOT NULL,
          status VARCHAR(50) DEFAULT 'AVAILABLE',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          outlet_id UUID REFERENCES outlets(id),
          order_number VARCHAR(100) UNIQUE NOT NULL,
          table_id UUID REFERENCES tables(id),
          customer_id UUID,
          order_type VARCHAR(50) NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
          tax DECIMAL(10,2) NOT NULL DEFAULT 0,
          discount DECIMAL(10,2) DEFAULT 0,
          total DECIMAL(10,2) NOT NULL DEFAULT 0,
          status VARCHAR(50) DEFAULT 'PENDING',
          payment_status VARCHAR(50) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create order items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
          menu_item_id UUID REFERENCES menu_items(id),
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          special_instructions TEXT,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create inventory items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          outlet_id UUID REFERENCES outlets(id),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          unit VARCHAR(50) NOT NULL,
          current_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
          minimum_stock DECIMAL(10,3) NOT NULL DEFAULT 0,
          maximum_stock DECIMAL(10,3),
          unit_cost DECIMAL(10,2),
          supplier_id UUID,
          last_restocked TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create staff members table
      await client.query(`
        CREATE TABLE IF NOT EXISTS staff_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          outlet_id UUID REFERENCES outlets(id),
          employee_id VARCHAR(100) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20),
          role VARCHAR(50) NOT NULL,
          permissions JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create customers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(20),
          address JSONB,
          loyalty_points INTEGER DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          total_spent DECIMAL(10,2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for performance
      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_outlet_created ON orders(outlet_id, created_at)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items(outlet_id) WHERE current_stock <= minimum_stock`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_staff_outlet ON staff_members(outlet_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_tables_outlet ON tables(outlet_id)`);

    } finally {
      client.release();
    }
  }

  /**
   * Drop tenant schema
   */
  async dropTenantSchema(tenantId) {
    const schemaName = generateSchemaName(tenantId);
    
    try {
      await this.systemQuery(`SELECT drop_tenant_schema($1)`, [schemaName]);
      this.tenantSchemas.delete(tenantId);
    } catch (error) {
      throw new DatabaseError(`Failed to drop tenant schema: ${schemaName}`, error.message);
    }
  }

  /**
   * Check if tenant exists
   */
  async tenantExists(tenantId) {
    try {
      const result = await this.systemQuery(
        'SELECT EXISTS(SELECT 1 FROM tenant_registry WHERE tenant_id = $1)',
        [tenantId]
      );
      return result.rows[0].exists;
    } catch (error) {
      throw new DatabaseError('Failed to check tenant existence', error.message);
    }
  }

  /**
   * Get tenant schema name
   */
  async getTenantSchema(tenantId) {
    // Check cache first
    if (this.tenantSchemas.has(tenantId)) {
      return this.tenantSchemas.get(tenantId);
    }

    try {
      const result = await this.systemQuery(
        'SELECT schema_name FROM tenant_registry WHERE tenant_id = $1',
        [tenantId]
      );
      
      if (result.rows.length === 0) {
        throw new TenantNotFoundError(tenantId);
      }

      const schemaName = result.rows[0].schema_name;
      this.tenantSchemas.set(tenantId, schemaName);
      return schemaName;
    } catch (error) {
      if (error instanceof TenantNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get tenant schema', error.message);
    }
  }

  /**
   * Close database connections
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = {
  DatabaseManager,
};
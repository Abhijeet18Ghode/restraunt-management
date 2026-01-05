const { Pool } = require('pg');

// Test database configuration
const testDbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_management_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

let dbPool;

beforeAll(async () => {
  dbPool = new Pool(testDbConfig);
  
  // Create test schemas and tables
  await createTestSchemas();
});

afterAll(async () => {
  if (dbPool) {
    await dbPool.end();
  }
});

beforeEach(async () => {
  // Clean up test data before each test
  await cleanupTestData();
});

async function createTestSchemas() {
  const tenantIds = ['test_tenant_1', 'test_tenant_2', 'test_tenant_3'];
  
  for (const tenantId of tenantIds) {
    const schemaName = `tenant_${tenantId}`;
    
    // Create schema
    await dbPool.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Create tables
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.outlets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address JSONB NOT NULL,
        operating_hours JSONB NOT NULL,
        tax_config JSONB NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.menu_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sort_order INTEGER,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.menu_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id UUID REFERENCES ${schemaName}.menu_categories(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        preparation_time INTEGER,
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outlet_id UUID REFERENCES ${schemaName}.outlets(id),
        table_number VARCHAR(50) NOT NULL,
        capacity INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'AVAILABLE',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outlet_id UUID REFERENCES ${schemaName}.outlets(id),
        order_number VARCHAR(100) UNIQUE NOT NULL,
        table_id UUID REFERENCES ${schemaName}.tables(id),
        customer_id UUID,
        order_type VARCHAR(50) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        tax DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES ${schemaName}.orders(id),
        menu_item_id UUID REFERENCES ${schemaName}.menu_items(id),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        special_instructions TEXT,
        status VARCHAR(50) DEFAULT 'PENDING'
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outlet_id UUID REFERENCES ${schemaName}.outlets(id),
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        unit VARCHAR(50) NOT NULL,
        current_stock DECIMAL(10,3) NOT NULL,
        minimum_stock DECIMAL(10,3) NOT NULL,
        maximum_stock DECIMAL(10,3),
        unit_cost DECIMAL(10,2),
        supplier_id UUID,
        last_restocked TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.inventory_consumption (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_name VARCHAR(255) NOT NULL,
        quantity_consumed DECIMAL(10,3) NOT NULL,
        consumed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.report_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        format VARCHAR(10) NOT NULL,
        period VARCHAR(50),
        outlet_id UUID,
        generated_at TIMESTAMP DEFAULT NOW(),
        file_size BIGINT
      )
    `);

    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.scheduled_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        report_config JSONB NOT NULL,
        cron_expression VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
  }
}

async function cleanupTestData() {
  const tenantIds = ['test_tenant_1', 'test_tenant_2', 'test_tenant_3'];
  
  for (const tenantId of tenantIds) {
    const schemaName = `tenant_${tenantId}`;
    
    // Clean up in reverse order of dependencies
    await dbPool.query(`DELETE FROM ${schemaName}.order_items`);
    await dbPool.query(`DELETE FROM ${schemaName}.orders`);
    await dbPool.query(`DELETE FROM ${schemaName}.tables`);
    await dbPool.query(`DELETE FROM ${schemaName}.menu_items`);
    await dbPool.query(`DELETE FROM ${schemaName}.menu_categories`);
    await dbPool.query(`DELETE FROM ${schemaName}.outlets`);
    await dbPool.query(`DELETE FROM ${schemaName}.inventory_items`);
    await dbPool.query(`DELETE FROM ${schemaName}.inventory_consumption`);
    await dbPool.query(`DELETE FROM ${schemaName}.report_history`);
    await dbPool.query(`DELETE FROM ${schemaName}.scheduled_reports`);
  }
}

// Helper function to create test data
async function createTestOrder(tenantId, orderData) {
  const schemaName = `tenant_${tenantId}`;
  
  const query = `
    INSERT INTO ${schemaName}.orders 
    (outlet_id, order_number, order_type, subtotal, tax, discount, total, status, customer_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
  `;
  
  const result = await dbPool.query(query, [
    orderData.outletId,
    orderData.orderNumber,
    orderData.orderType || 'DINE_IN',
    orderData.subtotal,
    orderData.tax,
    orderData.discount || 0,
    orderData.total,
    orderData.status || 'COMPLETED',
    orderData.customerId,
    orderData.createdAt || new Date()
  ]);
  
  return result.rows[0].id;
}

async function createTestOutlet(tenantId, outletData) {
  const schemaName = `tenant_${tenantId}`;
  
  const query = `
    INSERT INTO ${schemaName}.outlets 
    (name, address, operating_hours, tax_config)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `;
  
  const result = await dbPool.query(query, [
    outletData.name,
    outletData.address || {},
    outletData.operatingHours || {},
    outletData.taxConfig || {}
  ]);
  
  return result.rows[0].id;
}

global.dbPool = dbPool;
global.createTestOrder = createTestOrder;
global.createTestOutlet = createTestOutlet;
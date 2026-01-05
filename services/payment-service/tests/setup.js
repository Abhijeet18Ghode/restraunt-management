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
    
    // Create payments table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) NOT NULL,
        customer_id VARCHAR(255),
        outlet_id UUID,
        status VARCHAR(50) DEFAULT 'PENDING',
        gateway_transaction_id VARCHAR(255),
        gateway_response TEXT,
        refund_status VARCHAR(50),
        refunded_amount DECIMAL(10,2) DEFAULT 0,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);

    // Create refunds table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.refunds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        refund_transaction_id VARCHAR(255) UNIQUE NOT NULL,
        original_transaction_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        refunded_by VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        gateway_refund_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP
      )
    `);

    // Create transaction logs table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.transaction_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR(255) NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        gateway_transaction_id VARCHAR(255),
        logged_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create failed transactions table
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.failed_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR(255) NOT NULL,
        order_id VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) NOT NULL,
        error_message TEXT,
        failed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create orders table (for testing)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(100) UNIQUE NOT NULL,
        outlet_id UUID,
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
  }
}

async function cleanupTestData() {
  const tenantIds = ['test_tenant_1', 'test_tenant_2', 'test_tenant_3'];
  
  for (const tenantId of tenantIds) {
    const schemaName = `tenant_${tenantId}`;
    
    // Clean up in reverse order of dependencies
    await dbPool.query(`DELETE FROM ${schemaName}.failed_transactions`);
    await dbPool.query(`DELETE FROM ${schemaName}.transaction_logs`);
    await dbPool.query(`DELETE FROM ${schemaName}.refunds`);
    await dbPool.query(`DELETE FROM ${schemaName}.payments`);
    await dbPool.query(`DELETE FROM ${schemaName}.orders`);
  }
}

// Helper function to create test payment
async function createTestPayment(tenantId, paymentData) {
  const schemaName = `tenant_${tenantId}`;
  
  const query = `
    INSERT INTO ${schemaName}.payments 
    (transaction_id, order_id, amount, currency, payment_method, customer_id, outlet_id, status, gateway_transaction_id, created_at, processed_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const result = await dbPool.query(query, [
    paymentData.transactionId,
    paymentData.orderId,
    paymentData.amount,
    paymentData.currency || 'USD',
    paymentData.paymentMethod,
    paymentData.customerId,
    paymentData.outletId,
    paymentData.status || 'COMPLETED',
    paymentData.gatewayTransactionId,
    paymentData.createdAt || new Date(),
    paymentData.processedAt || new Date()
  ]);
  
  return result.rows[0];
}

async function createTestOrder(tenantId, orderData) {
  const schemaName = `tenant_${tenantId}`;
  
  const query = `
    INSERT INTO ${schemaName}.orders 
    (order_number, outlet_id, customer_id, order_type, subtotal, tax, discount, total, status, payment_status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const result = await dbPool.query(query, [
    orderData.orderNumber,
    orderData.outletId,
    orderData.customerId,
    orderData.orderType || 'DINE_IN',
    orderData.subtotal,
    orderData.tax,
    orderData.discount || 0,
    orderData.total,
    orderData.status || 'COMPLETED',
    orderData.paymentStatus || 'COMPLETED',
    orderData.createdAt || new Date()
  ]);
  
  return result.rows[0];
}

global.dbPool = dbPool;
global.createTestPayment = createTestPayment;
global.createTestOrder = createTestOrder;
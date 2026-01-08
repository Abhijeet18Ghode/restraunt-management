#!/usr/bin/env node

const { Pool } = require('pg');

async function testDatabase() {
  console.log('🔍 Testing Database Connection Directly\n');

  // Database configuration (matching tenant service)
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'restaurant_management',
    user: process.env.DB_USER || 'rms_user',
    password: process.env.DB_PASSWORD || 'rms_password',
  };

  console.log('Database Config:', {
    ...dbConfig,
    password: '***hidden***'
  });

  const pool = new Pool(dbConfig);

  try {
    // Test basic connection
    console.log('\n1. Testing basic connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log('Current time:', result.rows[0].current_time);
    client.release();

    // Check if tenant_registry table exists
    console.log('\n2. Checking tenant_registry table...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'tenant_registry'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ tenant_registry table exists');
      
      // Check existing tenants
      const tenants = await pool.query('SELECT * FROM tenant_registry LIMIT 5');
      console.log(`Found ${tenants.rows.length} existing tenants`);
      if (tenants.rows.length > 0) {
        console.log('Existing tenants:', tenants.rows.map(t => ({
          id: t.tenant_id,
          name: t.business_name,
          schema: t.schema_name
        })));
      }
    } else {
      console.log('❌ tenant_registry table does not exist');
      console.log('Database needs to be initialized with init-db.sql');
    }

    // Check if functions exist
    console.log('\n3. Checking database functions...');
    const functionCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'create_tenant_schema'
      );
    `);
    
    if (functionCheck.rows[0].exists) {
      console.log('✅ create_tenant_schema function exists');
    } else {
      console.log('❌ create_tenant_schema function does not exist');
    }

    // Test creating a simple schema manually
    console.log('\n4. Testing manual schema creation...');
    const testSchemaName = 'test_tenant_' + Date.now();
    
    try {
      await pool.query(`CREATE SCHEMA IF NOT EXISTS ${testSchemaName}`);
      console.log(`✅ Successfully created test schema: ${testSchemaName}`);
      
      // Clean up
      await pool.query(`DROP SCHEMA ${testSchemaName}`);
      console.log(`✅ Successfully dropped test schema: ${testSchemaName}`);
    } catch (error) {
      console.log('❌ Failed to create test schema:', error.message);
    }

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();
#!/usr/bin/env node

const { DatabaseManager } = require('@rms/shared');

async function testDatabaseManager() {
  console.log('🔍 Testing DatabaseManager class...');

  const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'restaurant_management',
    user: 'rms_user',
    password: 'rms_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  const dbManager = new DatabaseManager(dbConfig);

  try {
    // Test connection
    await dbManager.testConnection();
    console.log('✅ DatabaseManager connection test passed');

    // Test system query
    const result = await dbManager.systemQuery('SELECT COUNT(*) FROM tenant_registry');
    console.log('📊 Total tenants via DatabaseManager:', result.rows[0].count);

    // Test the exact query from TenantService
    console.log('🔍 Testing the exact query from TenantService...');
    try {
      const tenantsResult = await dbManager.systemQuery(`
        SELECT 
          tenant_id,
          business_name,
          contact_info,
          subscription_plan,
          is_active,
          created_at,
          updated_at
        FROM tenant_registry 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [20, 0]);

      console.log('🏢 Tenants via DatabaseManager:');
      tenantsResult.rows.forEach((tenant, index) => {
        console.log(`  ${index + 1}. ${tenant.business_name} (${tenant.tenant_id}) - ${tenant.subscription_plan}`);
      });
    } catch (queryError) {
      console.error('❌ Query error details:', queryError);
      
      // Try a simpler query
      console.log('🔍 Trying simpler query...');
      const simpleResult = await dbManager.systemQuery('SELECT * FROM tenant_registry LIMIT 1');
      console.log('✅ Simple query worked:', simpleResult.rows[0]);
    }

    await dbManager.close();
    console.log('✅ DatabaseManager test completed successfully!');

  } catch (error) {
    console.error('❌ DatabaseManager test failed:', error.message);
    console.error('Stack:', error.stack);
    try {
      await dbManager.close();
    } catch {}
  }
}

testDatabaseManager();
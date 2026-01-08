#!/usr/bin/env node

const { DatabaseManager } = require('./packages/shared/src/database');
const TenantService = require('./services/tenant-service/src/services/TenantService');

async function testLogin() {
  console.log('🔐 Testing Login for Maratha Cafe\n');

  // Set JWT_SECRET for testing
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
  process.env.JWT_EXPIRES_IN = '24h';

  // Database configuration
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'restaurant_management',
    user: process.env.DB_USER || 'rms_user',
    password: process.env.DB_PASSWORD || 'rms_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  const dbManager = new DatabaseManager(dbConfig);

  try {
    const tenantService = new TenantService(dbManager);

    // Get the tenant ID from the most recent tenant
    console.log('1. Finding Maratha Cafe tenant...');
    const tenantsResult = await dbManager.systemQuery(`
      SELECT tenant_id, business_name FROM tenant_registry 
      WHERE business_name LIKE '%Maratha%' 
      ORDER BY created_at DESC LIMIT 1
    `);

    if (tenantsResult.rows.length === 0) {
      console.log('❌ No Maratha Cafe tenant found');
      return;
    }

    const tenantId = tenantsResult.rows[0].tenant_id;
    const businessName = tenantsResult.rows[0].business_name;
    console.log(`✅ Found tenant: ${businessName} (${tenantId})`);

    // Check if admin user exists in tenant schema
    console.log('\n2. Checking admin user in tenant schema...');
    const userResult = await dbManager.query(tenantId, `
      SELECT id, first_name, last_name, email, role, permissions, is_active
      FROM staff_members 
      WHERE email = $1
    `, ['ghodeabhijeet18@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('❌ No admin user found with email ghodeabhijeet18@gmail.com');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Admin user found:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Name: ${user.first_name} ${user.last_name}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Active: ${user.is_active}`);
    console.log(`   - Has password: ${user.permissions?.password ? 'Yes' : 'No'}`);

    // Test authentication
    console.log('\n3. Testing authentication...');
    try {
      const authResult = await tenantService.authenticateUser(
        'ghodeabhijeet18@gmail.com',
        'ShreeSwamiSamarth@28',
        tenantId
      );

      console.log('✅ Authentication successful!');
      console.log('🎫 Authentication Details:');
      console.log(`   - User ID: ${authResult.data.user.id}`);
      console.log(`   - Role: ${authResult.data.user.role}`);
      console.log(`   - Tenant: ${authResult.data.user.tenantId}`);
      console.log(`   - Token: ${authResult.data.token.substring(0, 50)}...`);

      // Save credentials
      const credentials = {
        email: 'ghodeabhijeet18@gmail.com',
        password: 'ShreeSwamiSamarth@28',
        tenantId: tenantId,
        token: authResult.data.token,
        businessName: businessName,
        adminUserId: authResult.data.user.id
      };

      require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));
      console.log('\n💾 Credentials saved to login-credentials.json');

    } catch (authError) {
      console.log('❌ Authentication failed:', authError.message);
      
      // Let's check what's in the permissions field
      console.log('\nDebugging permissions field:');
      console.log('Permissions object:', JSON.stringify(user.permissions, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error.stack);
  } finally {
    await dbManager.close();
  }
}

testLogin();
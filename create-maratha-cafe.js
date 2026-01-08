#!/usr/bin/env node

const { DatabaseManager } = require('./packages/shared/src/database');
const TenantService = require('./services/tenant-service/src/services/TenantService');

async function createMarathaCafe() {
  console.log('🏪 Creating Maratha Cafe Tenant\n');

  // Database configuration (matching tenant service)
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
    console.log('📝 Creating tenant with your details...');
    
    const tenantService = new TenantService(dbManager);

    const tenantData = {
      businessName: "Maratha Cafe",
      contactInfo: {
        email: "ghodeabhijeet18@gmail.com",
        phone: "9881012691",
        address: {
          street: "Pune",
          city: "Pune",
          state: "Maharashtra", 
          country: "India",
          zipCode: "411023"
        }
      },
      subscriptionPlan: "PREMIUM",
      adminUser: {
        firstName: "Abhijeet",
        lastName: "Ghode",
        email: "ghodeabhijeet18@gmail.com",
        password: "ShreeSwamiSamarth@28"
      }
    };

    console.log('🔧 Creating tenant...');
    const result = await tenantService.createTenant(tenantData);
    
    console.log('✅ Tenant created successfully!');
    console.log('📋 Tenant Details:');
    console.log(`   - Business Name: ${result.data.businessName}`);
    console.log(`   - Tenant ID: ${result.data.id}`);
    console.log(`   - Schema Name: ${result.data.schemaName}`);
    console.log(`   - Subscription: ${result.data.subscriptionPlan}`);

    const tenantId = result.data.id;

    // Create admin user
    console.log('\n👤 Creating admin user...');
    const adminId = await tenantService.createTenantAdmin(tenantId, tenantData.adminUser);
    console.log('✅ Admin user created successfully!');
    console.log(`   - Admin ID: ${adminId}`);

    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const authResult = await tenantService.authenticateUser(
      tenantData.adminUser.email,
      tenantData.adminUser.password,
      tenantId
    );

    console.log('✅ Authentication successful!');
    console.log('🎫 Authentication Details:');
    console.log(`   - User ID: ${authResult.data.user.id}`);
    console.log(`   - Role: ${authResult.data.user.role}`);
    console.log(`   - Tenant: ${authResult.data.user.tenantId}`);
    console.log(`   - Token: ${authResult.data.token.substring(0, 50)}...`);

    // Save credentials for easy access
    const credentials = {
      email: tenantData.adminUser.email,
      password: tenantData.adminUser.password,
      tenantId: tenantId,
      token: authResult.data.token,
      businessName: result.data.businessName,
      adminUserId: authResult.data.user.id,
      schemaName: result.data.schemaName
    };

    console.log('\n💾 Saving credentials to login-credentials.json...');
    require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));

    console.log('\n🎉 Setup Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start the admin dashboard: cd apps/admin-dashboard && npm run dev');
    console.log('2. Open http://localhost:3011 in your browser');
    console.log('3. Login with:');
    console.log(`   - Email: ${tenantData.adminUser.email}`);
    console.log(`   - Password: ${tenantData.adminUser.password}`);
    console.log('\n📄 Credentials saved to login-credentials.json for reference');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error details:', error.stack);
  } finally {
    await dbManager.close();
  }
}

createMarathaCafe();
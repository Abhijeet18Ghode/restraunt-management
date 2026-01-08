#!/usr/bin/env node

const { DatabaseManager } = require('./packages/shared/src/database');
const TenantService = require('./services/tenant-service/src/services/TenantService');

async function debugTenantCreation() {
  console.log('🔍 Debug Tenant Creation Process\n');

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
    console.log('1. Testing database connection...');
    await dbManager.testConnection();
    console.log('✅ Database connection successful');

    console.log('\n2. Creating TenantService instance...');
    const tenantService = new TenantService(dbManager);
    console.log('✅ TenantService created');

    console.log('\n3. Attempting to create tenant...');
    const tenantData = {
      businessName: "Maratha Cafe Debug",
      contactInfo: {
        email: "debug@example.com",
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
        firstName: "Debug",
        lastName: "User",
        email: "debug@example.com",
        password: "debugpassword123"
      }
    };

    console.log('Tenant data:', JSON.stringify(tenantData, null, 2));

    const startTime = Date.now();
    console.log('Starting tenant creation...');
    
    const result = await tenantService.createTenant(tenantData);
    
    const endTime = Date.now();
    console.log(`✅ Tenant created successfully in ${endTime - startTime}ms`);
    console.log('Result:', JSON.stringify(result, null, 2));

    // Test creating admin user
    if (tenantData.adminUser) {
      console.log('\n4. Creating admin user...');
      try {
        const adminId = await tenantService.createTenantAdmin(
          result.data.id, 
          tenantData.adminUser
        );
        console.log('✅ Admin user created:', adminId);
      } catch (adminError) {
        console.log('⚠️ Admin user creation failed:', adminError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during tenant creation:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.originalError) {
      console.error('Original error:', error.originalError);
    }
  } finally {
    await dbManager.close();
  }
}

debugTenantCreation();
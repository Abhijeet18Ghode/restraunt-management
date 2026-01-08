#!/usr/bin/env node

const axios = require('axios');

async function createSimpleTenant() {
  console.log('🧪 Creating Simple Tenant (Bypassing Complex Schema Creation)\n');

  try {
    // Create a very simple tenant first
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
      subscriptionPlan: "PREMIUM"
    };

    console.log('Sending tenant creation request...');
    console.log('Data:', JSON.stringify(tenantData, null, 2));

    const createResponse = await axios.post('http://localhost:3000/api/tenants', tenantData, {
      timeout: 60000, // 60 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Tenant created successfully!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    // Save the tenant ID for later use
    if (createResponse.data.success && createResponse.data.data.id) {
      const tenantId = createResponse.data.data.id;
      
      console.log('\n📋 Tenant Details:');
      console.log(`   - Business Name: ${createResponse.data.data.businessName}`);
      console.log(`   - Tenant ID: ${tenantId}`);
      console.log(`   - Schema Name: ${createResponse.data.data.schemaName}`);
      console.log(`   - Subscription: ${createResponse.data.data.subscriptionPlan}`);

      // Save credentials for later use
      const credentials = {
        tenantId: tenantId,
        businessName: createResponse.data.data.businessName,
        schemaName: createResponse.data.data.schemaName,
        subscriptionPlan: createResponse.data.data.subscriptionPlan
      };

      require('fs').writeFileSync('tenant-info.json', JSON.stringify(credentials, null, 2));
      console.log('\n💾 Tenant info saved to tenant-info.json');

      console.log('\n🎉 Tenant Creation Complete!');
      console.log('\nNext: We need to create an admin user for this tenant manually.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out - the service might be slow or not responding');
    }
  }
}

createSimpleTenant();
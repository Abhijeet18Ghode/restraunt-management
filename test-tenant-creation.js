#!/usr/bin/env node

const axios = require('axios');

async function testTenantCreation() {
  console.log('🧪 Testing Tenant Creation API\n');

  try {
    // First, test if the API gateway is working
    console.log('1. Testing API Gateway health...');
    const healthResponse = await axios.get('http://localhost:3000/health', { timeout: 5000 });
    console.log('✅ API Gateway is responding:', healthResponse.data);

    // Test if tenant service is reachable through gateway
    console.log('\n2. Testing tenant service endpoint...');
    try {
      const tenantListResponse = await axios.get('http://localhost:3000/api/tenants', { timeout: 10000 });
      console.log('✅ Tenant service is reachable:', tenantListResponse.status);
    } catch (error) {
      console.log('⚠️ Tenant list failed:', error.response?.status || error.message);
    }

    // Create a simple tenant
    console.log('\n3. Creating test tenant...');
    const tenantData = {
      businessName: "Test Restaurant",
      contactInfo: {
        email: "test@example.com",
        phone: "+1234567890",
        address: {
          street: "123 Test St",
          city: "Test City",
          state: "Test State",
          country: "Test Country",
          zipCode: "12345"
        }
      },
      subscriptionPlan: "PREMIUM",
      adminUser: {
        firstName: "Test",
        lastName: "Admin",
        email: "test@example.com",
        password: "testpassword123"
      }
    };

    console.log('Sending tenant creation request...');
    const createResponse = await axios.post('http://localhost:3000/api/tenants', tenantData, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Tenant created successfully!');
    console.log('Response:', JSON.stringify(createResponse.data, null, 2));

    // Test login
    if (createResponse.data.success && createResponse.data.data.id) {
      console.log('\n4. Testing login...');
      const loginData = {
        email: "test@example.com",
        password: "testpassword123",
        tenantId: createResponse.data.data.id
      };

      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData, {
        timeout: 10000
      });

      console.log('✅ Login successful!');
      console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timed out - the service might be slow or not responding');
    }
  }
}

testTenantCreation();
#!/usr/bin/env node

const axios = require('axios');

async function testApiLogin() {
  console.log('🧪 Testing API Login through Gateway\n');

  try {
    // Read the saved credentials
    const credentials = JSON.parse(require('fs').readFileSync('login-credentials.json', 'utf8'));
    
    console.log('📋 Using saved credentials:');
    console.log(`   - Email: ${credentials.email}`);
    console.log(`   - Tenant ID: ${credentials.tenantId}`);
    console.log(`   - Business: ${credentials.businessName}`);

    // Test login through API gateway
    console.log('\n🔐 Testing login through API gateway...');
    const loginData = {
      email: credentials.email,
      password: credentials.password,
      tenantId: credentials.tenantId
    };

    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (loginResponse.data.success) {
      console.log('✅ API Login successful!');
      console.log('🎫 API Authentication Details:');
      console.log(`   - User ID: ${loginResponse.data.data.user.id}`);
      console.log(`   - Role: ${loginResponse.data.data.user.role}`);
      console.log(`   - Tenant: ${loginResponse.data.data.user.tenantId}`);
      console.log(`   - Token: ${loginResponse.data.data.token.substring(0, 50)}...`);

      // Test API access with token
      console.log('\n🧪 Testing API access with token...');
      const testResponse = await axios.get(`http://localhost:3000/api/tenants/${credentials.tenantId}`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.data.token}`,
          'X-Tenant-ID': credentials.tenantId
        },
        timeout: 5000
      });

      if (testResponse.data.success) {
        console.log('✅ API access working correctly!');
        console.log('📋 Tenant info from API:');
        console.log(`   - Business Name: ${testResponse.data.data.businessName}`);
        console.log(`   - Subscription: ${testResponse.data.data.subscriptionPlan}`);
        console.log(`   - Active: ${testResponse.data.data.isActive}`);

        // Update credentials with new token
        credentials.token = loginResponse.data.data.token;
        require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));
        console.log('\n💾 Updated credentials saved to login-credentials.json');

        console.log('\n🎉 Everything is working perfectly!');
        console.log('\n📋 Next Steps:');
        console.log('1. Start the admin dashboard: cd apps/admin-dashboard && npm run dev');
        console.log('2. Open http://localhost:3011 in your browser');
        console.log('3. Login with:');
        console.log(`   - Email: ${credentials.email}`);
        console.log(`   - Password: ${credentials.password}`);
      }

    } else {
      console.error('❌ API Login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testApiLogin();
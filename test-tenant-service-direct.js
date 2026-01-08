#!/usr/bin/env node

const axios = require('axios');

async function testTenantServiceDirect() {
  console.log('🧪 Testing Tenant Service Directly\n');

  try {
    // Read the saved credentials
    const credentials = JSON.parse(require('fs').readFileSync('login-credentials.json', 'utf8'));
    
    console.log('📋 Using saved credentials:');
    console.log(`   - Email: ${credentials.email}`);
    console.log(`   - Tenant ID: ${credentials.tenantId}`);

    // Test tenant service health
    console.log('\n1. Testing tenant service health...');
    const healthResponse = await axios.get('http://localhost:3001/health', { timeout: 5000 });
    console.log('✅ Tenant service is healthy:', healthResponse.data.status);

    // Test auth endpoint directly on tenant service
    console.log('\n2. Testing auth endpoint directly...');
    const loginData = {
      email: credentials.email,
      password: credentials.password,
      tenantId: credentials.tenantId
    };

    const loginResponse = await axios.post('http://localhost:3001/auth/login', loginData, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (loginResponse.data.success) {
      console.log('✅ Direct auth login successful!');
      console.log('🎫 Authentication Details:');
      console.log(`   - User ID: ${loginResponse.data.data.user.id}`);
      console.log(`   - Role: ${loginResponse.data.data.user.role}`);
      console.log(`   - Tenant: ${loginResponse.data.data.user.tenantId}`);
      console.log(`   - Token: ${loginResponse.data.data.token.substring(0, 50)}...`);

      // Update credentials with new token
      credentials.token = loginResponse.data.data.token;
      require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));
      console.log('\n💾 Updated credentials saved');

      console.log('\n🎉 Direct tenant service authentication is working!');
      console.log('Now we need to test through the API gateway...');

    } else {
      console.error('❌ Direct auth login failed:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testTenantServiceDirect();
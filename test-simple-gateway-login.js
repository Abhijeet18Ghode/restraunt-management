#!/usr/bin/env node

const axios = require('axios');

async function testSimpleLogin() {
  console.log('🧪 Testing Simple Gateway Login\n');

  try {
    const loginData = {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28',
      tenantId: '4a10f69e-bd5a-47ea-b7eb-6fd5aabba5aa'
    };

    console.log('Sending login request...');
    console.log('Data:', JSON.stringify(loginData, null, 2));

    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Save the token
    const credentials = {
      email: loginData.email,
      password: loginData.password,
      tenantId: loginData.tenantId,
      token: response.data.data.token,
      businessName: 'Maratha Cafe',
      adminUserId: response.data.data.user.id
    };

    require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));
    console.log('\n💾 Credentials saved to login-credentials.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

testSimpleLogin();
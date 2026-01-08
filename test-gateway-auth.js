#!/usr/bin/env node

const axios = require('axios');

async function testGatewayAuth() {
  console.log('🧪 Testing Gateway Auth with Real Tenant Service\n');

  try {
    // Test 1: Simple login without tenant ID (let service auto-detect)
    console.log('1. Testing login without tenant ID...');
    const loginData1 = {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    };

    const response1 = await axios.post('http://localhost:3000/api/auth/login', loginData1, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login without tenant ID successful!');
    console.log('Response:', JSON.stringify(response1.data, null, 2));

  } catch (error1) {
    console.log('❌ Login without tenant ID failed:', error1.message);
    
    // Test 2: Login with tenant ID
    try {
      console.log('\n2. Testing login with tenant ID...');
      const loginData2 = {
        email: 'ghodeabhijeet18@gmail.com',
        password: 'ShreeSwamiSamarth@28',
        tenantId: '4a10f69e-bd5a-47ea-b7eb-6fd5aabba5aa'
      };

      const response2 = await axios.post('http://localhost:3000/api/auth/login', loginData2, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Login with tenant ID successful!');
      console.log('Response:', JSON.stringify(response2.data, null, 2));

    } catch (error2) {
      console.log('❌ Login with tenant ID also failed:', error2.message);
      if (error2.response) {
        console.log('Status:', error2.response.status);
        console.log('Response:', error2.response.data);
      }

      // Test 3: Check if tenant service is reachable directly
      console.log('\n3. Testing direct tenant service access...');
      try {
        const loginData3 = {
          email: 'ghodeabhijeet18@gmail.com',
          password: 'ShreeSwamiSamarth@28',
          tenantId: '4a10f69e-bd5a-47ea-b7eb-6fd5aabba5aa'
        };

        const directResponse = await axios.post('http://localhost:3001/auth/login', loginData3, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Direct tenant service login works!');
        console.log('Direct response:', JSON.stringify(directResponse.data, null, 2));
        console.log('\n🔍 Issue is with API Gateway routing, not tenant service');

      } catch (directError) {
        console.log('❌ Direct tenant service also failed:', directError.message);
        if (directError.response) {
          console.log('Direct Status:', directError.response.status);
          console.log('Direct Response:', directError.response.data);
        }
      }
    }
  }
}

testGatewayAuth();
const axios = require('axios');

async function testAnalyticsDirect() {
  console.log('🔍 Testing Analytics Service Direct Routes...\n');

  try {
    // First login to get token
    console.log('📋 Step 1: Login to get auth token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    console.log('✅ Login successful');

    // Test different route variations on analytics service directly
    const testRoutes = [
      'http://localhost:3008/dashboard',
      'http://localhost:3008/api/analytics/dashboard',
      'http://localhost:3008/analytics/dashboard'
    ];

    for (const route of testRoutes) {
      console.log(`\n📋 Testing route: ${route}`);
      try {
        const response = await axios.get(`${route}?outletId=default&period=7d`, {
          headers: authHeaders,
          timeout: 5000
        });
        console.log(`✅ Success:`, response.data);
      } catch (error) {
        console.log(`❌ Failed:`, {
          status: error.response?.status,
          message: error.response?.data?.error || error.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAnalyticsDirect();
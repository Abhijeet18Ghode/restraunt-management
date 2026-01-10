const axios = require('axios');

async function simpleTest() {
  console.log('🔍 Simple Analytics Test...\n');

  try {
    // Test analytics service health
    console.log('📋 Testing analytics health...');
    const healthResponse = await axios.get('http://localhost:3008/health');
    console.log('✅ Analytics health:', healthResponse.data);

    // Test login
    console.log('\n📋 Testing login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });
    console.log('✅ Login successful');

    const token = loginResponse.data.data.token;

    // Test analytics dashboard via gateway
    console.log('\n📋 Testing analytics dashboard via gateway...');
    const dashboardResponse = await axios.get('http://localhost:3000/api/analytics/dashboard?outletId=default&period=7d', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Dashboard response:', dashboardResponse.data);

  } catch (error) {
    console.error('❌ Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
  }
}

simpleTest();
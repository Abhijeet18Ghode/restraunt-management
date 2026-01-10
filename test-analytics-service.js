const axios = require('axios');

async function testAnalyticsService() {
  console.log('🔍 Testing Analytics Service...\n');

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

    // Test analytics service health directly
    console.log('\n📋 Step 2: Test analytics service health directly...');
    try {
      const healthResponse = await axios.get('http://localhost:3008/health', { timeout: 5000 });
      console.log('✅ Analytics service health:', healthResponse.data);
    } catch (healthError) {
      console.log('❌ Analytics service health failed:', healthError.message);
    }

    // Test analytics service via API gateway
    console.log('\n📋 Step 3: Test analytics service via API gateway...');
    try {
      const gatewayResponse = await axios.get('http://localhost:3000/api/analytics/dashboard?outletId=default&period=7d', {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Analytics via gateway:', gatewayResponse.data);
    } catch (gatewayError) {
      console.log('❌ Analytics via gateway failed:', {
        status: gatewayError.response?.status,
        message: gatewayError.response?.data?.message || gatewayError.message,
        data: gatewayError.response?.data
      });
    }

    // Test API gateway service status
    console.log('\n📋 Step 4: Check API gateway service status...');
    try {
      const statusResponse = await axios.get('http://localhost:3000/services/status', { timeout: 10000 });
      console.log('✅ Gateway service status:', {
        analyticsService: statusResponse.data.health['analytics-service'],
        tenantService: statusResponse.data.health['tenant-service']
      });
    } catch (statusError) {
      console.log('❌ Gateway status failed:', statusError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAnalyticsService();
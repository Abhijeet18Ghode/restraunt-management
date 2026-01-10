const axios = require('axios');

async function testAnalyticsBypassAuth() {
  console.log('🔍 Testing Analytics Service (Bypass Auth)...\n');

  try {
    // Test analytics service health
    console.log('📋 Testing analytics health...');
    const healthResponse = await axios.get('http://localhost:3008/health');
    console.log('✅ Analytics health:', healthResponse.data);

    // Test analytics dashboard directly (without auth for now)
    console.log('\n📋 Testing analytics dashboard directly...');
    try {
      const dashboardResponse = await axios.get('http://localhost:3008/dashboard?outletId=default&period=7d');
      console.log('✅ Dashboard response:', dashboardResponse.data);
    } catch (dashError) {
      console.log('❌ Dashboard error (expected - needs auth):', {
        status: dashError.response?.status,
        message: dashError.response?.data?.error || dashError.message
      });
    }

    // Test if the route exists by checking 401 vs 404
    console.log('\n📋 Testing route existence...');
    try {
      const routeResponse = await axios.get('http://localhost:3008/dashboard');
      console.log('✅ Route exists:', routeResponse.data);
    } catch (routeError) {
      if (routeError.response?.status === 401) {
        console.log('✅ Route exists but requires authentication (good!)');
      } else if (routeError.response?.status === 404) {
        console.log('❌ Route not found - this is the problem!');
      } else {
        console.log('❌ Other error:', {
          status: routeError.response?.status,
          message: routeError.response?.data?.error || routeError.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAnalyticsBypassAuth();
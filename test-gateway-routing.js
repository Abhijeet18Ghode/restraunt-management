const axios = require('axios');

async function testGatewayRouting() {
  console.log('🔍 Testing API Gateway Routing...\n');

  try {
    // Test gateway health
    console.log('📋 Testing gateway health...');
    const gatewayHealth = await axios.get('http://localhost:3000/health');
    console.log('✅ Gateway health:', gatewayHealth.data);

    // Test gateway service status
    console.log('\n📋 Testing gateway service status...');
    const serviceStatus = await axios.get('http://localhost:3000/services/status');
    console.log('✅ Analytics service status:', serviceStatus.data.health['analytics-service']);

    // Test analytics route without auth (should get 401, not 404)
    console.log('\n📋 Testing analytics route via gateway (no auth)...');
    try {
      const analyticsResponse = await axios.get('http://localhost:3000/api/analytics/dashboard');
      console.log('✅ Analytics response:', analyticsResponse.data);
    } catch (analyticsError) {
      if (analyticsError.response?.status === 401) {
        console.log('✅ Gateway routing works - got 401 (auth required)');
      } else if (analyticsError.response?.status === 404) {
        console.log('❌ Gateway routing broken - got 404 (route not found)');
        console.log('Error details:', analyticsError.response?.data);
      } else {
        console.log('❓ Unexpected status:', {
          status: analyticsError.response?.status,
          data: analyticsError.response?.data
        });
      }
    }

    // Test with a fake token to see if routing works
    console.log('\n📋 Testing analytics route via gateway (fake token)...');
    try {
      const fakeTokenResponse = await axios.get('http://localhost:3000/api/analytics/dashboard', {
        headers: { 'Authorization': 'Bearer fake-token' }
      });
      console.log('✅ Fake token response:', fakeTokenResponse.data);
    } catch (fakeTokenError) {
      if (fakeTokenError.response?.status === 401) {
        console.log('✅ Gateway routing works - got 401 (invalid token)');
      } else if (fakeTokenError.response?.status === 404) {
        console.log('❌ Gateway routing broken - got 404 (route not found)');
      } else {
        console.log('❓ Unexpected status:', {
          status: fakeTokenError.response?.status,
          data: fakeTokenError.response?.data
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

testGatewayRouting();
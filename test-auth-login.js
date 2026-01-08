const axios = require('axios');

async function testAuthLogin() {
  try {
    console.log('Testing auth login...');
    
    // Test direct staff service
    console.log('\n1. Testing staff service directly (port 3006):');
    try {
      const directResponse = await axios.post('http://localhost:3006/api/auth/login', {
        email: 'admin@restaurant.com',
        password: 'admin123'
      });
      console.log('✅ Direct staff service login successful:', directResponse.data);
    } catch (error) {
      console.log('❌ Direct staff service login failed:', error.response?.data || error.message);
    }

    // Test through API Gateway
    console.log('\n2. Testing through API Gateway (port 3000):');
    try {
      const gatewayResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'admin@restaurant.com',
        password: 'admin123'
      });
      console.log('✅ API Gateway auth login successful:', gatewayResponse.data);
    } catch (error) {
      console.log('❌ API Gateway auth login failed:', error.response?.data || error.message);
    }

    // Test staff service health
    console.log('\n3. Testing staff service health:');
    try {
      const healthResponse = await axios.get('http://localhost:3006/health');
      console.log('✅ Staff service health:', healthResponse.data);
    } catch (error) {
      console.log('❌ Staff service health failed:', error.message);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuthLogin();
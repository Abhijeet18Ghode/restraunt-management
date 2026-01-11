const axios = require('axios');

async function testSimpleAuth() {
  console.log('🔍 Testing Simple Analytics Auth...\n');

  try {
    // Step 1: Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, got token');

    // Step 2: Test analytics auth with a simple endpoint
    console.log('\n📋 Testing analytics auth...');
    try {
      const response = await axios.get('http://localhost:3000/api/analytics/sales?outletId=test&period=7d', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Analytics auth successful! Status:', response.status);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Still getting 401 - auth failed');
      } else if (error.response?.status === 500) {
        console.log('✅ Auth passed! Got 500 (database error) - this is expected');
      } else {
        console.log('❓ Unexpected status:', error.response?.status, error.response?.data?.error);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleAuth();
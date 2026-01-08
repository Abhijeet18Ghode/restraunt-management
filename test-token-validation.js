const axios = require('axios');

async function testTokenValidation() {
  try {
    console.log('🔍 Testing Token Validation...\n');

    // First, login to get a token
    console.log('1. Getting a fresh token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Got token:', token.substring(0, 50) + '...');

    // Now test token validation
    console.log('\n2. Testing token validation...');
    try {
      const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Token validation successful');
      console.log('Response:', JSON.stringify(validateResponse.data, null, 2));
    } catch (validateError) {
      console.log('❌ Token validation failed');
      console.log('Status:', validateError.response?.status);
      console.log('Response:', JSON.stringify(validateError.response?.data, null, 2));
      
      // Check if the endpoint exists
      if (validateError.response?.status === 404) {
        console.log('\n🔍 Checking available auth endpoints...');
        try {
          const healthResponse = await axios.get('http://localhost:3000/api/auth/');
          console.log('Auth service response:', healthResponse.data);
        } catch (healthError) {
          console.log('Auth service not responding:', healthError.message);
        }
      }
    }

    // Test with a malformed token
    console.log('\n3. Testing with invalid token...');
    try {
      const invalidResponse = await axios.get('http://localhost:3000/api/auth/validate', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('⚠️  Invalid token accepted (this should not happen)');
    } catch (invalidError) {
      console.log('✅ Invalid token properly rejected');
      console.log('Status:', invalidError.response?.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testTokenValidation();
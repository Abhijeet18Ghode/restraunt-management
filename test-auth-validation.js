const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testAuthValidation() {
  console.log('🔍 Testing Auth Validation Endpoint...\n');

  try {
    // Step 1: Login to get token
    console.log('📋 Step 1: Login to get token...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Test validation endpoint
    console.log('\n📋 Step 2: Test validation endpoint...');
    const validateResponse = await axios.get(`${API_BASE}/auth/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Validation response structure:');
    console.log('  - success:', validateResponse.data.success);
    console.log('  - data:', validateResponse.data.data);
    console.log('  - user:', validateResponse.data.user);
    console.log('  - message:', validateResponse.data.message);
    
    console.log('\n📋 Full validation response:');
    console.log(JSON.stringify(validateResponse.data, null, 2));

    // Step 3: Test what the frontend authService expects
    console.log('\n📋 Step 3: Frontend authService expectation...');
    if (validateResponse.data.success) {
      const userData = validateResponse.data.user || validateResponse.data.data;
      console.log('✅ User data that should be returned:', userData);
    }

  } catch (error) {
    console.error('❌ Auth validation test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAuthValidation();
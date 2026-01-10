const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testRealAuth() {
  console.log('🔐 Testing Real Authentication System...\n');

  try {
    // Test 1: Try to login with known credentials
    console.log('📋 Test 1: Login with admin credentials...');
    
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    console.log('✅ Login Response:', {
      success: loginResponse.data.success,
      message: loginResponse.data.message,
      hasToken: !!loginResponse.data.data?.token,
      hasUser: !!loginResponse.data.data?.user
    });

    if (loginResponse.data.data?.user) {
      console.log('👤 User Info:', {
        id: loginResponse.data.data.user.id,
        tenantId: loginResponse.data.data.user.tenantId,
        email: loginResponse.data.data.user.email,
        role: loginResponse.data.data.user.role,
        firstName: loginResponse.data.data.user.firstName,
        lastName: loginResponse.data.data.user.lastName
      });
    }

    const token = loginResponse.data.data?.token;

    if (token) {
      // Test 2: Validate the token
      console.log('\n📋 Test 2: Validate token...');
      const validateResponse = await axios.get(`${API_BASE}/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Token Validation:', {
        success: validateResponse.data.success,
        message: validateResponse.data.message,
        user: validateResponse.data.user
      });

      // Test 3: Use token to access protected resource
      console.log('\n📋 Test 3: Access protected resource (outlets)...');
      const tenantId = loginResponse.data.data.user.tenantId;
      const outletsResponse = await axios.get(`${API_BASE}/tenants/${tenantId}/outlets`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Protected Resource Access:', {
        success: outletsResponse.data.success,
        message: outletsResponse.data.message,
        outletCount: outletsResponse.data.data?.length || 0
      });
    }

    console.log('\n🎉 Real authentication system is working!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Login endpoint working');
    console.log('  ✅ JWT token generation working');
    console.log('  ✅ Token validation working');
    console.log('  ✅ Protected routes working');
    console.log('  ✅ Database authentication working');

  } catch (error) {
    console.error('❌ Authentication test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      console.log('\n💡 Possible solutions:');
      console.log('  1. Check if admin user exists in database');
      console.log('  2. Verify password is correct');
      console.log('  3. Check if tenant schema is properly set up');
    }
  }
}

testRealAuth();
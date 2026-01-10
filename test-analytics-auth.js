const axios = require('axios');

async function testAnalyticsAuth() {
  console.log('🔍 Testing Analytics Authentication...\n');

  try {
    // Step 1: Login to get token
    console.log('📋 Step 1: Login to get auth token...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful:', {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role
    });

    // Step 2: Test token validation
    console.log('\n📋 Step 2: Validate token...');
    const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Token validation:', {
      success: validateResponse.data.success,
      userId: validateResponse.data.user?.id,
      tenantId: validateResponse.data.user?.tenantId,
      role: validateResponse.data.user?.role
    });

    // Step 3: Test analytics service directly with token
    console.log('\n📋 Step 3: Test analytics service directly with token...');
    try {
      const analyticsDirectResponse = await axios.get('http://localhost:3008/dashboard?outletId=default&period=7d', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Analytics direct response:', analyticsDirectResponse.data);
    } catch (analyticsDirectError) {
      console.log('❌ Analytics direct error:', {
        status: analyticsDirectError.response?.status,
        message: analyticsDirectError.response?.data?.error || analyticsDirectError.message,
        data: analyticsDirectError.response?.data
      });
    }

    // Step 4: Test analytics via API gateway with token
    console.log('\n📋 Step 4: Test analytics via API gateway with token...');
    try {
      const analyticsGatewayResponse = await axios.get('http://localhost:3000/api/analytics/dashboard?outletId=default&period=7d', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Analytics gateway response:', analyticsGatewayResponse.data);
    } catch (analyticsGatewayError) {
      console.log('❌ Analytics gateway error:', {
        status: analyticsGatewayError.response?.status,
        message: analyticsGatewayError.response?.data?.error || analyticsGatewayError.message,
        data: analyticsGatewayError.response?.data
      });
    }

    // Step 5: Decode the JWT token to see what's inside
    console.log('\n📋 Step 5: Decode JWT token...');
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.decode(token);
      console.log('✅ JWT token contents:', {
        id: decoded.id,
        tenantId: decoded.tenantId,
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (decodeError) {
      console.log('❌ JWT decode error:', decodeError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAnalyticsAuth();
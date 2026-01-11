const axios = require('axios');

async function testAnalyticsAuth() {
  console.log('🔍 Testing Analytics Authentication Issue...\n');

  try {
    // Step 1: Login to get token
    console.log('📋 Step 1: Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    console.log('📋 Login response structure:', JSON.stringify(loginResponse.data, null, 2));

    // Handle different response structures
    let token, user;
    if (loginResponse.data.data) {
      token = loginResponse.data.data.token;
      user = loginResponse.data.data.user;
    } else if (loginResponse.data.token) {
      token = loginResponse.data.token;
      user = loginResponse.data.user;
    } else {
      throw new Error('Unexpected login response structure');
    }
    console.log('✅ Login successful:', {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role
    });

    // Step 2: Test analytics API with proper headers
    console.log('\n📋 Step 2: Test analytics API with auth token...');
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    try {
      const analyticsResponse = await axios.get('http://localhost:3000/api/analytics/dashboard?outletId=c1af171d-65c9-40b8-bff3-81761d719995&period=7d', {
        headers: authHeaders,
        timeout: 10000
      });
      
      console.log('✅ Analytics API successful:', {
        success: analyticsResponse.data.success,
        dataKeys: Object.keys(analyticsResponse.data.data || {})
      });
    } catch (analyticsError) {
      console.log('❌ Analytics API failed:', {
        status: analyticsError.response?.status,
        statusText: analyticsError.response?.statusText,
        error: analyticsError.response?.data?.error || analyticsError.message,
        headers: analyticsError.response?.headers
      });

      // Check if it's an auth issue
      if (analyticsError.response?.status === 401) {
        console.log('\n🔍 Debugging 401 error...');
        
        // Test token validation directly
        console.log('📋 Testing token validation...');
        try {
          const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
            headers: authHeaders
          });
          console.log('✅ Token validation successful:', validateResponse.data);
        } catch (validateError) {
          console.log('❌ Token validation failed:', {
            status: validateError.response?.status,
            error: validateError.response?.data
          });
        }

        // Test analytics service directly (bypass gateway)
        console.log('\n📋 Testing analytics service directly...');
        try {
          const directResponse = await axios.get('http://localhost:3008/dashboard?outletId=c1af171d-65c9-40b8-bff3-81761d719995&period=7d', {
            headers: authHeaders
          });
          console.log('✅ Direct analytics service successful:', directResponse.data);
        } catch (directError) {
          console.log('❌ Direct analytics service failed:', {
            status: directError.response?.status,
            error: directError.response?.data?.error || directError.message
          });
        }
      }
    }

    // Step 3: Check JWT token content
    console.log('\n📋 Step 3: Analyzing JWT token...');
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('📋 Token payload:', {
          userId: payload.id,
          tenantId: payload.tenantId,
          role: payload.role,
          exp: new Date(payload.exp * 1000).toISOString(),
          iat: new Date(payload.iat * 1000).toISOString()
        });
      } catch (e) {
        console.log('❌ Could not decode token payload');
      }
    }

    // Step 4: Check analytics service environment
    console.log('\n📋 Step 4: Checking analytics service health...');
    try {
      const healthResponse = await axios.get('http://localhost:3008/health');
      console.log('✅ Analytics service health:', healthResponse.data);
    } catch (healthError) {
      console.log('❌ Analytics service health check failed:', healthError.message);
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
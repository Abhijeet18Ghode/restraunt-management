const axios = require('axios');

async function testAnalyticsDashboard() {
  console.log('🔍 Testing Analytics Dashboard...\n');

  try {
    // Step 1: Login
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');

    // Step 2: Get outlets to see what outlet IDs are available
    console.log('\n📋 Getting outlets...');
    const outletsResponse = await axios.get(`http://localhost:3000/api/tenants/${user.tenantId}/outlets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('✅ Outlets response:', {
      success: outletsResponse.data.success,
      outletCount: outletsResponse.data.data?.length || 0,
      outlets: outletsResponse.data.data
    });

    // Step 3: Test analytics with different outlet IDs
    const testOutletIds = [
      'c1af171d-65c9-40b8-bff3-81761d719995', // From the original error
      'default', // Fallback value
      null, // No outlet ID
    ];

    if (outletsResponse.data.data?.length > 0) {
      testOutletIds.unshift(outletsResponse.data.data[0].id);
    }

    for (const outletId of testOutletIds) {
      console.log(`\n📋 Testing analytics with outletId: ${outletId}`);
      try {
        const url = outletId 
          ? `http://localhost:3000/api/analytics/dashboard?outletId=${outletId}&period=7d`
          : `http://localhost:3000/api/analytics/dashboard?period=7d`;
          
        const analyticsResponse = await axios.get(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 5000
        });
        
        console.log('✅ Analytics successful!', {
          status: analyticsResponse.status,
          dataKeys: Object.keys(analyticsResponse.data.data || {})
        });
        break; // Success, no need to try other outlet IDs
        
      } catch (error) {
        console.log('❌ Analytics failed:', {
          status: error.response?.status,
          error: error.response?.data?.error || error.message
        });
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testAnalyticsDashboard();
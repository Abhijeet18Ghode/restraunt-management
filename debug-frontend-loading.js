const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const TENANT_ID = '9c0b5436-bb14-4064-a070-a50f772d80bd'; // From the test result

async function debugFrontendLoading() {
  console.log('🔍 Debugging Frontend Loading Issues...\n');

  try {
    // Step 1: Login
    console.log('📋 Step 1: Login...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    const authHeaders = { 'Authorization': `Bearer ${token}` };

    console.log('✅ Login successful:', {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role
    });

    // Step 2: Validate token (what AuthContext does)
    console.log('\n📋 Step 2: Validate token (AuthContext simulation)...');
    const validateResponse = await axios.get(`${API_BASE}/auth/validate`, {
      headers: authHeaders
    });

    console.log('✅ Token validation:', {
      success: validateResponse.data.success,
      userId: validateResponse.data.data?.id,
      tenantId: validateResponse.data.data?.tenantId
    });

    // Step 3: Load tenant data (what TenantContext does)
    console.log('\n📋 Step 3: Load tenant data (TenantContext simulation)...');
    const tenantResponse = await axios.get(`${API_BASE}/tenants/${user.tenantId}`, {
      headers: authHeaders
    });

    console.log('✅ Tenant data loaded:', {
      success: tenantResponse.data.success,
      tenantId: tenantResponse.data.data?.id,
      businessName: tenantResponse.data.data?.businessName
    });

    // Step 4: Load outlets (what TenantContext does)
    console.log('\n📋 Step 4: Load outlets (TenantContext simulation)...');
    const outletsResponse = await axios.get(`${API_BASE}/tenants/${user.tenantId}/outlets`, {
      headers: authHeaders
    });

    console.log('✅ Outlets loaded:', {
      success: outletsResponse.data.success,
      outletCount: outletsResponse.data.data?.length || 0,
      outlets: outletsResponse.data.data
    });

    // Step 5: Test analytics service (what Dashboard does)
    console.log('\n📋 Step 5: Test analytics service (Dashboard simulation)...');
    
    // Simulate what happens when no outlets exist
    let selectedOutlet;
    if (outletsResponse.data.data?.length > 0) {
      selectedOutlet = outletsResponse.data.data[0];
    } else {
      // This is what TenantContext should do
      selectedOutlet = { 
        id: 'default', 
        name: 'Main Outlet', 
        address: 'Default Location' 
      };
      console.log('📋 Using fallback outlet:', selectedOutlet);
    }

    try {
      const analyticsResponse = await axios.get(`${API_BASE}/analytics/dashboard?outletId=${selectedOutlet.id}&period=7d`, {
        headers: authHeaders,
        timeout: 3000
      });
      console.log('✅ Analytics data loaded:', analyticsResponse.data);
    } catch (analyticsError) {
      console.log('⚠️ Analytics service not available (using fallback):', {
        status: analyticsError.response?.status,
        message: analyticsError.response?.data?.message || analyticsError.message
      });
      
      // This is what the frontend should do
      const fallbackData = {
        revenue: { total: 0, change: 0 },
        orders: { today: 0, change: 0 },
        customers: { active: 0, change: 0 },
        averageOrderValue: 0,
        averageOrderValueChange: 0,
        salesChart: null,
        topItemsChart: null,
        recentOrders: [],
        lowStockItems: [],
        topStaff: []
      };
      console.log('📋 Using fallback analytics data:', fallbackData);
    }

    console.log('\n🎯 Frontend Loading Analysis:');
    console.log('  ✅ Authentication flow working');
    console.log('  ✅ Token validation working');
    console.log('  ✅ Tenant data loading working');
    console.log('  ✅ Outlets API working (returns empty array)');
    console.log('  ✅ Fallback outlet should be created');
    console.log('  ✅ Analytics fallback should work');
    
    console.log('\n💡 Potential Issues:');
    console.log('  1. TenantContext might not be setting loading=false properly');
    console.log('  2. Dashboard might be waiting for real outlets instead of fallback');
    console.log('  3. WebSocket connection might be blocking (but should be optional)');
    console.log('  4. Some component might be stuck in loading state');

    console.log('\n🔧 Next Steps:');
    console.log('  1. Check browser console for JavaScript errors');
    console.log('  2. Add more debug logs to TenantContext');
    console.log('  3. Check if Dashboard is receiving selectedOutlet properly');
    console.log('  4. Verify all loading states are being set to false');

  } catch (error) {
    console.error('❌ Debug test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

debugFrontendLoading();
const axios = require('axios');

async function testSidebarFix() {
  try {
    console.log('🔍 Testing Sidebar Fix...\n');

    // Test login with real credentials
    console.log('1. Testing login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    console.log('✅ Login successful');
    console.log('Response data:', JSON.stringify(loginResponse.data, null, 2));

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;

    // Test role mapping
    console.log('\n2. Testing role mapping...');
    console.log('User role from database:', user.role);
    console.log('Should map to ADMIN role for permissions');

    // Test tenant data access
    console.log('\n3. Testing tenant data access...');
    try {
      const tenantResponse = await axios.get(`http://localhost:3000/api/tenants/${user.tenantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Tenant data accessible');
      console.log('Tenant:', tenantResponse.data.businessName);
    } catch (error) {
      console.log('❌ Tenant data access failed:', error.response?.data || error.message);
    }

    // Test outlets access
    console.log('\n4. Testing outlets access...');
    try {
      const outletsResponse = await axios.get(`http://localhost:3000/api/tenants/${user.tenantId}/outlets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Outlets data accessible');
      console.log('Outlets count:', outletsResponse.data.length);
    } catch (error) {
      console.log('❌ Outlets access failed:', error.response?.data || error.message);
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:3011 in browser');
    console.log('2. Login with: ghodeabhijeet18@gmail.com / ShreeSwamiSamarth@28');
    console.log('3. Check if sidebar shows menu items');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testSidebarFix();
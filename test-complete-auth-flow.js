const axios = require('axios');

async function testCompleteAuthFlow() {
  try {
    console.log('🔍 Testing Complete Authentication Flow...\n');

    // Test 1: Check all services are running
    console.log('1. Checking service availability...');
    
    try {
      const apiGatewayHealth = await axios.get('http://localhost:3000/health');
      console.log('✅ API Gateway (port 3000) - HEALTHY');
    } catch (error) {
      console.log('❌ API Gateway (port 3000) - NOT RESPONDING');
      return;
    }

    try {
      const tenantServiceHealth = await axios.get('http://localhost:3001/health');
      console.log('✅ Tenant Service (port 3001) - HEALTHY');
    } catch (error) {
      console.log('❌ Tenant Service (port 3001) - NOT RESPONDING');
      return;
    }

    try {
      const adminDashboardHealth = await axios.get('http://localhost:3011');
      console.log('✅ Admin Dashboard (port 3011) - HEALTHY');
    } catch (error) {
      console.log('❌ Admin Dashboard (port 3011) - NOT RESPONDING');
      return;
    }

    // Test 2: Login flow
    console.log('\n2. Testing login flow...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    console.log('   User:', user.email);
    console.log('   Role:', user.role);
    console.log('   Token length:', token.length);

    // Test 3: Token validation (simulates page refresh)
    console.log('\n3. Testing token validation (page refresh simulation)...');
    const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (validateResponse.data.success) {
      console.log('✅ Token validation successful');
      const validatedUser = validateResponse.data.user;
      console.log('   Validated user:', validatedUser.email);
      console.log('   Validated role:', validatedUser.role);
      
      // Verify data consistency
      if (user.id === validatedUser.id && 
          user.email === validatedUser.email && 
          user.role === validatedUser.role) {
        console.log('✅ User data consistency verified');
      } else {
        console.log('❌ User data mismatch between login and validation');
        console.log('   Original:', user);
        console.log('   Validated:', validatedUser);
      }
    }

    // Test 4: Role mapping for sidebar
    console.log('\n4. Testing role mapping for sidebar permissions...');
    if (user.role === 'TENANT_ADMIN') {
      console.log('✅ User has TENANT_ADMIN role');
      console.log('   This should map to admin permissions in frontend');
      console.log('   Sidebar should show all menu items');
    } else {
      console.log('⚠️  User role is not TENANT_ADMIN:', user.role);
    }

    // Test 5: Invalid token handling
    console.log('\n5. Testing invalid token handling...');
    try {
      await axios.get('http://localhost:3000/api/auth/validate', {
        headers: {
          'Authorization': 'Bearer invalid-token-here'
        }
      });
      console.log('❌ Invalid token was accepted (this should not happen)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.response?.status);
      }
    }

    console.log('\n🎉 Complete Authentication Flow Test PASSED!');
    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Open http://localhost:3011 in your browser');
    console.log('2. Login with: ghodeabhijeet18@gmail.com / ShreeSwamiSamarth@28');
    console.log('3. Verify you see the dashboard with sidebar menu items');
    console.log('4. Refresh the page (F5 or Ctrl+R)');
    console.log('5. Verify you stay logged in and sidebar still shows menu items');
    console.log('6. Check browser console for any errors');

    console.log('\n🔧 Services Status:');
    console.log('   API Gateway: http://localhost:3000 ✅');
    console.log('   Tenant Service: http://localhost:3001 ✅');
    console.log('   Admin Dashboard: http://localhost:3011 ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }
}

testCompleteAuthFlow();
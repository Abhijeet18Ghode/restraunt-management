const axios = require('axios');

async function testAuthContextFix() {
  try {
    console.log('🔍 Testing Auth Context Fix...\n');

    // Step 1: Login and get token
    console.log('1. Logging in...');
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
    console.log('User:', user.email, 'Role:', user.role);

    // Step 2: Simulate what happens on page refresh - validate the token
    console.log('\n2. Simulating page refresh - validating stored token...');
    const validateResponse = await axios.get('http://localhost:3000/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (validateResponse.data.success) {
      console.log('✅ Token validation successful');
      console.log('Validated user:', validateResponse.data.user.email, 'Role:', validateResponse.data.user.role);
      
      // Check if user data matches
      const originalUser = user;
      const validatedUser = validateResponse.data.user;
      
      if (originalUser.id === validatedUser.id && 
          originalUser.email === validatedUser.email && 
          originalUser.role === validatedUser.role) {
        console.log('✅ User data consistency verified');
      } else {
        console.log('❌ User data mismatch between login and validation');
      }
    } else {
      console.log('❌ Token validation failed');
    }

    // Step 3: Test with expired/invalid token
    console.log('\n3. Testing with invalid token...');
    try {
      await axios.get('http://localhost:3000/api/auth/validate', {
        headers: {
          'Authorization': 'Bearer invalid-token-here'
        }
      });
      console.log('⚠️  Invalid token was accepted (this should not happen)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.response?.data);
      }
    }

    console.log('\n🎉 Auth Context Fix Test Complete!');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:3011 in browser');
    console.log('2. Login with credentials');
    console.log('3. Refresh the page - should stay logged in');
    console.log('4. Check that sidebar shows menu items');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }
}

testAuthContextFix();
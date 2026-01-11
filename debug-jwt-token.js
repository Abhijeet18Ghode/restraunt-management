const axios = require('axios');
const jwt = require('jsonwebtoken');

async function debugJWTToken() {
  console.log('🔍 Debugging JWT Token Structure...\n');

  try {
    // Step 1: Login to get token
    console.log('📋 Step 1: Login...');
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'ghodeabhijeet18@gmail.com',
      password: 'ShreeSwamiSamarth@28'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Decode token manually with the same secret
    console.log('\n📋 Step 2: Decoding token with JWT secret...');
    try {
      const decoded = jwt.verify(token, 'your-super-secret-jwt-key-change-in-production');
      console.log('✅ Token decoded successfully:', JSON.stringify(decoded, null, 2));
      
      // Check what fields are available
      console.log('\n📋 Available fields in token:');
      Object.keys(decoded).forEach(key => {
        console.log(`  - ${key}: ${decoded[key]}`);
      });
      
    } catch (jwtError) {
      console.log('❌ JWT decode failed:', jwtError.message);
    }

    // Step 3: Test what the analytics service receives
    console.log('\n📋 Step 3: Testing analytics service auth middleware simulation...');
    
    // Simulate what the analytics auth middleware does
    const authHeader = `Bearer ${token}`;
    const extractedToken = authHeader.replace('Bearer ', '');
    
    try {
      const decoded = jwt.verify(extractedToken, 'your-super-secret-jwt-key-change-in-production');
      console.log('✅ Analytics middleware simulation - token decoded:', {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role,
        email: decoded.email
      });
      
      // Check if role exists and is valid
      const validRoles = ['admin', 'manager', 'inventory_manager'];
      console.log('📋 Role validation:');
      console.log(`  - User role: ${decoded.role}`);
      console.log(`  - Valid roles: ${validRoles.join(', ')}`);
      console.log(`  - Role is valid: ${validRoles.includes(decoded.role)}`);
      
    } catch (analyticsError) {
      console.log('❌ Analytics middleware simulation failed:', analyticsError.message);
    }

    // Step 4: Check role mapping
    console.log('\n📋 Step 4: Checking role mapping...');
    const userRole = 'TENANT_ADMIN';
    const analyticsValidRoles = ['admin', 'manager'];
    
    console.log(`User has role: ${userRole}`);
    console.log(`Analytics expects: ${analyticsValidRoles.join(' or ')}`);
    console.log(`Role match: ${analyticsValidRoles.includes(userRole)}`);
    
    // The issue might be here - TENANT_ADMIN vs admin/manager

  } catch (error) {
    console.error('❌ Debug failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

debugJWTToken();
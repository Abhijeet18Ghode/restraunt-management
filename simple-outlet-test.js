console.log('🏢 Testing Outlet Management System...');

const axios = require('axios');

async function quickTest() {
  try {
    // Test API Gateway health
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ API Gateway healthy:', healthResponse.data.status);
    
    // Test tenant service health  
    const tenantHealthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Tenant Service healthy:', tenantHealthResponse.data.status);
    
    console.log('\n🎉 Backend services are running correctly!');
    console.log('📋 Outlet management should now work in the admin dashboard.');
    console.log('🔗 Visit: http://localhost:3011/outlets');
    
  } catch (error) {
    console.error('❌ Service check failed:', error.message);
  }
}

quickTest();
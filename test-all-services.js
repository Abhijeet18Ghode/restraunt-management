const axios = require('axios');

// Service configuration
const services = [
  { name: 'API Gateway', url: 'http://localhost:3000/health' },
  { name: 'Tenant Service', url: 'http://localhost:3001/health' },
  { name: 'Menu Service', url: 'http://localhost:3002/health' },
  { name: 'Inventory Service', url: 'http://localhost:3003/health' },
  { name: 'POS Service', url: 'http://localhost:3004/health' },
  { name: 'Online Order Service', url: 'http://localhost:3005/health' },
  { name: 'Staff Service', url: 'http://localhost:3006/health' },
  { name: 'Customer Service', url: 'http://localhost:3007/health' },
  { name: 'Analytics Service', url: 'http://localhost:3008/health' },
  { name: 'Payment Service', url: 'http://localhost:3009/health' },
  { name: 'WebSocket Service', url: 'http://localhost:3010/health' }
];

async function testService(service) {
  try {
    const response = await axios.get(service.url, { timeout: 5000 });
    return {
      name: service.name,
      status: 'ONLINE',
      statusCode: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'OFFLINE',
      error: error.code || error.message,
      statusCode: error.response?.status || 'N/A'
    };
  }
}

async function testAllServices() {
  console.log('🔍 Testing all backend services...\n');
  
  const results = await Promise.all(services.map(testService));
  
  console.log('📊 SERVICE STATUS REPORT');
  console.log('=' .repeat(60));
  
  let onlineCount = 0;
  let offlineCount = 0;
  
  results.forEach(result => {
    const status = result.status === 'ONLINE' ? '✅' : '❌';
    const statusText = result.status === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    
    console.log(`${status} ${result.name.padEnd(20)} | ${statusText.padEnd(8)} | ${result.statusCode}`);
    
    if (result.status === 'ONLINE') {
      onlineCount++;
    } else {
      offlineCount++;
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('=' .repeat(60));
  console.log(`📈 Summary: ${onlineCount} online, ${offlineCount} offline`);
  
  if (onlineCount > 0) {
    console.log('\n🎯 POSTMAN TESTING RECOMMENDATIONS:');
    console.log('1. Start with health checks for online services');
    console.log('2. Test direct service endpoints first');
    console.log('3. Then test through API Gateway routing');
    console.log('4. Focus on services that are responding');
  }
  
  if (offlineCount > 0) {
    console.log('\n⚠️  OFFLINE SERVICES:');
    results.filter(r => r.status === 'OFFLINE').forEach(service => {
      console.log(`   - ${service.name}: ${service.error}`);
    });
  }
  
  // Test API Gateway routing for online services
  if (results[0].status === 'ONLINE') {
    console.log('\n🌐 Testing API Gateway routing...');
    await testApiGatewayRouting();
  }
}

async function testApiGatewayRouting() {
  const gatewayTests = [
    { name: 'Service Status', url: 'http://localhost:3000/services/status' },
    { name: 'Tenant Route', url: 'http://localhost:3000/api/tenants' },
    { name: 'Auth Route', url: 'http://localhost:3000/api/auth/login', method: 'POST', data: { email: 'test', password: 'test' } }
  ];
  
  for (const test of gatewayTests) {
    try {
      const config = {
        method: test.method || 'GET',
        url: test.url,
        timeout: 5000
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      console.log(`✅ ${test.name}: ${response.status} - Working`);
    } catch (error) {
      const status = error.response?.status || 'TIMEOUT';
      console.log(`❌ ${test.name}: ${status} - ${error.code || error.message}`);
    }
  }
}

// Run the test
testAllServices().catch(console.error);
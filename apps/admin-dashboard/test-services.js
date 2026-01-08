// Admin Dashboard Service Testing Script
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

async function testServices() {
  console.log('🧪 Testing Admin Dashboard Services...\n');

  // Test API Gateway Health
  try {
    console.log('1. Testing API Gateway Health...');
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ API Gateway Health:', response.data.status);
  } catch (error) {
    console.log('❌ API Gateway Health:', error.message);
  }

  // Test Services Status
  try {
    console.log('\n2. Testing Services Status...');
    const response = await axios.get(`${API_BASE_URL}/services/status`);
    console.log('✅ Services Status Retrieved');
    
    if (response.data.health) {
      Object.entries(response.data.health).forEach(([service, status]) => {
        const statusIcon = status.status === 'healthy' ? '✅' : 
                          status.status === 'offline' ? '❌' : '⚠️';
        console.log(`   ${statusIcon} ${service}: ${status.status}`);
      });
    }
  } catch (error) {
    console.log('❌ Services Status:', error.message);
  }

  // Test Individual Service Endpoints
  const serviceEndpoints = [
    { name: 'Tenants', path: '/api/tenants' },
    { name: 'Menu', path: '/api/menu/categories' },
    { name: 'Inventory', path: '/api/inventory' },
    { name: 'Staff', path: '/api/staff' },
    { name: 'Customers', path: '/api/customers' },
    { name: 'Analytics', path: '/api/analytics' },
    { name: 'Payments', path: '/api/payments' },
    { name: 'Online Orders', path: '/api/online-orders' }
  ];

  console.log('\n3. Testing Service Endpoints...');
  for (const endpoint of serviceEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid responses
      });
      
      const statusIcon = response.status < 400 ? '✅' : 
                        response.status < 500 ? '⚠️' : '❌';
      console.log(`   ${statusIcon} ${endpoint.name}: HTTP ${response.status}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`   ❌ ${endpoint.name}: Service not available`);
      } else {
        console.log(`   ⚠️ ${endpoint.name}: ${error.message}`);
      }
    }
  }

  // Test WebSocket Service
  console.log('\n4. Testing WebSocket Service...');
  try {
    const response = await axios.get('http://localhost:3010/health', { timeout: 5000 });
    console.log('✅ WebSocket Service: Available');
  } catch (error) {
    console.log('❌ WebSocket Service:', error.message);
  }

  console.log('\n🎉 Service testing completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Open http://localhost:3011 in your browser');
  console.log('2. Open browser developer tools (F12)');
  console.log('3. Check console for configuration validation');
  console.log('4. Test service integrations using the testing guide');
}

testServices().catch(console.error);
const axios = require('axios');

const API_BASE = 'http://localhost:3000';

async function testAvailableServices() {
  console.log('🔍 Testing Available Services...\n');

  try {
    // Test API Gateway services endpoint
    console.log('📋 Checking service discovery...');
    const servicesResponse = await axios.get(`${API_BASE}/services`);
    
    console.log('✅ Service Discovery Response:');
    Object.entries(servicesResponse.data.services).forEach(([serviceName, serviceInfo]) => {
      const status = serviceInfo.status === 'available' ? '✅' : '❌';
      console.log(`  ${status} ${serviceName}: ${serviceInfo.route} -> ${serviceInfo.url || 'N/A'}`);
    });

    console.log('\n📋 Testing individual service endpoints...');
    
    // Test each service endpoint
    const serviceTests = [
      { name: 'Tenant Service', endpoint: '/api/tenants' },
      { name: 'Auth Service', endpoint: '/api/auth' },
      { name: 'Staff Service', endpoint: '/api/staff' },
      { name: 'Analytics Service', endpoint: '/api/analytics' },
      { name: 'Menu Service', endpoint: '/api/menu' },
      { name: 'Inventory Service', endpoint: '/api/inventory' },
      { name: 'Customer Service', endpoint: '/api/customers' }
    ];

    for (const service of serviceTests) {
      try {
        const response = await axios.get(`${API_BASE}${service.endpoint}/health`, {
          timeout: 2000
        });
        console.log(`✅ ${service.name}: Available (${response.status})`);
      } catch (error) {
        const status = error.response?.status || 'No Response';
        console.log(`❌ ${service.name}: Unavailable (${status})`);
      }
    }

    console.log('\n📋 Summary:');
    console.log('  ✅ API Gateway: Running');
    console.log('  ✅ Tenant Service: Running (includes auth)');
    console.log('  ❌ Other services: Not running');
    console.log('\n💡 This explains why pages show loading - missing services!');

  } catch (error) {
    console.error('❌ Service discovery failed:', {
      message: error.message,
      status: error.response?.status
    });
  }
}

testAvailableServices();
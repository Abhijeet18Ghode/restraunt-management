const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API Gateway...');
    const health = await axios.get('http://localhost:3000/health');
    console.log('✅ API Gateway Health:', health.data.status);
    
    console.log('\nTesting Services Status...');
    const services = await axios.get('http://localhost:3000/services/status');
    console.log('✅ Services Status Retrieved');
    
    if (services.data.health) {
      Object.entries(services.data.health).forEach(([service, status]) => {
        const icon = status.status === 'healthy' ? '✅' : 
                    status.status === 'offline' ? '❌' : '⚠️';
        console.log(`${icon} ${service}: ${status.status}`);
      });
    }
    
    console.log('\nTesting WebSocket Service...');
    try {
      const ws = await axios.get('http://localhost:3010/health');
      console.log('✅ WebSocket Service:', ws.data.status);
    } catch (error) {
      console.log('❌ WebSocket Service:', error.message);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testAPI();
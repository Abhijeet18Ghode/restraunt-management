const http = require('http');

function testEndpoint(host, port, path, name) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log(`✅ ${name}: ${json.status || 'OK'}`);
          resolve(true);
        } catch (e) {
          console.log(`⚠️ ${name}: HTTP ${res.statusCode}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${name}: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`⏰ ${name}: Timeout`);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('🧪 Testing Admin Dashboard Integration...\n');
  
  await testEndpoint('localhost', 3000, '/health', 'API Gateway');
  await testEndpoint('localhost', 3000, '/services/status', 'Services Status');
  await testEndpoint('localhost', 3010, '/health', 'WebSocket Service');
  await testEndpoint('localhost', 3011, '/', 'Admin Dashboard');
  
  console.log('\n🎉 Testing completed!');
  console.log('\n📋 Manual Testing Steps:');
  console.log('1. Open http://localhost:3011 in your browser');
  console.log('2. Navigate to http://localhost:3011/test-admin-dashboard.html');
  console.log('3. Click "Check System Status" button');
  console.log('4. Test individual service integrations');
}

runTests();
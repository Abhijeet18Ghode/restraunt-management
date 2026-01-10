const http = require('http');

function testAnalyticsHealth() {
  console.log('🔍 Quick Analytics Health Test...\n');

  const options = {
    hostname: 'localhost',
    port: 3008,
    path: '/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Analytics service health:', JSON.parse(data));
    });
  });

  req.on('error', (error) => {
    console.error('❌ Analytics service error:', error.message);
  });

  req.end();
}

testAnalyticsHealth();
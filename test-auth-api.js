const http = require('http');

// Test authentication API endpoints
async function testAuthAPI() {
    console.log('🔐 Testing Authentication API');
    console.log('=============================');

    // Test login endpoint
    console.log('\n🔍 Testing login endpoint...');
    
    const loginData = JSON.stringify({
        email: 'admin@restaurant.com',
        password: 'admin123'
    });

    const loginOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginData)
        }
    };

    try {
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log(`📊 Login Status: ${loginResponse.statusCode}`);
        
        if (loginResponse.statusCode === 200) {
            const loginResult = JSON.parse(loginResponse.data);
            console.log('✅ Login successful');
            console.log(`👤 User: ${loginResult.user?.name} (${loginResult.user?.role})`);
            console.log(`🎫 Token: ${loginResult.token ? 'Generated' : 'Missing'}`);
            
            // Test token validation
            if (loginResult.token) {
                console.log('\n🔍 Testing token validation...');
                
                const validateOptions = {
                    hostname: 'localhost',
                    port: 3000,
                    path: '/api/auth/validate',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${loginResult.token}`
                    }
                };

                const validateResponse = await makeRequest(validateOptions);
                console.log(`📊 Validate Status: ${validateResponse.statusCode}`);
                
                if (validateResponse.statusCode === 200) {
                    const validateResult = JSON.parse(validateResponse.data);
                    console.log('✅ Token validation successful');
                    console.log(`👤 Validated User: ${validateResult.user?.name}`);
                } else {
                    console.log('❌ Token validation failed');
                    console.log(`Error: ${validateResponse.data}`);
                }
            }
        } else {
            console.log('❌ Login failed');
            console.log(`Error: ${loginResponse.data}`);
        }
    } catch (error) {
        console.log(`❌ Auth API test failed: ${error.message}`);
    }
}

function makeRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: responseData
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }

        req.end();
    });
}

// Run the test
if (require.main === module) {
    testAuthAPI().catch(console.error);
}

module.exports = { testAuthAPI };
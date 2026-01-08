const http = require('http');
const https = require('https');

// Configuration
const ADMIN_DASHBOARD_URL = 'http://localhost:3011';

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname,
            method: options.method || 'GET',
            headers: options.headers || {},
            ...options
        };

        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data,
                    url: url
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (options.data) {
            req.write(options.data);
        }

        req.end();
    });
}

// Test functions
async function testMainPage() {
    console.log('\n🔍 Testing main page (/)...');
    try {
        const response = await makeRequest(`${ADMIN_DASHBOARD_URL}/`);
        console.log(`📊 Status: ${response.statusCode}`);
        console.log(`🔄 Location header: ${response.headers.location || 'None'}`);
        
        if (response.statusCode === 302 || response.statusCode === 301) {
            console.log('✅ Redirect detected - likely to login page');
            return { status: 'protected', redirectTo: response.headers.location };
        } else if (response.statusCode === 200) {
            // Check if the response contains login form or dashboard content
            const isLoginPage = response.data.includes('Sign in') || response.data.includes('login');
            const isDashboard = response.data.includes('dashboard') || response.data.includes('Dashboard');
            
            if (isLoginPage) {
                console.log('✅ Shows login page content');
                return { status: 'shows_login' };
            } else if (isDashboard) {
                console.log('❌ Shows dashboard without authentication');
                return { status: 'accessible_dashboard' };
            } else {
                console.log('⚠️ Unknown page content');
                return { status: 'unknown_content' };
            }
        } else {
            console.log(`⚠️ Unexpected status: ${response.statusCode}`);
            return { status: 'unexpected', statusCode: response.statusCode };
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function testProtectedRoute(path, name) {
    console.log(`\n🔍 Testing ${name} (${path})...`);
    try {
        const response = await makeRequest(`${ADMIN_DASHBOARD_URL}${path}`);
        console.log(`📊 Status: ${response.statusCode}`);
        console.log(`🔄 Location header: ${response.headers.location || 'None'}`);
        
        if (response.statusCode === 302 || response.statusCode === 301) {
            const redirectTo = response.headers.location;
            if (redirectTo && redirectTo.includes('/login')) {
                console.log('✅ Properly redirects to login');
                return { status: 'protected', redirectTo: redirectTo };
            } else {
                console.log(`⚠️ Redirects to: ${redirectTo}`);
                return { status: 'redirect_other', redirectTo: redirectTo };
            }
        } else if (response.statusCode === 401 || response.statusCode === 403) {
            console.log('✅ Returns authentication error');
            return { status: 'auth_error', statusCode: response.statusCode };
        } else if (response.statusCode === 200) {
            console.log('❌ Accessible without authentication');
            return { status: 'accessible', statusCode: response.statusCode };
        } else {
            console.log(`⚠️ Unexpected status: ${response.statusCode}`);
            return { status: 'unexpected', statusCode: response.statusCode };
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

async function testLoginPage() {
    console.log('\n🔍 Testing login page (/login)...');
    try {
        const response = await makeRequest(`${ADMIN_DASHBOARD_URL}/login`);
        console.log(`📊 Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
            const hasLoginForm = response.data.includes('email') && 
                                 response.data.includes('password') && 
                                 (response.data.includes('Sign in') || response.data.includes('Login'));
            
            if (hasLoginForm) {
                console.log('✅ Login page loads with form');
                return { status: 'working', hasForm: true };
            } else {
                console.log('⚠️ Login page loads but no form detected');
                return { status: 'no_form', hasForm: false };
            }
        } else {
            console.log(`❌ Login page returns status: ${response.statusCode}`);
            return { status: 'error', statusCode: response.statusCode };
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return { status: 'error', error: error.message };
    }
}

// Main test function
async function runAuthenticationTests() {
    console.log('🔐 Starting Authentication Flow Tests');
    console.log('=====================================');
    
    const results = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // Test main page
    results.tests.mainPage = await testMainPage();
    
    // Test login page
    results.tests.loginPage = await testLoginPage();
    
    // Test protected routes
    const protectedRoutes = [
        { path: '/dashboard', name: 'Dashboard' },
        { path: '/menu/items', name: 'Menu Items' }
    ];
    
    for (const route of protectedRoutes) {
        results.tests[route.name.toLowerCase().replace(' ', '_')] = 
            await testProtectedRoute(route.path, route.name);
    }

    // Generate summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    let protectedCount = 0;
    let accessibleCount = 0;
    let errorCount = 0;
    
    Object.entries(results.tests).forEach(([testName, result]) => {
        if (result.status === 'protected' || result.status === 'auth_error' || result.status === 'shows_login') {
            protectedCount++;
            console.log(`✅ ${testName}: SECURE`);
        } else if (result.status === 'accessible' || result.status === 'accessible_dashboard') {
            accessibleCount++;
            console.log(`❌ ${testName}: VULNERABLE`);
        } else {
            errorCount++;
            console.log(`⚠️ ${testName}: ${result.status.toUpperCase()}`);
        }
    });
    
    console.log(`\n🎯 Results: ${protectedCount} secure, ${accessibleCount} vulnerable, ${errorCount} errors`);
    
    const isSecure = accessibleCount === 0 && protectedCount > 0;
    console.log(`🛡️ Overall Status: ${isSecure ? '🔒 SECURE' : '⚠️ NEEDS ATTENTION'}`);
    
    // Save detailed results
    console.log('\n📝 Detailed Results:');
    console.log(JSON.stringify(results, null, 2));
    
    return results;
}

// Run the tests
if (require.main === module) {
    runAuthenticationTests().catch(console.error);
}

module.exports = { runAuthenticationTests };
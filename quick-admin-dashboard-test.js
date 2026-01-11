#!/usr/bin/env node

/**
 * Quick Admin Dashboard Backend Testing Script
 * 
 * This script performs basic health checks and API testing for the admin dashboard backend.
 * Run this before detailed Postman testing to ensure all services are working.
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SERVICES = {
  'API Gateway': 'http://localhost:3000',
  'Tenant Service': 'http://localhost:3001',
  'Menu Service': 'http://localhost:3002',
  'Inventory Service': 'http://localhost:3003',
  'POS Service': 'http://localhost:3004',
  'Online Order Service': 'http://localhost:3005',
  'Staff Service': 'http://localhost:3006',
  'Customer Service': 'http://localhost:3007',
  'Analytics Service': 'http://localhost:3008',
  'Payment Service': 'http://localhost:3009',
  'WebSocket Service': 'http://localhost:3010'
};

// Test credentials
const TEST_CREDENTIALS = {
  email: 'admin@restaurant.com',
  password: 'admin123'
};

let authToken = '';
let tenantId = '';

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(`[${timestamp}] ✅ ${message}`.green);
      break;
    case 'error':
      console.log(`[${timestamp}] ❌ ${message}`.red);
      break;
    case 'warning':
      console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
      break;
    case 'info':
    default:
      console.log(`[${timestamp}] ℹ️  ${message}`.blue);
      break;
  }
}

function logSection(title) {
  console.log('\n' + '='.repeat(60).cyan);
  console.log(`  ${title}`.cyan.bold);
  console.log('='.repeat(60).cyan);
}

async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data,
      responseTime: response.config.metadata?.endTime - response.config.metadata?.startTime || 0
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      error: error.message,
      data: error.response?.data || null
    };
  }
}

// Test functions
async function testServiceHealth(serviceName, url) {
  log(`Testing ${serviceName} health...`);
  const result = await makeRequest('GET', `${url}/health`);
  
  if (result.success) {
    log(`${serviceName} is healthy (${result.status})`, 'success');
    return true;
  } else {
    log(`${serviceName} is unhealthy: ${result.error}`, 'error');
    return false;
  }
}

async function testAPIGatewayRouting() {
  log('Testing API Gateway routing...');
  const result = await makeRequest('GET', `${BASE_URL}/services/status`);
  
  if (result.success) {
    log('API Gateway routing is working', 'success');
    const healthData = result.data.health || {};
    
    Object.entries(healthData).forEach(([service, status]) => {
      if (status.status === 'healthy') {
        log(`  ${service}: healthy`, 'success');
      } else {
        log(`  ${service}: ${status.status} - ${status.error || 'unknown error'}`, 'error');
      }
    });
    
    return true;
  } else {
    log(`API Gateway routing failed: ${result.error}`, 'error');
    return false;
  }
}

async function testAuthentication() {
  log('Testing authentication...');
  
  // Test login
  const loginResult = await makeRequest('POST', `${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
  
  if (loginResult.success && loginResult.data.success) {
    authToken = loginResult.data.data.token;
    tenantId = loginResult.data.data.user.tenantId;
    log('Login successful', 'success');
    log(`Token: ${authToken.substring(0, 20)}...`);
    log(`Tenant ID: ${tenantId}`);
    
    // Test token validation
    const verifyResult = await makeRequest('GET', `${BASE_URL}/api/auth/verify`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (verifyResult.success) {
      log('Token validation successful', 'success');
      return true;
    } else {
      log('Token validation failed', 'error');
      return false;
    }
  } else {
    log(`Login failed: ${loginResult.error || loginResult.data?.message || 'Unknown error'}`, 'error');
    return false;
  }
}

async function testMenuOperations() {
  if (!authToken) {
    log('Skipping menu operations - no auth token', 'warning');
    return false;
  }

  log('Testing menu operations...');
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'x-tenant-id': tenantId
  };

  // Test get categories
  const categoriesResult = await makeRequest('GET', `${BASE_URL}/api/categories`, null, headers);
  if (categoriesResult.success) {
    log(`Categories retrieved: ${categoriesResult.data.data?.length || 0} categories`, 'success');
  } else {
    log(`Categories retrieval failed: ${categoriesResult.error}`, 'error');
  }

  // Test get menu items
  const itemsResult = await makeRequest('GET', `${BASE_URL}/api/menu/items`, null, headers);
  if (itemsResult.success) {
    log(`Menu items retrieved: ${itemsResult.data.data?.length || 0} items`, 'success');
  } else {
    log(`Menu items retrieval failed: ${itemsResult.error}`, 'error');
  }

  return categoriesResult.success && itemsResult.success;
}

async function testInventoryOperations() {
  if (!authToken) {
    log('Skipping inventory operations - no auth token', 'warning');
    return false;
  }

  log('Testing inventory operations...');
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'x-tenant-id': tenantId
  };

  // Test get inventory items
  const inventoryResult = await makeRequest('GET', `${BASE_URL}/api/inventory/items`, null, headers);
  if (inventoryResult.success) {
    log(`Inventory items retrieved: ${inventoryResult.data.data?.length || 0} items`, 'success');
  } else {
    log(`Inventory retrieval failed: ${inventoryResult.error}`, 'error');
  }

  // Test menu-inventory status
  const statusResult = await makeRequest('GET', `${BASE_URL}/api/inventory/menu-items/status`, null, headers);
  if (statusResult.success) {
    log('Menu-inventory status check successful', 'success');
  } else {
    log(`Menu-inventory status failed: ${statusResult.error}`, 'error');
  }

  return inventoryResult.success;
}

async function testStaffOperations() {
  if (!authToken) {
    log('Skipping staff operations - no auth token', 'warning');
    return false;
  }

  log('Testing staff operations...');
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'x-tenant-id': tenantId
  };

  // Test get staff
  const staffResult = await makeRequest('GET', `${BASE_URL}/api/staff`, null, headers);
  if (staffResult.success) {
    log(`Staff retrieved: ${staffResult.data.data?.length || 0} staff members`, 'success');
  } else {
    log(`Staff retrieval failed: ${staffResult.error}`, 'error');
  }

  return staffResult.success;
}

async function testAnalytics() {
  if (!authToken) {
    log('Skipping analytics - no auth token', 'warning');
    return false;
  }

  log('Testing analytics...');
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'x-tenant-id': tenantId
  };

  // Test dashboard analytics
  const dashboardResult = await makeRequest('GET', `${BASE_URL}/api/analytics/dashboard`, null, headers);
  if (dashboardResult.success) {
    log('Dashboard analytics successful', 'success');
  } else {
    log(`Dashboard analytics failed: ${dashboardResult.error}`, 'error');
  }

  return dashboardResult.success;
}

// Main test execution
async function runTests() {
  console.log('🚀 Admin Dashboard Backend Testing'.bold.green);
  console.log('====================================='.green);
  
  const results = {
    healthChecks: 0,
    totalServices: Object.keys(SERVICES).length,
    authentication: false,
    menuOperations: false,
    inventoryOperations: false,
    staffOperations: false,
    analytics: false
  };

  // Phase 1: Health Checks
  logSection('Phase 1: Service Health Checks');
  for (const [serviceName, url] of Object.entries(SERVICES)) {
    const isHealthy = await testServiceHealth(serviceName, url);
    if (isHealthy) results.healthChecks++;
  }

  // Phase 2: API Gateway Routing
  logSection('Phase 2: API Gateway Routing');
  await testAPIGatewayRouting();

  // Phase 3: Authentication
  logSection('Phase 3: Authentication Testing');
  results.authentication = await testAuthentication();

  // Phase 4: Menu Operations
  logSection('Phase 4: Menu Operations');
  results.menuOperations = await testMenuOperations();

  // Phase 5: Inventory Operations
  logSection('Phase 5: Inventory Operations');
  results.inventoryOperations = await testInventoryOperations();

  // Phase 6: Staff Operations
  logSection('Phase 6: Staff Operations');
  results.staffOperations = await testStaffOperations();

  // Phase 7: Analytics
  logSection('Phase 7: Analytics Testing');
  results.analytics = await testAnalytics();

  // Summary
  logSection('Test Summary');
  log(`Services Health: ${results.healthChecks}/${results.totalServices} healthy`);
  log(`Authentication: ${results.authentication ? 'PASS' : 'FAIL'}`);
  log(`Menu Operations: ${results.menuOperations ? 'PASS' : 'FAIL'}`);
  log(`Inventory Operations: ${results.inventoryOperations ? 'PASS' : 'FAIL'}`);
  log(`Staff Operations: ${results.staffOperations ? 'PASS' : 'FAIL'}`);
  log(`Analytics: ${results.analytics ? 'PASS' : 'FAIL'}`);

  const totalTests = 6;
  const passedTests = [
    results.authentication,
    results.menuOperations,
    results.inventoryOperations,
    results.staffOperations,
    results.analytics,
    results.healthChecks === results.totalServices
  ].filter(Boolean).length;

  console.log('\n' + '='.repeat(60).cyan);
  if (passedTests === totalTests) {
    log(`🎉 All tests passed! (${passedTests}/${totalTests})`, 'success');
    log('✅ Admin dashboard backend is ready for detailed testing', 'success');
  } else {
    log(`⚠️  Some tests failed (${passedTests}/${totalTests})`, 'warning');
    log('❌ Please fix issues before proceeding with detailed testing', 'error');
  }
  console.log('='.repeat(60).cyan);

  // Next steps
  console.log('\n📋 Next Steps:'.bold.blue);
  console.log('1. Import the Postman collection: Restaurant_Management_System_API.postman_collection.json');
  console.log('2. Set up environment variables in Postman');
  console.log('3. Run detailed tests following ADMIN_DASHBOARD_TESTING_PLAN.md');
  console.log('4. Check ADMIN_DASHBOARD_BACKEND_ANALYSIS.md for detailed API documentation');
}

// Handle command line execution
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testServiceHealth,
  testAuthentication,
  testMenuOperations,
  testInventoryOperations,
  testStaffOperations,
  testAnalytics
};
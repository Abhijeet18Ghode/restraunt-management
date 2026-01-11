const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Test the routing logic directly
function testRoutingLogic() {
  console.log('Testing API Gateway Routing Fixes...\n');

  // Test 1: Route matching for inventory menu-items
  console.log('Test 1: Route matching for inventory menu-items');
  const apiRoutes = {
    '/api/tenants': 'tenant-service',
    '/api/auth': 'tenant-service',
    '/api/menu': 'menu-service',
    '/api/categories': 'menu-service',
    '/api/inventory': 'inventory-service',
    '/api/inventory/menu-items': 'inventory-service',
    '/api/pos': 'pos-service',
    '/api/online-orders': 'online-order-service',
    '/api/staff': 'staff-service',
    '/api/customers': 'customer-service',
    '/api/analytics': 'analytics-service',
    '/api/payments': 'payment-service'
  };

  const testPaths = [
    '/api/inventory/menu-items/status',
    '/api/inventory/menu-items/availability',
    '/api/inventory/menu-items/bulk-status',
    '/api/menu/items/123/availability',
    '/api/menu/items/availability'
  ];

  testPaths.forEach(path => {
    let matchedService = null;
    // Sort routes by length (longest first) to match most specific routes first
    const sortedRoutes = Object.entries(apiRoutes).sort((a, b) => b[0].length - a[0].length);
    
    for (const [routePrefix, serviceName] of sortedRoutes) {
      if (path.startsWith(routePrefix)) {
        matchedService = serviceName;
        break;
      }
    }
    
    console.log(`  ${path} -> ${matchedService}`);
  });

  // Test 2: Path rewriting logic
  console.log('\nTest 2: Path rewriting logic');
  
  function rewritePath(path, prefix) {
    // Special handling for auth routes
    if (prefix === '/api/auth' && path.startsWith('/api/auth')) {
      return path.replace('/api/auth', '/auth');
    }
    
    // Special handling for menu service routes
    if ((prefix === '/api/menu' || prefix === '/api/categories') && path.startsWith('/api/')) {
      return path;
    }
    
    // Special handling for inventory menu-items routes
    if (prefix === '/api/inventory/menu-items' && path.startsWith('/api/inventory/menu-items')) {
      return path.replace('/api/inventory', '') || '/';
    }
    
    // Standard inventory routes
    if (prefix === '/api/inventory' && path.startsWith('/api/inventory')) {
      if (!path.startsWith('/api/inventory/menu-items')) {
        return path.replace('/api/inventory', '') || '/';
      }
    }
    
    // Generic rewriting
    if (path.startsWith(prefix)) {
      return path.replace(prefix, '') || '/';
    }
    
    return path;
  }

  const rewriteTests = [
    { path: '/api/inventory/menu-items/status', prefix: '/api/inventory/menu-items', expected: '/menu-items/status' },
    { path: '/api/inventory/menu-items/availability', prefix: '/api/inventory/menu-items', expected: '/menu-items/availability' },
    { path: '/api/inventory/items', prefix: '/api/inventory', expected: '/items' },
    { path: '/api/menu/items/123/availability', prefix: '/api/menu', expected: '/api/menu/items/123/availability' },
    { path: '/api/auth/login', prefix: '/api/auth', expected: '/auth/login' }
  ];

  rewriteTests.forEach(({ path, prefix, expected }) => {
    const result = rewritePath(path, prefix);
    const status = result === expected ? '✓' : '✗';
    console.log(`  ${status} ${path} (${prefix}) -> ${result} ${result !== expected ? `(expected: ${expected})` : ''}`);
  });

  // Test 3: Error response structure
  console.log('\nTest 3: Error response structure');
  
  function createErrorResponse(serviceName, err) {
    const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let errorResponse = {
      success: false,
      error: 'Service temporarily unavailable',
      service: serviceName,
      timestamp: new Date().toISOString(),
      errorId: errorId
    };

    if (err.code === 'ECONNREFUSED') {
      errorResponse.message = `The ${serviceName} is currently offline. Please try again later.`;
      errorResponse.code = 'SERVICE_OFFLINE';
    } else if (err.code === 'ETIMEDOUT') {
      errorResponse.message = `The ${serviceName} is taking too long to respond. Please try again.`;
      errorResponse.code = 'SERVICE_TIMEOUT';
    } else if (err.code === 'ENOTFOUND') {
      errorResponse.message = `The ${serviceName} could not be found. Please contact support.`;
      errorResponse.code = 'SERVICE_NOT_FOUND';
    } else {
      errorResponse.message = `An error occurred while communicating with ${serviceName}.`;
      errorResponse.code = 'SERVICE_ERROR';
    }

    return errorResponse;
  }

  const errorTests = [
    { code: 'ECONNREFUSED', expected: 'SERVICE_OFFLINE' },
    { code: 'ETIMEDOUT', expected: 'SERVICE_TIMEOUT' },
    { code: 'ENOTFOUND', expected: 'SERVICE_NOT_FOUND' },
    { code: 'OTHER', expected: 'SERVICE_ERROR' }
  ];

  errorTests.forEach(({ code, expected }) => {
    const error = { code };
    const response = createErrorResponse('test-service', error);
    const status = response.code === expected ? '✓' : '✗';
    console.log(`  ${status} Error code ${code} -> ${response.code} (${response.message})`);
  });

  console.log('\n✅ All routing logic tests completed!');
}

// Run the tests
testRoutingLogic();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3011', 'http://localhost:3012'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timing middleware for performance tracking
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Service registry with fallback URLs
const serviceRegistry = {
  'tenant-service': 'http://localhost:3001',
  'menu-service': 'http://localhost:3002',
  'inventory-service': 'http://localhost:3003',
  'pos-service': 'http://localhost:3004',
  'online-order-service': 'http://localhost:3005',
  'staff-service': 'http://localhost:3006',
  'customer-service': 'http://localhost:3007',
  'analytics-service': 'http://localhost:3008',
  'payment-service': 'http://localhost:3009',
  'websocket-service': 'http://localhost:3010'
};

// Synchronous service URL resolver - never throws, returns null if unavailable
function getServiceUrlSync(serviceName) {
  const url = serviceRegistry[serviceName];
  if (!url) {
    console.warn(`Service ${serviceName} not found in registry`);
    return null;
  }
  return url;
}

// Health check endpoint - NOT proxied, stays in gateway
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Service status endpoint - shows health of all services
app.get('/services/status', async (req, res) => {
  const health = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(serviceRegistry)) {
    try {
      // Use axios instead of fetch for better Node.js compatibility
      const axios = require('axios');
      const response = await axios.get(`${serviceUrl}/health`, { 
        timeout: 5000 // 5 second timeout
      });
      
      if (response.status === 200) {
        const healthData = response.data;
        health[serviceName] = {
          status: 'healthy',
          uptime: healthData.uptime,
          url: serviceUrl
        };
      } else {
        health[serviceName] = {
          status: 'unhealthy',
          url: serviceUrl,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      health[serviceName] = {
        status: 'offline',
        url: serviceUrl,
        error: error.message
      };
    }
  }

  res.json({
    health,
    timestamp: new Date().toISOString(),
    gateway: {
      status: 'healthy',
      uptime: process.uptime()
    }
  });
});

// Service discovery endpoint
app.get('/services', (req, res) => {
  const services = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(serviceRegistry)) {
    services[serviceName] = {
      url: serviceUrl,
      status: 'registered'
    };
  }
  
  res.json({
    services,
    gateway: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Defensive path rewrite function with enhanced logging
function rewritePath(path, prefix) {
  console.log(`[ROUTING] Rewriting path: ${path} with prefix: ${prefix}`);
  
  // Special handling for auth routes - they should keep the 'auth' part
  if (prefix === '/api/auth' && path.startsWith('/api/auth')) {
    // Convert /api/auth/login to /auth/login
    const rewritten = path.replace('/api/auth', '/auth');
    console.log(`[ROUTING] Auth path rewritten: ${path} -> ${rewritten}`);
    return rewritten;
  }
  
  // Special handling for menu service routes - they should keep the full /api path
  if ((prefix === '/api/menu' || prefix === '/api/categories') && path.startsWith('/api/')) {
    // Keep the full path for menu service routes
    console.log(`[ROUTING] Menu path preserved: ${path}`);
    return path;
  }
  
  // Special handling for inventory menu-items routes - preserve sub-paths
  if (prefix === '/api/inventory/menu-items' && path.startsWith('/api/inventory/menu-items')) {
    // Convert /api/inventory/menu-items/status to /menu-items/status
    const rewritten = path.replace('/api/inventory', '') || '/';
    console.log(`[ROUTING] Inventory menu-items path rewritten: ${path} -> ${rewritten}`);
    return rewritten;
  }
  
  // Standard inventory routes
  if (prefix === '/api/inventory' && path.startsWith('/api/inventory')) {
    // Only rewrite if it's not a menu-items sub-route (handled above)
    if (!path.startsWith('/api/inventory/menu-items')) {
      const rewritten = path.replace('/api/inventory', '') || '/';
      console.log(`[ROUTING] Standard inventory path rewritten: ${path} -> ${rewritten}`);
      return rewritten;
    }
  }
  
  // Only rewrite if the path actually starts with the prefix
  if (path.startsWith(prefix)) {
    const rewritten = path.replace(prefix, '') || '/';
    console.log(`[ROUTING] Generic path rewritten: ${path} -> ${rewritten}`);
    return rewritten;
  }
  
  // Pass through unchanged if prefix doesn't match
  console.log(`[ROUTING] Path unchanged: ${path}`);
  return path;
}

// Create resilient proxy middleware
function createResilientProxy(serviceName, routePrefix) {
  return createProxyMiddleware({
    // No target specified - will be resolved per request
    changeOrigin: true,
    
    // Path rewrite with defensive logic
    pathRewrite: (path, req) => {
      return rewritePath(path, routePrefix);
    },
    
    // Dynamic router - resolves service URL per request
    router: (req) => {
      const serviceUrl = getServiceUrlSync(serviceName);
      
      if (!serviceUrl) {
        console.error(`[ROUTING ERROR] Service ${serviceName} not available for ${req.method} ${req.originalUrl}`);
        // This will cause the proxy to fail gracefully
        throw new Error(`Service ${serviceName} not available`);
      }
      
      console.log(`[ROUTING] ${req.method} ${req.originalUrl} -> ${serviceUrl} (${serviceName})`);
      console.log(`[ROUTING] Headers: ${JSON.stringify({
        'x-tenant-id': req.headers['x-tenant-id'],
        'x-request-id': req.headers['x-request-id'],
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? '[REDACTED]' : undefined
      })}`);
      
      return serviceUrl;
    },
    
    // Graceful error handling - never crash the gateway
    onError: (err, req, res) => {
      const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.error(`[ERROR] ${errorId} - Proxy error for ${serviceName}:`, {
        error: err.message,
        code: err.code,
        path: req.originalUrl,
        method: req.method,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });
      
      // Return clean error response instead of crashing
      if (!res.headersSent) {
        // Determine error type and provide appropriate response
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

        res.status(503).json(errorResponse);
      }
    },
    
    // Request enhancement with detailed logging
    onProxyReq: (proxyReq, req, res) => {
      const requestId = req.headers['x-request-id'] || 
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Forward tenant context
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      
      // Add request ID for tracing
      proxyReq.setHeader('x-request-id', requestId);
      
      // Add gateway info
      proxyReq.setHeader('x-forwarded-by', 'api-gateway');
      
      // Forward the request body for POST/PUT/PATCH requests
      if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
        
        console.log(`[PROXY REQ] ${req.method} ${req.originalUrl} -> ${serviceName} with body:`, 
          JSON.stringify(req.body, null, 2));
      } else {
        console.log(`[PROXY REQ] ${req.method} ${req.originalUrl} -> ${serviceName} (no body)`);
      }
      
      console.log(`[PROXY REQ] Request ID: ${requestId}, Tenant: ${req.headers['x-tenant-id'] || 'none'}`);
    },
    
    // Response logging with detailed information
    onProxyRes: (proxyRes, req, res) => {
      const duration = Date.now() - (req.startTime || Date.now());
      console.log(`[PROXY RES] ${serviceName} responded: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl} (${duration}ms)`);
      
      if (proxyRes.statusCode >= 400) {
        console.warn(`[PROXY RES] Error response from ${serviceName}:`, {
          status: proxyRes.statusCode,
          headers: proxyRes.headers,
          path: req.originalUrl,
          method: req.method
        });
      }
    }
  });
}

// Mount API routes under /api prefix to avoid conflicts
// IMPORTANT: More specific routes must come BEFORE general routes
const apiRoutes = {
  '/api/tenants': 'tenant-service',
  '/api/auth': 'tenant-service',  // Route auth to tenant service
  '/api/menu': 'menu-service',
  '/api/categories': 'menu-service',  // Route categories to menu service
  '/api/inventory/menu-items': 'inventory-service',  // Explicit inventory menu-items route (MUST come before /api/inventory)
  '/api/inventory': 'inventory-service',
  '/api/pos': 'pos-service',
  '/api/online-orders': 'online-order-service',
  '/api/staff': 'staff-service',
  '/api/customers': 'customer-service',
  '/api/analytics': 'analytics-service',
  '/api/payments': 'payment-service'
};

// Create and mount proxy routes in order of specificity (longest paths first)
const sortedRoutes = Object.entries(apiRoutes).sort((a, b) => b[0].length - a[0].length);

sortedRoutes.forEach(([routePrefix, serviceName]) => {
  const proxy = createResilientProxy(serviceName, routePrefix);
  app.use(routePrefix, proxy);
  console.log(`Mounted proxy: ${routePrefix} -> ${serviceName}`);
});

// Catch-all for undefined API routes
app.use('/api/*', (req, res) => {
  console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    error: 'API route not found',
    path: req.originalUrl,
    availableRoutes: Object.keys(apiRoutes),
    timestamp: new Date().toISOString()
  });
});

// Root route - gateway info
app.get('/', (req, res) => {
  res.json({
    service: 'Restaurant Management System API Gateway',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    availableRoutes: Object.keys(apiRoutes),
    endpoints: {
      health: '/health',
      services: '/services',
      status: '/services/status'
    }
  });
});

// Global error handler - never crash
app.use((error, req, res, next) => {
  console.error('Gateway error:', error);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal gateway error',
      message: 'An unexpected error occurred in the API gateway',
      timestamp: new Date().toISOString()
    });
  }
});

// 404 handler for non-API routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
    suggestion: 'Try /health for gateway status or /api/* for service routes',
    timestamp: new Date().toISOString()
  });
});

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🌐 API Gateway started successfully on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Available routes: ${Object.keys(apiRoutes).join(', ')}`);
  console.log(`💚 Gateway is ready to proxy requests`);
}).on('error', (err) => {
  console.error('Failed to start API Gateway:', err);
  process.exit(1);
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n🔔 Received ${signal}, shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ API Gateway shut down successfully');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    console.error('⚠️  Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - keep gateway running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - keep gateway running
});

module.exports = app;
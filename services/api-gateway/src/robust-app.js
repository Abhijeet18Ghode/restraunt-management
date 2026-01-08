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

// Defensive path rewrite function
function rewritePath(path, prefix) {
  // Special handling for auth routes - they should keep the 'auth' part
  if (prefix === '/api/auth' && path.startsWith('/api/auth')) {
    // Convert /api/auth/login to /auth/login
    return path.replace('/api/auth', '/auth');
  }
  
  // Only rewrite if the path actually starts with the prefix
  if (path.startsWith(prefix)) {
    const rewritten = path.replace(prefix, '') || '/';
    return rewritten;
  }
  // Pass through unchanged if prefix doesn't match
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
        // This will cause the proxy to fail gracefully
        throw new Error(`Service ${serviceName} not available`);
      }
      
      console.log(`Routing ${req.method} ${req.originalUrl} -> ${serviceUrl}`);
      return serviceUrl;
    },
    
    // Graceful error handling - never crash the gateway
    onError: (err, req, res) => {
      console.error(`Proxy error for ${serviceName}:`, err.message);
      
      // Return clean 503 instead of crashing
      if (!res.headersSent) {
        res.status(503).json({
          error: 'Service temporarily unavailable',
          service: serviceName,
          message: 'The requested service is currently offline or unreachable',
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // Request enhancement
    onProxyReq: (proxyReq, req, res) => {
      // Forward tenant context
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || 
        `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      // Add gateway info
      proxyReq.setHeader('x-forwarded-by', 'api-gateway');
      
      // Forward the request body for POST/PUT requests
      if (req.body && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
      
      console.log(`Proxying ${req.method} ${req.originalUrl} -> ${serviceName} with body:`, req.body);
    },
    
    // Response logging
    onProxyRes: (proxyRes, req, res) => {
      console.log(`${serviceName} responded: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
    }
  });
}

// Mount API routes under /api prefix to avoid conflicts
const apiRoutes = {
  '/api/tenants': 'tenant-service',
  '/api/auth': 'tenant-service',  // Route auth to tenant service
  '/api/menu': 'menu-service',
  '/api/inventory': 'inventory-service',
  '/api/pos': 'pos-service',
  '/api/online-orders': 'online-order-service',
  '/api/staff': 'staff-service',
  '/api/customers': 'customer-service',
  '/api/analytics': 'analytics-service',
  '/api/payments': 'payment-service'
};

// Create and mount proxy routes
Object.entries(apiRoutes).forEach(([routePrefix, serviceName]) => {
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
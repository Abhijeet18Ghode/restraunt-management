const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
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

// Service status endpoint
app.get('/services/status', async (req, res) => {
  const services = {
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

  const health = {};
  
  for (const [serviceName, serviceUrl] of Object.entries(services)) {
    try {
      const response = await fetch(`${serviceUrl}/health`);
      if (response.ok) {
        const healthData = await response.json();
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
    timestamp: new Date().toISOString()
  });
});

// Simple proxy routes with enhanced inventory support
// IMPORTANT: More specific routes must come BEFORE general routes
const proxyRoutes = {
  '/api/tenants': 'http://localhost:3001',
  '/api/menu': 'http://localhost:3002',
  '/api/inventory/menu-items': 'http://localhost:3003',  // Explicit inventory menu-items route (MUST come before /api/inventory)
  '/api/inventory': 'http://localhost:3003',
  '/api/pos': 'http://localhost:3004',
  '/api/online-orders': 'http://localhost:3005',
  '/api/staff': 'http://localhost:3006',
  '/api/customers': 'http://localhost:3007',
  '/api/analytics': 'http://localhost:3008',
  '/api/payments': 'http://localhost:3009'
};

// Create proxy middleware for each route with enhanced error handling
// Sort routes by specificity (longest paths first) to ensure correct matching
const sortedRoutes = Object.entries(proxyRoutes).sort((a, b) => b[0].length - a[0].length);

sortedRoutes.forEach(([route, target]) => {
  app.use(route, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
      console.log(`[ROUTING] Rewriting path: ${path} for route: ${route}`);
      
      // Special handling for inventory menu-items routes
      if (route === '/api/inventory/menu-items' && path.startsWith('/api/inventory/menu-items')) {
        const rewritten = path.replace('/api/inventory', '');
        console.log(`[ROUTING] Inventory menu-items path rewritten: ${path} -> ${rewritten}`);
        return rewritten;
      }
      
      // Standard path rewriting
      const rewritten = path.replace(route, '');
      console.log(`[ROUTING] Standard path rewritten: ${path} -> ${rewritten}`);
      return rewritten;
    },
    onError: (err, req, res) => {
      const errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.error(`[ERROR] ${errorId} - Proxy error for ${route}:`, {
        error: err.message,
        code: err.code,
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      if (!res.headersSent) {
        let errorResponse = {
          success: false,
          error: 'Service temporarily unavailable',
          service: route,
          timestamp: new Date().toISOString(),
          errorId: errorId
        };

        if (err.code === 'ECONNREFUSED') {
          errorResponse.message = `The service at ${route} is currently offline. Please try again later.`;
          errorResponse.code = 'SERVICE_OFFLINE';
        } else if (err.code === 'ETIMEDOUT') {
          errorResponse.message = `The service at ${route} is taking too long to respond. Please try again.`;
          errorResponse.code = 'SERVICE_TIMEOUT';
        } else {
          errorResponse.message = 'Please try again later';
          errorResponse.code = 'SERVICE_ERROR';
        }

        res.status(503).json(errorResponse);
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward tenant context
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      console.log(`[PROXY REQ] ${req.method} ${req.originalUrl} -> ${route} (Request ID: ${requestId})`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[PROXY RES] ${route} responded: ${proxyRes.statusCode} for ${req.method} ${req.originalUrl}`);
      
      if (proxyRes.statusCode >= 400) {
        console.warn(`[PROXY RES] Error response from ${route}:`, {
          status: proxyRes.statusCode,
          path: req.originalUrl,
          method: req.method
        });
      }
    }
  }));
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: Object.keys(proxyRoutes)
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Gateway error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`API Gateway started on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('API Gateway shut down');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('API Gateway shut down');
    process.exit(0);
  });
});

module.exports = app;
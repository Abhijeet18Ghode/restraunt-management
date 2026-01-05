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

// Simple proxy routes
const proxyRoutes = {
  '/api/tenants': 'http://localhost:3001',
  '/api/menu': 'http://localhost:3002',
  '/api/inventory': 'http://localhost:3003',
  '/api/pos': 'http://localhost:3004',
  '/api/online-orders': 'http://localhost:3005',
  '/api/staff': 'http://localhost:3006',
  '/api/customers': 'http://localhost:3007',
  '/api/analytics': 'http://localhost:3008',
  '/api/payments': 'http://localhost:3009'
};

// Create proxy middleware for each route
Object.entries(proxyRoutes).forEach(([route, target]) => {
  app.use(route, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => {
      return path.replace(route, '');
    },
    onError: (err, req, res) => {
      console.error(`Proxy error for ${route}:`, err.message);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: route,
        message: 'Please try again later'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward tenant context
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
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
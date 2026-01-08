const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const logger = require('./src/utils/simple-logger');

console.log('Starting minimal API Gateway...');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check
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

// Services status endpoint
app.get('/services/status', async (req, res) => {
  const health = {};
  const axios = require('axios');
  
  for (const [route, serviceUrl] of Object.entries(serviceRoutes)) {
    const serviceName = route.replace('/api/', '') + '-service';
    try {
      const response = await axios.get(`${serviceUrl}/health`, { 
        timeout: 3000 
      });
      
      if (response.status === 200) {
        health[serviceName] = {
          status: 'healthy',
          url: serviceUrl,
          route: route
        };
      } else {
        health[serviceName] = {
          status: 'unhealthy',
          url: serviceUrl,
          route: route,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error) {
      health[serviceName] = {
        status: 'offline',
        url: serviceUrl,
        route: route,
        error: error.code || error.message
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

// Simple proxy setup
const serviceRoutes = {
  '/api/auth': 'http://localhost:3006', // Auth handled by staff service
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

// Create proxies
Object.entries(serviceRoutes).forEach(([route, target]) => {
  app.use(route, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(route, ''),
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${route}:`, err.message);
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: route
      });
    }
  }));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Minimal API Gateway started on port ${PORT}`);
  logger.info(`API Gateway started on port ${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
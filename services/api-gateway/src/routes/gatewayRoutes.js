const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const ServiceDiscovery = require('../services/ServiceDiscovery');
const LoadBalancer = require('../services/LoadBalancer');
const { generalLimiter, authLimiter, paymentLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();
const serviceDiscovery = new ServiceDiscovery();
const loadBalancer = new LoadBalancer();

// Service route mappings
const serviceRoutes = {
  '/api/tenants': 'tenant-service',
  '/api/auth': 'tenant-service',  // Add auth routes to tenant service
  '/api/menu': 'menu-service',
  '/api/inventory': 'inventory-service',
  '/api/pos': 'pos-service',
  '/api/online-orders': 'online-order-service',
  '/api/staff': 'staff-service',
  '/api/customers': 'customer-service',
  '/api/analytics': 'analytics-service',
  '/api/payments': 'payment-service'
};

// Apply rate limiting based on route
const applyRateLimiting = (req, res, next) => {
  if (req.path.includes('/auth') || req.path.includes('/login')) {
    return authLimiter(req, res, next);
  }
  if (req.path.includes('/payment')) {
    return paymentLimiter(req, res, next);
  }
  return generalLimiter(req, res, next);
};

// Service URL cache
const serviceUrlCache = new Map();

// Initialize service URLs with fallback values
const initializeServiceUrls = () => {
  const fallbackUrls = {
    'tenant-service': 'http://localhost:3001',
    'menu-service': 'http://localhost:3002',
    'inventory-service': 'http://localhost:3003',
    'pos-service': 'http://localhost:3004',
    'online-order-service': 'http://localhost:3005',
    'staff-service': 'http://localhost:3006',
    'customer-service': 'http://localhost:3007',
    'analytics-service': 'http://localhost:3008',
    'payment-service': 'http://localhost:3009'
  };
  
  Object.entries(fallbackUrls).forEach(([serviceName, url]) => {
    serviceUrlCache.set(serviceName, url);
  });
};

// Initialize the cache
initializeServiceUrls();

// Periodically update service URLs from service discovery
const updateServiceUrls = async () => {
  for (const serviceName of Object.values(serviceRoutes)) {
    try {
      const serviceUrl = await serviceDiscovery.getServiceUrl(serviceName);
      serviceUrlCache.set(serviceName, serviceUrl);
    } catch (error) {
      logger.warn(`Failed to update URL for ${serviceName}:`, error.message);
    }
  }
};

// Update service URLs every 30 seconds
setInterval(updateServiceUrls, 30000);

// Initial update
updateServiceUrls().catch(error => {
  logger.warn('Initial service URL update failed:', error.message);
});

// Custom proxy middleware with service discovery
const createServiceProxy = (serviceName) => {
  return createProxyMiddleware({
    target: serviceUrlCache.get(serviceName) || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Remove the service prefix from the path
      const servicePrefix = Object.keys(serviceRoutes).find(prefix => path.startsWith(prefix));
      return path.replace(servicePrefix, '');
    },
    router: (req) => {
      // Use cached service URL or fallback
      const serviceUrl = serviceUrlCache.get(serviceName);
      logger.debug(`Routing request to ${serviceName}:`, {
        originalUrl: req.originalUrl,
        serviceUrl,
        method: req.method
      });
      return serviceUrl;
    },
    onError: (err, req, res) => {
      logger.error('Proxy error:', {
        error: err.message,
        service: serviceName,
        url: req.url,
        method: req.method
      });
      
      res.status(503).json({
        error: 'Service temporarily unavailable',
        service: serviceName,
        message: 'Please try again later'
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add tenant context to forwarded requests
      if (req.headers['x-tenant-id']) {
        proxyReq.setHeader('x-tenant-id', req.headers['x-tenant-id']);
      }
      
      // Add request ID for tracing
      const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      proxyReq.setHeader('x-request-id', requestId);
      
      logger.debug('Proxying request:', {
        method: req.method,
        url: req.url,
        service: serviceName,
        requestId,
        tenantId: req.headers['x-tenant-id']
      });
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.debug('Proxy response:', {
        statusCode: proxyRes.statusCode,
        service: serviceName,
        url: req.url,
        requestId: req.headers['x-request-id']
      });
    }
  });
};

// Apply rate limiting to all routes
router.use(applyRateLimiting);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: loadBalancer.getAllStats()
  });
});

// Service discovery endpoint
router.get('/services', async (req, res) => {
  try {
    const services = {};
    for (const [route, serviceName] of Object.entries(serviceRoutes)) {
      try {
        const serviceUrl = await serviceDiscovery.getServiceUrl(serviceName);
        services[serviceName] = {
          route,
          url: serviceUrl,
          status: 'available'
        };
      } catch (error) {
        services[serviceName] = {
          route,
          url: null,
          status: 'unavailable',
          error: error.message
        };
      }
    }
    
    res.json({
      services,
      loadBalancer: loadBalancer.getAllStats()
    });
  } catch (error) {
    logger.error('Failed to get service status:', error);
    res.status(500).json({
      error: 'Failed to retrieve service status'
    });
  }
});

// Dynamic route setup for each service
Object.entries(serviceRoutes).forEach(([route, serviceName]) => {
  router.use(route, createServiceProxy(serviceName));
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
  logger.warn('Route not found:', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Route not found',
    availableRoutes: Object.keys(serviceRoutes)
  });
});

module.exports = router;
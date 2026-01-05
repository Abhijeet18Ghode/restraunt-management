const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { comprehensiveErrorHandler, setupGlobalErrorHandlers } = require('./middleware/comprehensiveErrorHandler');
const gatewayRoutes = require('./routes/gatewayRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const ServiceDiscovery = require('./services/ServiceDiscovery');
const ServiceOrchestrator = require('./services/ServiceOrchestrator');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup global error handlers
setupGlobalErrorHandlers();

// Initialize services
const serviceDiscovery = new ServiceDiscovery();
const serviceOrchestrator = new ServiceOrchestrator();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint (before other routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Service orchestration endpoints
app.get('/services/status', async (req, res) => {
  try {
    const servicesStatus = serviceOrchestrator.getAllServicesStatus();
    const healthCheck = await serviceOrchestrator.healthCheck();
    
    res.json({
      orchestrator: servicesStatus,
      health: healthCheck,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get services status:', error);
    res.status(500).json({
      error: 'Failed to retrieve services status',
      message: error.message
    });
  }
});

app.post('/services/:serviceName/start', async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceOrchestrator.startService(serviceName);
    
    res.json({
      message: `Service ${serviceName} started successfully`,
      status: serviceOrchestrator.getServiceStatus(serviceName)
    });
  } catch (error) {
    logger.error(`Failed to start service ${req.params.serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to start service',
      message: error.message
    });
  }
});

app.post('/services/:serviceName/stop', async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceOrchestrator.stopService(serviceName);
    
    res.json({
      message: `Service ${serviceName} stopped successfully`
    });
  } catch (error) {
    logger.error(`Failed to stop service ${req.params.serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to stop service',
      message: error.message
    });
  }
});

app.post('/services/:serviceName/restart', async (req, res) => {
  try {
    const { serviceName } = req.params;
    await serviceOrchestrator.restartService(serviceName);
    
    res.json({
      message: `Service ${serviceName} restarted successfully`,
      status: serviceOrchestrator.getServiceStatus(serviceName)
    });
  } catch (error) {
    logger.error(`Failed to restart service ${req.params.serviceName}:`, error);
    res.status(500).json({
      error: 'Failed to restart service',
      message: error.message
    });
  }
});

app.post('/services/start-all', async (req, res) => {
  try {
    await serviceOrchestrator.startAllServices();
    
    res.json({
      message: 'All services startup initiated',
      status: serviceOrchestrator.getAllServicesStatus()
    });
  } catch (error) {
    logger.error('Failed to start all services:', error);
    res.status(500).json({
      error: 'Failed to start all services',
      message: error.message
    });
  }
});

// API routes
app.use('/integrations', integrationRoutes);
app.use('/', gatewayRoutes);

// Error logging middleware
app.use(errorLogger);

// Comprehensive error handling middleware (must be last)
app.use(comprehensiveErrorHandler);

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  try {
    // Stop accepting new requests
    server.close(async () => {
      logger.info('HTTP server closed');
      
      // Stop all managed services
      await serviceOrchestrator.gracefulShutdown();
      
      // Close database connections, etc.
      logger.info('Graceful shutdown completed');
      process.exit(0);
    });
    
    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000); // 30 second timeout
    
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const server = app.listen(PORT, async () => {
  logger.info(`API Gateway started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    pid: process.pid
  });
  
  // Start service discovery health checks
  serviceDiscovery.startHealthCheck();
  
  // Register this service if needed
  if (process.env.REGISTER_SELF === 'true') {
    try {
      await serviceDiscovery.registerService('api-gateway', {
        host: process.env.HOST || 'localhost',
        port: PORT,
        tags: ['api-gateway', 'proxy', 'load-balancer']
      });
      logger.info('API Gateway registered with service discovery');
    } catch (error) {
      logger.warn('Failed to register with service discovery:', error);
    }
  }
  
  // Start all services if configured to do so
  if (process.env.AUTO_START_SERVICES === 'true') {
    logger.info('Auto-starting all services...');
    try {
      await serviceOrchestrator.startAllServices();
      logger.info('All services auto-started successfully');
    } catch (error) {
      logger.error('Failed to auto-start services:', error);
    }
  }
});

module.exports = app;
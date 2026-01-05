const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const centralizedMenuRoutes = require('./routes/centralizedMenuRoutes');
const inventoryTransferRoutes = require('./routes/inventoryTransferRoutes');
const consolidatedReportingRoutes = require('./routes/consolidatedReportingRoutes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3010;

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
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    tenantId: req.headers['x-tenant-id']
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      tenantId: req.headers['x-tenant-id']
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'multi-location-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
app.use('/centralized-menu', centralizedMenuRoutes);
app.use('/inventory-transfers', inventoryTransferRoutes);
app.use('/consolidated-reports', consolidatedReportingRoutes);

// Root endpoint with service information
app.get('/', (req, res) => {
  res.json({
    service: 'Multi-Location Management Service',
    version: '1.0.0',
    description: 'Centralized management for multi-outlet restaurant operations',
    endpoints: {
      'centralized-menu': 'Centralized menu and pricing control across outlets',
      'inventory-transfers': 'Inter-outlet inventory transfer management',
      'consolidated-reports': 'Consolidated reporting across all locations'
    },
    features: [
      'Global menu item management',
      'Centralized pricing control',
      'Inter-outlet inventory transfers',
      'Consolidated sales reporting',
      'Multi-location performance analytics',
      'Table merge order consolidation'
    ],
    health: '/health'
  });
});

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableEndpoints: [
      '/centralized-menu',
      '/inventory-transfers',
      '/consolidated-reports',
      '/health'
    ]
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Multi-Location Service started on port ${PORT}`);
  logger.info('Available endpoints:', {
    'centralized-menu': '/centralized-menu',
    'inventory-transfers': '/inventory-transfers',
    'consolidated-reports': '/consolidated-reports',
    'health': '/health'
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
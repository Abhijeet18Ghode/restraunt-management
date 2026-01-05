const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const { errorHandler, requestLogger } = require('./middleware/errorHandler');
const { DatabaseManager } = require('@rms/shared');

// Import routes
const onlineOrderRoutes = require('./routes/onlineOrderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'online-order-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/online-orders', onlineOrderRoutes);
app.use('/api/delivery', deliveryRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database connection
const dbManager = new DatabaseManager();

// Scheduled tasks
// Process order queue every 30 seconds
cron.schedule('*/30 * * * * *', () => {
  console.log('Processing order queue...');
  // In a real system, this would process pending orders
});

// Clean up completed deliveries every hour
cron.schedule('0 * * * *', () => {
  console.log('Cleaning up completed deliveries...');
  // In a real system, this would archive old delivery records
});

// Update delivery ETAs every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Updating delivery ETAs...');
  // In a real system, this would recalculate delivery times based on traffic
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dbManager.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await dbManager.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Online Order Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
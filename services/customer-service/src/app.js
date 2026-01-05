const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const customerRoutes = require('./routes/customerRoutes');
const loyaltyRoutes = require('./routes/loyaltyRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { DatabaseManager } = require('@rms/shared');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Please try again later',
  },
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Customer Service is running',
    timestamp: new Date().toISOString(),
    service: 'customer-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
  });
});

// API routes
app.use('/api/customers', customerRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
const dbManager = new DatabaseManager();

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

const PORT = process.env.PORT || 3005;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Customer Service running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
const express = require('express');
const logger = require('./src/utils/logger');

console.log('Starting debug app...');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Debug API Gateway started on port ${PORT}`);
  logger.info(`Debug API Gateway started on port ${PORT}`);
});

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Debug app setup complete');
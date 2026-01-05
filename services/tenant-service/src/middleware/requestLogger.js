const { generateId } = require('@rms/shared');

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  req.requestId = generateId();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);
  
  // Log request start
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Request ID: ${req.requestId}`);
  }
  
  // Log response when finished
  const originalSend = res.send;
  res.send = function(data) {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} - Request ID: ${req.requestId}`);
    }
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  requestLogger,
};
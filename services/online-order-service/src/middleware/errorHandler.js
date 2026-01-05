const { 
  ValidationError, 
  ResourceNotFoundError, 
  UnauthorizedError, 
  DatabaseError 
} = require('@rms/shared');

/**
 * Global error handling middleware for online order service
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    tenantId: req.tenantId,
    userId: req.user?.id,
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: err.message,
      details: err.details || null,
    });
  }

  if (err instanceof ResourceNotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'Resource Not Found',
      message: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: err.message,
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: 'Database Error',
      message: 'An error occurred while processing your request',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
  }

  // Handle validation errors from express-validator
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: err.array(),
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    }),
  });
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

module.exports = {
  errorHandler,
  requestLogger,
};
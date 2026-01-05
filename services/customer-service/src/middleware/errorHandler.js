const { 
  ValidationError, 
  ResourceNotFoundError, 
  UnauthorizedError, 
  DatabaseError 
} = require('@rms/shared');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

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
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
    });
  }

  // Handle validation errors from express-validator
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid input data',
      details: err.errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Token expired',
    });
  }

  // Handle other known errors
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'External service connection failed',
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = { errorHandler };
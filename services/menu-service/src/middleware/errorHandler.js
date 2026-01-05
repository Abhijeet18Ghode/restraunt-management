const { AppError, createErrorResponse } = require('@rms/shared');

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, _next) => {
  // Log error for debugging
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
    });
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(
      createErrorResponse(err.code, err.message, err.details)
    );
  }

  // Handle validation errors from express-validator
  if (err.type === 'validation') {
    return res.status(400).json(
      createErrorResponse('VALIDATION_ERROR', 'Validation failed', err.errors)
    );
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(
      createErrorResponse('UNAUTHORIZED', 'Invalid token')
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json(
      createErrorResponse('UNAUTHORIZED', 'Token expired')
    );
  }

  // Handle database errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    let message = 'Database constraint violation';
    
    if (err.code === '23505') { // Unique violation
      message = 'Resource already exists';
    } else if (err.code === '23503') { // Foreign key violation
      message = 'Referenced resource not found';
    }
    
    return res.status(400).json(
      createErrorResponse('DATABASE_ERROR', message)
    );
  }

  // Handle unexpected errors
  return res.status(500).json(
    createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message
    )
  );
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json(
    createErrorResponse(
      'RESOURCE_NOT_FOUND',
      `Route ${req.method} ${req.path} not found`
    )
  );
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
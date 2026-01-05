const { 
  ValidationError, 
  ResourceNotFoundError, 
  UnauthorizedError, 
  ForbiddenError,
  DatabaseError 
} = require('@rms/shared');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.id,
    tenant: req.tenantId,
  });

  // Handle known error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: err.message,
      details: err.details || null,
    });
  }

  if (err instanceof ResourceNotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: err.message,
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: err.message,
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: err.message,
    });
  }

  if (err instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Database operation failed',
      details: process.env.NODE_ENV === 'development' ? err.message : null,
    });
  }

  // Handle express-validator errors
  if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: err.array(),
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    details: process.env.NODE_ENV === 'development' ? err.message : null,
  });
};

module.exports = errorHandler;
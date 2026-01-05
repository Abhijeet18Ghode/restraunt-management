const { 
  ValidationError, 
  ResourceNotFoundError, 
  DatabaseError, 
  AuthenticationError,
  AuthorizationError 
} = require('@rms/shared');

/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    tenantId: req.tenantId,
    userId: req.userId,
  });

  // Handle known error types
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: error.message,
      details: error.details || null,
    });
  }

  if (error instanceof ResourceNotFoundError) {
    return res.status(404).json({
      success: false,
      error: 'RESOURCE_NOT_FOUND',
      message: error.message,
    });
  }

  if (error instanceof AuthenticationError) {
    return res.status(401).json({
      success: false,
      error: 'AUTHENTICATION_ERROR',
      message: error.message,
    });
  }

  if (error instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: 'AUTHORIZATION_ERROR',
      message: error.message,
    });
  }

  if (error instanceof DatabaseError) {
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'A database error occurred',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }

  // Handle Express validation errors
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
    });
  }

  // Handle unexpected errors
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    }),
  });
};

module.exports = errorHandler;
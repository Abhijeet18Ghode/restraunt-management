const logger = require('../utils/logger');

// Error types and their handling strategies
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TENANT_ISOLATION_ERROR: 'TENANT_ISOLATION_ERROR',
  SERVICE_UNAVAILABLE_ERROR: 'SERVICE_UNAVAILABLE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

// Error severity levels
const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class AppError extends Error {
  constructor(message, type = ErrorTypes.INTERNAL_SERVER_ERROR, statusCode = 500, severity = ErrorSeverity.MEDIUM, details = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
const createValidationError = (message, details = {}) => 
  new AppError(message, ErrorTypes.VALIDATION_ERROR, 400, ErrorSeverity.LOW, details);

const createAuthenticationError = (message = 'Authentication required') => 
  new AppError(message, ErrorTypes.AUTHENTICATION_ERROR, 401, ErrorSeverity.MEDIUM);

const createAuthorizationError = (message = 'Insufficient permissions') => 
  new AppError(message, ErrorTypes.AUTHORIZATION_ERROR, 403, ErrorSeverity.MEDIUM);

const createTenantIsolationError = (message = 'Tenant access violation') => 
  new AppError(message, ErrorTypes.TENANT_ISOLATION_ERROR, 403, ErrorSeverity.HIGH);

const createServiceUnavailableError = (serviceName, message = 'Service temporarily unavailable') => 
  new AppError(message, ErrorTypes.SERVICE_UNAVAILABLE_ERROR, 503, ErrorSeverity.HIGH, { serviceName });

const createRateLimitError = (message = 'Rate limit exceeded') => 
  new AppError(message, ErrorTypes.RATE_LIMIT_ERROR, 429, ErrorSeverity.MEDIUM);

// Error classification function
const classifyError = (error) => {
  if (error instanceof AppError) {
    return error;
  }

  // Network/Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new AppError(
      'Service connection failed',
      ErrorTypes.NETWORK_ERROR,
      503,
      ErrorSeverity.HIGH,
      { originalError: error.message, code: error.code }
    );
  }

  // Database errors
  if (error.name === 'SequelizeError' || error.name === 'MongoError') {
    return new AppError(
      'Database operation failed',
      ErrorTypes.DATABASE_ERROR,
      500,
      ErrorSeverity.HIGH,
      { originalError: error.message }
    );
  }

  // Validation errors from libraries
  if (error.name === 'ValidationError') {
    return new AppError(
      error.message,
      ErrorTypes.VALIDATION_ERROR,
      400,
      ErrorSeverity.LOW,
      { validationErrors: error.errors }
    );
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new AppError(
      'Invalid or expired token',
      ErrorTypes.AUTHENTICATION_ERROR,
      401,
      ErrorSeverity.MEDIUM
    );
  }

  // Default to internal server error
  return new AppError(
    'An unexpected error occurred',
    ErrorTypes.INTERNAL_SERVER_ERROR,
    500,
    ErrorSeverity.CRITICAL,
    { originalError: error.message, stack: error.stack }
  );
};

// Error response formatter
const formatErrorResponse = (error, req) => {
  const response = {
    error: {
      type: error.type,
      message: error.message,
      timestamp: error.timestamp,
      requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add tenant context if available
  if (req.headers['x-tenant-id']) {
    response.error.tenantId = req.headers['x-tenant-id'];
  }

  // Include details in development mode or for certain error types
  if (process.env.NODE_ENV === 'development' || 
      [ErrorTypes.VALIDATION_ERROR, ErrorTypes.BUSINESS_LOGIC_ERROR].includes(error.type)) {
    response.error.details = error.details;
  }

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

// Error logging function
const logError = (error, req, res) => {
  const logData = {
    error: {
      type: error.type,
      message: error.message,
      severity: error.severity,
      statusCode: error.statusCode,
      stack: error.stack
    },
    request: {
      id: req.headers['x-request-id'],
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      tenantId: req.headers['x-tenant-id']
    },
    response: {
      statusCode: res.statusCode
    },
    timestamp: new Date().toISOString()
  };

  // Log based on severity
  switch (error.severity) {
    case ErrorSeverity.LOW:
      logger.info('Low severity error:', logData);
      break;
    case ErrorSeverity.MEDIUM:
      logger.warn('Medium severity error:', logData);
      break;
    case ErrorSeverity.HIGH:
      logger.error('High severity error:', logData);
      break;
    case ErrorSeverity.CRITICAL:
      logger.error('CRITICAL ERROR:', logData);
      // In production, you might want to send alerts here
      break;
    default:
      logger.error('Unknown severity error:', logData);
  }
};

// Circuit breaker for external services
class CircuitBreaker {
  constructor(serviceName, options = {}) {
    this.serviceName = serviceName;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw createServiceUnavailableError(
          this.serviceName,
          `Circuit breaker is OPEN for ${this.serviceName}`
        );
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      serviceName: this.serviceName
    };
  }
}

// Retry mechanism with exponential backoff
const retryWithBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry certain types of errors
      if (error instanceof AppError && 
          [ErrorTypes.VALIDATION_ERROR, ErrorTypes.AUTHENTICATION_ERROR, ErrorTypes.AUTHORIZATION_ERROR].includes(error.type)) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Main error handling middleware
const comprehensiveErrorHandler = (error, req, res, next) => {
  // Classify the error
  const classifiedError = classifyError(error);
  
  // Log the error
  logError(classifiedError, req, res);
  
  // Format and send error response
  const errorResponse = formatErrorResponse(classifiedError, req);
  
  // Set appropriate status code
  res.status(classifiedError.statusCode);
  
  // Send error response
  res.json(errorResponse);
};

// Async error wrapper
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global unhandled error handlers
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise.toString(),
      timestamp: new Date().toISOString()
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

module.exports = {
  AppError,
  ErrorTypes,
  ErrorSeverity,
  createValidationError,
  createAuthenticationError,
  createAuthorizationError,
  createTenantIsolationError,
  createServiceUnavailableError,
  createRateLimitError,
  classifyError,
  formatErrorResponse,
  logError,
  CircuitBreaker,
  retryWithBackoff,
  comprehensiveErrorHandler,
  asyncErrorHandler,
  setupGlobalErrorHandlers
};
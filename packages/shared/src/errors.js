const { ERROR_CODES } = require('./constants');

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_SERVER_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Tenant not found error
 */
class TenantNotFoundError extends AppError {
  constructor(tenantId) {
    super(`Tenant not found: ${tenantId}`, ERROR_CODES.TENANT_NOT_FOUND, 404);
  }
}

/**
 * Unauthorized error
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, ERROR_CODES.UNAUTHORIZED, 401);
  }
}

/**
 * Forbidden error
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, ERROR_CODES.FORBIDDEN, 403);
  }
}

/**
 * Resource not found error
 */
class ResourceNotFoundError extends AppError {
  constructor(resource, id = null) {
    const message = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(message, ERROR_CODES.RESOURCE_NOT_FOUND, 404);
  }
}

/**
 * Insufficient inventory error
 */
class InsufficientInventoryError extends AppError {
  constructor(itemName, requested, available) {
    const message = `Insufficient inventory for ${itemName}. Requested: ${requested}, Available: ${available}`;
    super(message, ERROR_CODES.INSUFFICIENT_INVENTORY, 400, {
      itemName,
      requested,
      available,
    });
  }
}

/**
 * Payment failed error
 */
class PaymentFailedError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.PAYMENT_FAILED, 400, details);
  }
}

/**
 * Tenant access denied error
 */
class TenantAccessDeniedError extends AppError {
  constructor(message = 'Access denied to tenant resources') {
    super(message, ERROR_CODES.TENANT_ACCESS_DENIED, 403);
  }
}

/**
 * External service unavailable error
 */
class ExternalServiceUnavailableError extends AppError {
  constructor(serviceName) {
    super(`External service unavailable: ${serviceName}`, ERROR_CODES.EXTERNAL_SERVICE_UNAVAILABLE, 503);
  }
}

/**
 * Database error
 */
class DatabaseError extends AppError {
  constructor(message, details = null) {
    super(message, ERROR_CODES.DATABASE_ERROR, 500, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  TenantNotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ResourceNotFoundError,
  InsufficientInventoryError,
  PaymentFailedError,
  TenantAccessDeniedError,
  ExternalServiceUnavailableError,
  DatabaseError,
};
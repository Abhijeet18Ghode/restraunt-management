const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError } = require('@rms/shared');

/**
 * JWT Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new AuthenticationError('Access token is required');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      throw new AuthenticationError('Invalid or expired token');
    }

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;
    req.userRole = decoded.role;
    req.permissions = decoded.permissions || [];
    
    next();
  });
};

/**
 * Role-based authorization middleware
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.userRole) {
      throw new AuthenticationError('Authentication required');
    }

    if (!allowedRoles.includes(req.userRole)) {
      throw new AuthorizationError(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.permissions) {
      throw new AuthenticationError('Authentication required');
    }

    if (!req.permissions.includes(requiredPermission)) {
      throw new AuthorizationError(`Access denied. Required permission: ${requiredPermission}`);
    }

    next();
  };
};

/**
 * Tenant isolation middleware
 */
const requireTenant = (req, res, next) => {
  if (!req.tenantId) {
    throw new AuthenticationError('Tenant context is required');
  }

  // Add tenant ID to all database queries
  req.dbContext = {
    tenantId: req.tenantId,
  };

  next();
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireTenant,
};
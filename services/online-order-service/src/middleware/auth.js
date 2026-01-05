const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('@rms/shared');

/**
 * Authentication middleware for online order service
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Access token required'));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    
    req.user = user;
    next();
  });
};

/**
 * Tenant context middleware
 */
const extractTenantContext = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  
  if (!tenantId) {
    return next(new UnauthorizedError('Tenant ID required'));
  }
  
  req.tenantId = tenantId;
  next();
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new UnauthorizedError('User role required'));
    }
    
    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      return next(new UnauthorizedError(`Access denied. Required roles: ${requiredRoles.join(', ')}`));
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  extractTenantContext,
  requireRole,
};
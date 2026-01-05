const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('@rms/shared');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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
 * Middleware to ensure tenant context is available
 */
const requireTenant = (req, res, next) => {
  if (!req.user || !req.user.tenantId) {
    return next(new ForbiddenError('Tenant context required'));
  }
  
  req.tenantId = req.user.tenantId;
  next();
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ForbiddenError('User role required'));
    }

    const userRoles = Array.isArray(req.user.role) ? req.user.role : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      return next(new ForbiddenError(`Required role: ${requiredRoles.join(' or ')}`));
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  requireTenant,
  requireRole,
};
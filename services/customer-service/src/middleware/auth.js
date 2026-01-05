const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('@rms/shared');

/**
 * Authentication middleware for customer service
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

/**
 * Permission-based authorization middleware
 */
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user || !req.user.permissions) {
      return next(new UnauthorizedError('User permissions required'));
    }
    
    const userPermissions = Array.isArray(req.user.permissions) ? req.user.permissions : [req.user.permissions];
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasRequiredPermission) {
      return next(new UnauthorizedError(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`));
    }
    
    next();
  };
};

/**
 * Customer or staff access middleware (customer can access their own data or staff can access any)
 */
const requireCustomerOrStaff = (req, res, next) => {
  const targetCustomerId = req.params.customerId || req.params.id;
  const currentUserId = req.user.id;
  const userType = req.user.type; // 'customer' or 'staff'
  
  // Staff can access any customer data
  if (userType === 'staff') {
    return next();
  }
  
  // Customer can only access their own data
  if (userType === 'customer' && currentUserId === targetCustomerId) {
    return next();
  }
  
  return next(new UnauthorizedError('Access denied. You can only access your own data.'));
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user;
    }
    next();
  });
};

module.exports = {
  authenticateToken,
  extractTenantContext,
  requireRole,
  requirePermission,
  requireCustomerOrStaff,
  optionalAuth,
};
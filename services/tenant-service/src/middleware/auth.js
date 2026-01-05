const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('@rms/shared');

/**
 * JWT authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    throw new UnauthorizedError('Access token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired token');
  }
};

/**
 * Tenant context middleware
 */
const requireTenantContext = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
  
  if (!tenantId) {
    throw new UnauthorizedError('Tenant context required');
  }
  
  req.tenantId = tenantId;
  next();
};

/**
 * Role-based authorization middleware
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      throw new ForbiddenError(`Required role: ${requiredRoles.join(' or ')}`);
    }
    
    next();
  };
};

/**
 * Tenant admin authorization middleware
 */
const requireTenantAdmin = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  
  if (req.user.role !== 'TENANT_ADMIN') {
    throw new ForbiddenError('Tenant admin access required');
  }
  
  // Ensure user can only access their own tenant
  if (req.tenantId && req.user.tenantId !== req.tenantId) {
    throw new ForbiddenError('Access denied to tenant resources');
  }
  
  next();
};

/**
 * Validate tenant access middleware
 */
const validateTenantAccess = (req, res, next) => {
  if (!req.user || !req.tenantId) {
    throw new UnauthorizedError('Authentication and tenant context required');
  }
  
  // Ensure user can only access their own tenant's resources
  if (req.user.tenantId !== req.tenantId) {
    throw new ForbiddenError('Access denied to tenant resources');
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireTenantContext,
  requireRole,
  requireTenantAdmin,
  validateTenantAccess,
};
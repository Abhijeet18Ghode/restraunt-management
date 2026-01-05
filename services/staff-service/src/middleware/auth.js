const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { UnauthorizedError } = require('@rms/shared');

/**
 * Authentication middleware for staff service
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
 * Self or admin access middleware (staff can access their own data or admin can access any)
 */
const requireSelfOrAdmin = (req, res, next) => {
  const targetStaffId = req.params.staffId || req.params.id;
  const currentUserId = req.user.id;
  const userRole = req.user.role;
  
  // Admin can access any staff data
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    return next();
  }
  
  // Staff can only access their own data
  if (currentUserId === targetStaffId) {
    return next();
  }
  
  return next(new UnauthorizedError('Access denied. You can only access your own data.'));
};

/**
 * Hash password utility
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password utility
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generate JWT token
 */
const generateToken = (payload, expiresIn = null) => {
  const options = {};
  if (expiresIn) {
    options.expiresIn = expiresIn;
  } else {
    options.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }
  
  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
};

module.exports = {
  authenticateToken,
  extractTenantContext,
  requireRole,
  requirePermission,
  requireSelfOrAdmin,
  hashPassword,
  comparePassword,
  generateToken,
  generateRefreshToken,
};
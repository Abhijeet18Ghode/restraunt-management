const logger = require('../utils/logger');

// Mock authentication middleware for development
const auth = (req, res, next) => {
  try {
    // Extract tenant ID from headers
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      return res.status(401).json({
        success: false,
        error: 'Tenant ID is required'
      });
    }

    // In production, validate JWT token here
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authorization token is required'
      });
    }

    // Mock user data - in production, decode JWT
    req.user = {
      id: 'user-123',
      tenantId: tenantId,
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    };

    req.tenantId = tenantId;

    logger.debug('Authentication successful', {
      userId: req.user.id,
      tenantId: req.tenantId,
      role: req.user.role
    });

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

module.exports = { auth, authorize };
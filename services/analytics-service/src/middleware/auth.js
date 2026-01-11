const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid token.' 
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required.' 
      });
    }

    // Map TENANT_ADMIN to admin for role checking
    let userRole = req.user.role;
    if (userRole === 'TENANT_ADMIN') {
      userRole = 'admin';
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

module.exports = { auth, requireRole };
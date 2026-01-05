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

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// PCI compliance middleware - ensures sensitive data is not logged
const pciCompliance = (req, res, next) => {
  // Remove sensitive payment data from logs
  const originalSend = res.send;
  res.send = function(data) {
    // Mask sensitive data in response
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        if (parsed.cardNumber) {
          parsed.cardNumber = maskCardNumber(parsed.cardNumber);
        }
        if (parsed.cvv) {
          parsed.cvv = '***';
        }
        data = JSON.stringify(parsed);
      } catch (e) {
        // Not JSON, continue
      }
    }
    originalSend.call(this, data);
  };

  // Mask sensitive data in request body for logging
  if (req.body) {
    const maskedBody = { ...req.body };
    if (maskedBody.cardNumber) {
      maskedBody.cardNumber = maskCardNumber(maskedBody.cardNumber);
    }
    if (maskedBody.cvv) {
      maskedBody.cvv = '***';
    }
    req.maskedBody = maskedBody;
  }

  next();
};

const maskCardNumber = (cardNumber) => {
  if (!cardNumber) return '';
  const str = cardNumber.toString();
  return str.slice(0, 4) + '*'.repeat(str.length - 8) + str.slice(-4);
};

module.exports = { auth, requireRole, pciCompliance };
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('WebSocket connection attempted without token', {
        socketId: socket.id,
        ip: socket.handshake.address,
      });
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user info to socket
    socket.user = {
      id: decoded.id,
      tenantId: decoded.tenantId,
      outletId: decoded.outletId,
      role: decoded.role,
      permissions: decoded.permissions || [],
    };

    logger.info('WebSocket authentication successful', {
      socketId: socket.id,
      userId: decoded.id,
      tenantId: decoded.tenantId,
      outletId: decoded.outletId,
    });

    next();
  } catch (error) {
    logger.error('WebSocket authentication failed', {
      error: error.message,
      socketId: socket.id,
      ip: socket.handshake.address,
    });
    next(new Error('Invalid authentication token'));
  }
};

module.exports = authMiddleware;
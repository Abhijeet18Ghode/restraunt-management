const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create logs directory:', error.message);
}

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, tenantId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      service: service || 'api-gateway',
      message,
      ...(requestId && { requestId }),
      ...(tenantId && { tenantId }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.colorize(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, tenantId } = info;
    const serviceTag = service ? `[${service}]` : '[api-gateway]';
    const requestTag = requestId ? `[${requestId}]` : '';
    const tenantTag = tenantId ? `[tenant:${tenantId}]` : '';
    
    return `${timestamp} ${level} ${serviceTag}${requestTag}${tenantTag} ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  defaultMeta: { 
    service: process.env.SERVICE_NAME || 'api-gateway',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  ]
});

// Custom logging methods for different contexts
logger.request = (message, meta = {}) => {
  logger.http(message, { context: 'request', ...meta });
};

logger.response = (message, meta = {}) => {
  logger.http(message, { context: 'response', ...meta });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { context: 'security', ...meta });
};

logger.performance = (message, meta = {}) => {
  logger.info(message, { context: 'performance', ...meta });
};

logger.business = (message, meta = {}) => {
  logger.info(message, { context: 'business', ...meta });
};

logger.audit = (message, meta = {}) => {
  logger.info(message, { context: 'audit', ...meta });
};

// Method to create child logger with additional context
logger.child = (meta = {}) => {
  return logger.child(meta);
};

// Method to create request-scoped logger
logger.forRequest = (req) => {
  return logger.child({
    requestId: req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    tenantId: req.headers['x-tenant-id'],
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
};

// Performance timing helper
logger.time = (label) => {
  const start = process.hrtime.bigint();
  return {
    end: (message = `${label} completed`) => {
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      logger.performance(message, { 
        label, 
        duration: `${duration.toFixed(2)}ms`,
        durationMs: Math.round(duration)
      });
    }
  };
};

// Health check for logging system
logger.healthCheck = () => {
  try {
    logger.info('Logger health check', { timestamp: new Date().toISOString() });
    return { status: 'healthy', transports: logger.transports.length };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

module.exports = logger;
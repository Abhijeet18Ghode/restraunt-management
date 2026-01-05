const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Request logging middleware with comprehensive tracking
const requestLogger = (req, res, next) => {
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create request-scoped logger
  req.logger = logger.forRequest(req);

  // Start timing
  const startTime = process.hrtime.bigint();
  req.startTime = startTime;

  // Log incoming request
  req.logger.request('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? '[REDACTED]' : undefined,
      'x-tenant-id': req.get('x-tenant-id'),
      'x-request-id': req.get('x-request-id')
    },
    query: req.query,
    body: sanitizeRequestBody(req.body),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Capture original res.json and res.send methods
  const originalJson = res.json;
  const originalSend = res.send;

  // Override res.json to log response
  res.json = function(body) {
    logResponse(req, res, body, startTime);
    return originalJson.call(this, body);
  };

  // Override res.send to log response
  res.send = function(body) {
    logResponse(req, res, body, startTime);
    return originalSend.call(this, body);
  };

  // Handle response finish event
  res.on('finish', () => {
    if (!res.logged) {
      logResponse(req, res, null, startTime);
    }
  });

  // Handle response close event (for aborted requests)
  res.on('close', () => {
    if (!res.logged && !res.finished) {
      req.logger.warn('Request aborted by client', {
        statusCode: res.statusCode,
        duration: calculateDuration(startTime)
      });
    }
  });

  next();
};

// Function to log response
const logResponse = (req, res, body, startTime) => {
  if (res.logged) return; // Prevent duplicate logging
  res.logged = true;

  const duration = calculateDuration(startTime);
  const statusCode = res.statusCode;

  // Determine log level based on status code
  let logLevel = 'info';
  if (statusCode >= 400 && statusCode < 500) {
    logLevel = 'warn';
  } else if (statusCode >= 500) {
    logLevel = 'error';
  }

  // Log response
  req.logger[logLevel]('Request completed', {
    statusCode,
    duration,
    responseSize: res.get('Content-Length') || (body ? JSON.stringify(body).length : 0),
    headers: {
      'content-type': res.get('Content-Type'),
      'content-length': res.get('Content-Length')
    },
    body: sanitizeResponseBody(body, statusCode),
    performance: {
      durationMs: Math.round(Number(duration.replace('ms', ''))),
      category: categorizeDuration(duration)
    }
  });

  // Log performance metrics
  if (Number(duration.replace('ms', '')) > 1000) {
    req.logger.performance('Slow request detected', {
      duration,
      url: req.originalUrl,
      method: req.method,
      statusCode
    });
  }

  // Log security events
  if (statusCode === 401 || statusCode === 403) {
    req.logger.security('Authentication/Authorization failure', {
      statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // Log business events
  if (req.method === 'POST' && statusCode === 201) {
    req.logger.business('Resource created', {
      url: req.originalUrl,
      tenantId: req.headers['x-tenant-id']
    });
  }

  // Audit logging for sensitive operations
  if (shouldAuditLog(req, statusCode)) {
    req.logger.audit('Sensitive operation performed', {
      operation: `${req.method} ${req.originalUrl}`,
      statusCode,
      tenantId: req.headers['x-tenant-id'],
      userId: extractUserId(req),
      ip: req.ip
    });
  }
};

// Sanitize request body to remove sensitive information
const sanitizeRequestBody = (body) => {
  if (!body || typeof body !== 'object') return body;

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization', 'credit_card', 'ssn'];
  const sanitized = { ...body };

  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

// Sanitize response body
const sanitizeResponseBody = (body, statusCode) => {
  // Don't log response body for errors (might contain sensitive info)
  if (statusCode >= 400) {
    return '[ERROR_RESPONSE_REDACTED]';
  }

  // Don't log large response bodies
  if (body && JSON.stringify(body).length > 10000) {
    return '[LARGE_RESPONSE_TRUNCATED]';
  }

  return sanitizeRequestBody(body);
};

// Calculate request duration
const calculateDuration = (startTime) => {
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  return `${duration.toFixed(2)}ms`;
};

// Categorize duration for performance analysis
const categorizeDuration = (duration) => {
  const ms = Number(duration.replace('ms', ''));
  if (ms < 100) return 'fast';
  if (ms < 500) return 'normal';
  if (ms < 1000) return 'slow';
  return 'very_slow';
};

// Check if request should be audit logged
const shouldAuditLog = (req, statusCode) => {
  const auditPaths = ['/api/tenants', '/api/staff', '/api/payments'];
  const auditMethods = ['POST', 'PUT', 'DELETE'];
  
  return auditMethods.includes(req.method) && 
         auditPaths.some(path => req.originalUrl.startsWith(path)) &&
         statusCode < 400;
};

// Extract user ID from request (implement based on your auth system)
const extractUserId = (req) => {
  // This would typically extract from JWT token or session
  return req.user?.id || req.headers['x-user-id'] || 'anonymous';
};

// Error logging middleware
const errorLogger = (error, req, res, next) => {
  const requestLogger = req.logger || logger;
  
  requestLogger.error('Request error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: sanitizeRequestBody(req.body)
    }
  });

  next(error);
};

module.exports = {
  requestLogger,
  errorLogger,
  sanitizeRequestBody,
  sanitizeResponseBody
};
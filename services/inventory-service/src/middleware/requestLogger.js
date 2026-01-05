/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, {
    tenantId: req.tenantId,
    userId: req.userId,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`, {
      tenantId: req.tenantId,
      userId: req.userId,
      statusCode: res.statusCode,
      duration,
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;
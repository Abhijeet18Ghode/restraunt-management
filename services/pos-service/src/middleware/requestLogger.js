/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.id,
    tenant: req.tenantId,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });

  next();
};

module.exports = requestLogger;
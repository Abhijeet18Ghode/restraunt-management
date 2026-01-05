const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  };

  // Payment-specific errors
  if (err.type === 'StripeCardError') {
    error.statusCode = 400;
    error.message = 'Card payment failed: ' + err.message;
  }

  if (err.type === 'StripeInvalidRequestError') {
    error.statusCode = 400;
    error.message = 'Invalid payment request: ' + err.message;
  }

  if (err.type === 'StripeAPIError') {
    error.statusCode = 502;
    error.message = 'Payment gateway error. Please try again.';
  }

  if (err.type === 'StripeConnectionError') {
    error.statusCode = 503;
    error.message = 'Payment service temporarily unavailable.';
  }

  // Validation error
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }

  // Database error
  if (err.code === '23505') {
    error.statusCode = 400;
    error.message = 'Duplicate entry';
  }

  // PCI compliance error
  if (err.code === 'PCI_VIOLATION') {
    error.statusCode = 400;
    error.message = 'Payment data security violation';
  }

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    code: err.code || 'UNKNOWN_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
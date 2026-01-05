const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || 'Internal Server Error'
  };

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

  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
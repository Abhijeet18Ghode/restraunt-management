const express = require('express');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('@rms/shared');
const { authenticateToken } = require('../middleware/auth');
const TenantService = require('../services/TenantService');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError('Validation failed', errors.array());
  }
  next();
};

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 1 })
    .withMessage('Password is required'),
  body('tenantId')
    .optional()
    .isUUID()
    .withMessage('Valid tenant ID is required if provided'),
];

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', loginValidation, handleValidationErrors, async (req, res, next) => {
  try {
    const { email, password, tenantId } = req.body;
    const tenantService = new TenantService(req.app.locals.db);
    const result = await tenantService.authenticateUser(email, password, tenantId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // In production, you might want to implement token blacklisting
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/auth/validate
 * Validate JWT token and return user data
 */
router.get('/validate', authenticateToken, async (req, res, next) => {
  try {
    // The authenticateToken middleware already validates the token
    // and adds the decoded user data to req.user
    const userData = {
      id: req.user.userId,
      tenantId: req.user.tenantId,
      email: req.user.email,
      role: req.user.role,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    };

    res.json({
      success: true,
      message: 'Token is valid',
      user: userData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token (future implementation)
 */
router.post('/refresh', (req, res) => {
  // Future implementation for token refresh
  res.status(501).json({
    success: false,
    message: 'Token refresh not implemented yet',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
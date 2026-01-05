const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique ID
 */
const generateId = () => uuidv4();

/**
 * Generate tenant-specific schema name
 */
const generateSchemaName = (tenantId) => {
  return `tenant_${tenantId.replace(/-/g, '_')}`;
};

/**
 * Generate unique order number
 */
const generateOrderNumber = (outletId) => {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const outletPrefix = outletId.substring(0, 3).toUpperCase();
  return `${outletPrefix}-${timestamp}-${random}`;
};

/**
 * Generate unique invoice number
 */
const generateInvoiceNumber = (tenantId) => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-6);
  const tenantPrefix = tenantId.substring(0, 3).toUpperCase();
  
  return `INV-${tenantPrefix}-${year}${month}${day}-${timestamp}`;
};

/**
 * Calculate tax amount
 */
const calculateTax = (amount, taxRate) => {
  return Math.round((amount * taxRate / 100) * 100) / 100;
};

/**
 * Calculate discount amount
 */
const calculateDiscount = (amount, discountRate, maxDiscount = null) => {
  const discount = Math.round((amount * discountRate / 100) * 100) / 100;
  return maxDiscount ? Math.min(discount, maxDiscount) : discount;
};

/**
 * Format currency amount
 */
const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

/**
 * Validate tenant context
 */
const validateTenantContext = (requestTenantId, resourceTenantId) => {
  if (requestTenantId !== resourceTenantId) {
    throw new Error('Tenant access denied');
  }
};

/**
 * Sanitize string for database usage
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * Generate pagination metadata
 */
const generatePaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
};

/**
 * Create standardized API response
 */
const createApiResponse = (data, message = 'Success', meta = null) => {
  const response = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * Create standardized error response
 */
const createErrorResponse = (code, message, details = null) => {
  const response = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
    },
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
};

/**
 * Sleep utility for testing
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  generateId,
  generateSchemaName,
  generateOrderNumber,
  generateInvoiceNumber,
  calculateTax,
  calculateDiscount,
  formatCurrency,
  validateTenantContext,
  sanitizeString,
  generatePaginationMeta,
  createApiResponse,
  createErrorResponse,
  sleep,
};
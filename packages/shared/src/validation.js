const Joi = require('joi');
const { ORDER_TYPES, PAYMENT_METHODS, USER_ROLES, SUBSCRIPTION_PLANS, INVENTORY_UNITS } = require('./constants');

// Common validation schemas
const commonSchemas = {
  id: Joi.string().uuid().required(),
  tenantId: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional(),
  price: Joi.number().positive().precision(2).required(),
  quantity: Joi.number().integer().positive().required(),
  percentage: Joi.number().min(0).max(100).required(),
  date: Joi.date().iso().required(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  },
};

// Tenant validation schemas
const tenantSchemas = {
  createTenant: Joi.object({
    businessName: commonSchemas.name,
    contactInfo: Joi.object({
      email: commonSchemas.email,
      phone: commonSchemas.phone,
      address: Joi.object({
        street: Joi.string().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        country: Joi.string().required(),
        zipCode: Joi.string().required(),
      }).required(),
    }).required(),
    subscriptionPlan: Joi.string().valid(...Object.values(SUBSCRIPTION_PLANS)).default('BASIC'),
  }),
  
  updateTenant: Joi.object({
    businessName: Joi.string().min(2).max(100).optional(),
    contactInfo: Joi.object({
      email: Joi.string().email().optional(),
      phone: Joi.string().pattern(/^[+]?[1-9][\d\s\-()]{7,15}$/).optional(),
      address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        country: Joi.string().optional(),
        zipCode: Joi.string().optional(),
      }).optional(),
    }).optional(),
    subscriptionPlan: Joi.string().valid(...Object.values(SUBSCRIPTION_PLANS)).optional(),
  }),
};

// Outlet validation schemas
const outletSchemas = {
  createOutlet: Joi.object({
    name: commonSchemas.name,
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zipCode: Joi.string().required(),
    }).required(),
    operatingHours: Joi.object({
      monday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      tuesday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      wednesday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      thursday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      friday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      saturday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
      sunday: Joi.object({ open: Joi.string(), close: Joi.string() }).optional(),
    }).required(),
    taxConfiguration: Joi.object({
      gst: Joi.number().min(0).max(100).required(),
      serviceCharge: Joi.number().min(0).max(100).default(0),
    }).required(),
  }),
};

// Menu validation schemas
const menuSchemas = {
  createMenuItem: Joi.object({
    name: commonSchemas.name,
    description: commonSchemas.description,
    category: Joi.string().required(),
    price: commonSchemas.price,
    preparationTime: Joi.number().integer().min(1).required(),
    ingredients: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit: Joi.string().valid(...Object.values(INVENTORY_UNITS)).required(),
    })).optional(),
    outletIds: Joi.array().items(commonSchemas.id).min(1).required(),
  }),
  
  updateMenuItem: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    category: Joi.string().optional(),
    price: Joi.number().positive().precision(2).optional(),
    preparationTime: Joi.number().integer().min(1).optional(),
    isAvailable: Joi.boolean().optional(),
    ingredients: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      quantity: Joi.number().positive().required(),
      unit: Joi.string().valid(...Object.values(INVENTORY_UNITS)).required(),
    })).optional(),
    outletIds: Joi.array().items(commonSchemas.id).optional(),
  }),
};

// Order validation schemas
const orderSchemas = {
  createOrder: Joi.object({
    outletId: commonSchemas.id,
    type: Joi.string().valid(...Object.values(ORDER_TYPES)).required(),
    tableId: commonSchemas.id.optional(),
    customerId: commonSchemas.id.optional(),
    items: Joi.array().items(Joi.object({
      menuItemId: commonSchemas.id,
      quantity: commonSchemas.quantity,
      specialInstructions: Joi.string().max(200).optional(),
    })).min(1).required(),
    discountRate: Joi.number().min(0).max(100).default(0),
  }),
  
  updateOrderStatus: Joi.object({
    status: Joi.string().valid('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED').required(),
  }),
};

// Payment validation schemas
const paymentSchemas = {
  processPayment: Joi.object({
    orderId: commonSchemas.id,
    method: Joi.string().valid(...Object.values(PAYMENT_METHODS)).required(),
    amount: commonSchemas.price,
    reference: Joi.string().optional(),
  }),
};

// Staff validation schemas
const staffSchemas = {
  createStaff: Joi.object({
    outletId: commonSchemas.id,
    employeeId: Joi.string().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    role: Joi.string().valid(...Object.values(USER_ROLES)).required(),
    permissions: Joi.object().optional(),
  }),
};

// Inventory validation schemas
const inventorySchemas = {
  createInventoryItem: Joi.object({
    outletId: commonSchemas.id,
    name: commonSchemas.name,
    category: Joi.string().required(),
    unit: Joi.string().valid(...Object.values(INVENTORY_UNITS)).required(),
    currentStock: Joi.number().min(0).required(),
    minimumStock: Joi.number().min(0).required(),
    maximumStock: Joi.number().min(0).optional(),
    unitCost: Joi.number().positive().precision(2).required(),
    supplierId: commonSchemas.id.optional(),
  }),
  
  updateStock: Joi.object({
    quantity: Joi.number().required(),
    type: Joi.string().valid('ADD', 'SUBTRACT', 'SET').required(),
    reason: Joi.string().required(),
  }),
};

module.exports = {
  commonSchemas,
  tenantSchemas,
  outletSchemas,
  menuSchemas,
  orderSchemas,
  paymentSchemas,
  staffSchemas,
  inventorySchemas,
};
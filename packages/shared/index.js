// Shared utilities and constants for Restaurant Management System

module.exports = {
  // Constants
  ...require('./src/constants'),
  
  // Utilities
  ...require('./src/utils'),
  
  // Validation schemas
  ...require('./src/validation'),
  
  // Error classes
  ...require('./src/errors'),
  
  // Database utilities
  ...require('./src/database'),
  
  // Models
  BaseModel: require('./src/models/BaseModel'),
  OutletModel: require('./src/models/OutletModel'),
  MenuItemModel: require('./src/models/MenuItemModel'),
  OrderModel: require('./src/models/OrderModel'),
  InventoryItemModel: require('./src/models/InventoryItemModel'),
};
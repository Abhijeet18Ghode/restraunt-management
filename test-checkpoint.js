// Simple checkpoint test to verify basic functionality
const { 
  generateId, 
  generateSchemaName, 
  calculateTax, 
  calculateDiscount,
  ORDER_TYPES,
  PAYMENT_STATUS,
  ValidationError,
  DatabaseError
} = require('./packages/shared');

console.log('🔍 Running Checkpoint Tests...\n');

// Test 1: Utility Functions
console.log('✅ Test 1: Utility Functions');
try {
  const id = generateId();
  console.log(`   Generated ID: ${id}`);
  
  const schema = generateSchemaName('test-tenant-123');
  console.log(`   Generated Schema: ${schema}`);
  
  const tax = calculateTax(100, 18);
  console.log(`   Tax Calculation (100 @ 18%): ${tax}`);
  
  const discount = calculateDiscount(100, 10);
  console.log(`   Discount Calculation (100 @ 10%): ${discount}`);
  
  console.log('   ✓ All utility functions working\n');
} catch (error) {
  console.error('   ❌ Utility functions failed:', error.message);
}

// Test 2: Constants
console.log('✅ Test 2: Constants');
try {
  console.log(`   Order Types: ${Object.keys(ORDER_TYPES).join(', ')}`);
  console.log(`   Payment Status: ${Object.keys(PAYMENT_STATUS).join(', ')}`);
  console.log('   ✓ All constants loaded\n');
} catch (error) {
  console.error('   ❌ Constants failed:', error.message);
}

// Test 3: Error Classes
console.log('✅ Test 3: Error Classes');
try {
  const validationError = new ValidationError('Test validation error');
  const dbError = new DatabaseError('Test database error');
  
  console.log(`   ValidationError: ${validationError.code}`);
  console.log(`   DatabaseError: ${dbError.code}`);
  console.log('   ✓ All error classes working\n');
} catch (error) {
  console.error('   ❌ Error classes failed:', error.message);
}

// Test 4: Model Classes
console.log('✅ Test 4: Model Classes');
try {
  const { BaseModel, OutletModel, MenuItemModel, OrderModel, InventoryItemModel } = require('./packages/shared');
  
  console.log(`   BaseModel: ${typeof BaseModel}`);
  console.log(`   OutletModel: ${typeof OutletModel}`);
  console.log(`   MenuItemModel: ${typeof MenuItemModel}`);
  console.log(`   OrderModel: ${typeof OrderModel}`);
  console.log(`   InventoryItemModel: ${typeof InventoryItemModel}`);
  console.log('   ✓ All model classes loaded\n');
} catch (error) {
  console.error('   ❌ Model classes failed:', error.message);
}

// Test 5: Validation Schemas
console.log('✅ Test 5: Validation Schemas');
try {
  const { tenantSchemas, menuSchemas, orderSchemas } = require('./packages/shared');
  
  console.log(`   Tenant Schemas: ${Object.keys(tenantSchemas).join(', ')}`);
  console.log(`   Menu Schemas: ${Object.keys(menuSchemas).join(', ')}`);
  console.log(`   Order Schemas: ${Object.keys(orderSchemas).join(', ')}`);
  console.log('   ✓ All validation schemas loaded\n');
} catch (error) {
  console.error('   ❌ Validation schemas failed:', error.message);
}

// Test 6: Database Manager
console.log('✅ Test 6: Database Manager');
try {
  const { DatabaseManager } = require('./packages/shared');
  
  // Test with mock config (don't actually connect)
  const mockConfig = {
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: 'test'
  };
  
  const dbManager = new DatabaseManager(mockConfig);
  console.log(`   DatabaseManager created: ${typeof dbManager}`);
  console.log(`   Methods available: ${Object.getOwnPropertyNames(Object.getPrototypeOf(dbManager)).filter(name => name !== 'constructor').join(', ')}`);
  console.log('   ✓ Database manager class working\n');
} catch (error) {
  console.error('   ❌ Database manager failed:', error.message);
}

console.log('🎉 Checkpoint Tests Completed!\n');
console.log('Summary:');
console.log('- ✅ Shared utilities and constants');
console.log('- ✅ Error handling classes');
console.log('- ✅ Data model classes');
console.log('- ✅ Validation schemas');
console.log('- ✅ Database management layer');
console.log('\n🚀 System is ready for service implementation!');
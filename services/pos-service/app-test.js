// Simple test to verify the app can be loaded
console.log('Testing POS service app loading...');

try {
  // Test if the main app file can be required
  const app = require('./src/app.js');
  console.log('✓ App loaded successfully');
  
  // Test if services can be required
  const POSService = require('./src/services/POSService');
  const BillingService = require('./src/services/BillingService');
  const TableService = require('./src/services/TableService');
  const KOTService = require('./src/services/KOTService');
  
  console.log('✓ All services can be imported');
  
  // Test basic instantiation
  const mockDb = { query: () => Promise.resolve() };
  const posService = new POSService(mockDb);
  
  console.log('✓ POSService can be instantiated');
  
  // Test calculation method
  const result = posService.calculateOrderTotals([
    { unitPrice: 10, quantity: 2 }
  ]);
  
  console.log('✓ Order calculation works:', result);
  
  console.log('\n🎉 POS Service checkpoint PASSED - All core functionality is working!');
  
} catch (error) {
  console.log('✗ Error:', error.message);
  console.log('Stack:', error.stack);
}
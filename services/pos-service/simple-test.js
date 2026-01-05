// Simple test to verify POS service functionality without Jest
const POSService = require('./src/services/POSService');

console.log('Testing POS Service core functionality...');

// Mock database and order model
const mockDb = { query: () => Promise.resolve() };
const mockOrderModel = {
  create: (tenantId, orderData) => Promise.resolve({
    id: 'test-order-123',
    orderNumber: 'ORD-001-20240105-123456',
    ...orderData,
    createdAt: new Date(),
  }),
  findById: () => Promise.resolve(null),
  updateById: () => Promise.resolve(null),
};

const posService = new POSService(mockDb);
posService.orderModel = mockOrderModel;

// Test 1: Basic order creation
async function testBasicOrderCreation() {
  console.log('\n1. Testing basic order creation...');
  
  const orderData = {
    outletId: 'outlet-123',
    orderType: 'DINE_IN',
    items: [
      {
        menuItemId: 'item-1',
        menuItemName: 'Test Item',
        quantity: 2,
        unitPrice: 10.50,
        specialInstructions: null
      }
    ]
  };

  try {
    const result = await posService.createOrder('tenant-123', orderData);
    console.log('✓ Order created successfully');
    console.log('  Subtotal:', result.data.subtotal);
    console.log('  Tax:', result.data.tax);
    console.log('  Total:', result.data.total);
    
    // Verify calculations
    const expectedSubtotal = 21.00; // 2 * 10.50
    const expectedTax = Math.round(expectedSubtotal * 0.18 * 100) / 100;
    const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;
    
    if (Math.abs(result.data.subtotal - expectedSubtotal) < 0.01 &&
        Math.abs(result.data.tax - expectedTax) < 0.01 &&
        Math.abs(result.data.total - expectedTotal) < 0.01) {
      console.log('✓ Calculations are correct');
    } else {
      console.log('✗ Calculation mismatch');
      console.log('  Expected: subtotal=', expectedSubtotal, 'tax=', expectedTax, 'total=', expectedTotal);
    }
  } catch (error) {
    console.log('✗ Order creation failed:', error.message);
  }
}

// Test 2: Small floating point values
async function testSmallFloatingPoint() {
  console.log('\n2. Testing small floating point values...');
  
  const orderData = {
    outletId: 'outlet-123',
    orderType: 'DINE_IN',
    items: [
      {
        menuItemId: 'item-1',
        menuItemName: 'Test Item',
        quantity: 1,
        unitPrice: 0.009999999776482582, // The problematic value from the test
        specialInstructions: null
      }
    ]
  };

  try {
    const result = await posService.createOrder('tenant-123', orderData);
    console.log('✓ Order with small float created successfully');
    console.log('  Subtotal:', result.data.subtotal);
    console.log('  Tax:', result.data.tax);
    console.log('  Total:', result.data.total);
    
    // This should round to 0.01
    const expectedSubtotal = 0.01;
    const expectedTax = Math.round(expectedSubtotal * 0.18 * 100) / 100;
    const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;
    
    console.log('  Expected: subtotal=', expectedSubtotal, 'tax=', expectedTax, 'total=', expectedTotal);
    
    if (Math.abs(result.data.subtotal - expectedSubtotal) < 0.01) {
      console.log('✓ Small float handling is correct');
    } else {
      console.log('✗ Small float handling failed');
    }
  } catch (error) {
    console.log('✗ Small float test failed:', error.message);
  }
}

// Test 3: Zero values
async function testZeroValues() {
  console.log('\n3. Testing zero values...');
  
  const orderData = {
    outletId: 'outlet-123',
    orderType: 'DINE_IN',
    items: [
      {
        menuItemId: 'item-1',
        menuItemName: 'Free Item',
        quantity: 1,
        unitPrice: 0,
        specialInstructions: null
      }
    ]
  };

  try {
    const result = await posService.createOrder('tenant-123', orderData);
    console.log('✓ Zero value order created successfully');
    console.log('  Subtotal:', result.data.subtotal);
    console.log('  Tax:', result.data.tax);
    console.log('  Total:', result.data.total);
    
    if (result.data.subtotal === 0 && result.data.tax === 0 && result.data.total === 0) {
      console.log('✓ Zero value handling is correct');
    } else {
      console.log('✗ Zero value handling failed');
    }
  } catch (error) {
    console.log('✗ Zero value test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    await testBasicOrderCreation();
    await testSmallFloatingPoint();
    await testZeroValues();
    console.log('\n✓ All core functionality tests completed');
  } catch (error) {
    console.log('\n✗ Test suite failed:', error.message);
  }
}

runTests();
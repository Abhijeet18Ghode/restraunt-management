const POSService = require('./src/services/POSService');

// Mock database and order model
const mockDb = { query: jest.fn() };
const mockOrderModel = {
  create: jest.fn().mockResolvedValue({
    id: 'test-order',
    orderNumber: 'ORD-001-20240105-123456',
    subtotal: 0,
    tax: 0,
    total: 0,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: new Date(),
  }),
};

const posService = new POSService(mockDb);
posService.orderModel = mockOrderModel;

// Test the problematic case
const testData = {
  outletId: "00000000-0000-1000-8000-000000000000",
  orderType: "DINE_IN",
  items: [{
    menuItemId: "00000000-0000-1000-8000-000000000000",
    menuItemName: "   ",
    quantity: 1,
    unitPrice: 0.009999999776482582,
    specialInstructions: null
  }]
};

console.log('Testing problematic case:');
console.log('Input unitPrice:', testData.items[0].unitPrice);
console.log('Input quantity:', testData.items[0].quantity);

// Test the calculation method directly
const totals = posService.calculateOrderTotals(testData.items);
console.log('Calculated totals:', totals);

// Test what the expected calculation should be
let expectedSubtotal = 0;
testData.items.forEach(item => {
  const itemTotal = item.unitPrice * item.quantity;
  console.log('Item total before rounding:', itemTotal);
  expectedSubtotal += itemTotal;
});
console.log('Expected subtotal before rounding:', expectedSubtotal);

expectedSubtotal = Math.round(expectedSubtotal * 100) / 100;
console.log('Expected subtotal after rounding:', expectedSubtotal);

const expectedTax = Math.round(expectedSubtotal * 0.18 * 100) / 100;
const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;

console.log('Expected tax:', expectedTax);
console.log('Expected total:', expectedTotal);
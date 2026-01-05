const fc = require('fast-check');
const POSService = require('../../src/services/POSService');
const { OrderModel } = require('@rms/shared');

describe('Order Total Calculation Accuracy Property Tests', () => {
  let posService;
  let mockDb;
  let mockOrderModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    mockOrderModel = {
      create: jest.fn().mockImplementation((tenantId, orderData) => {
        // Return the order data with the calculated totals
        return Promise.resolve({
          id: 'order-' + Math.random().toString(36).substr(2, 9),
          orderNumber: 'ORD-001-20240105-123456',
          ...orderData,
          createdAt: new Date(),
        });
      }),
      findById: jest.fn(),
      updateById: jest.fn(),
    };
    
    posService = new POSService(mockDb);
    posService.orderModel = mockOrderModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for menu items
  const menuItemGenerator = () => fc.record({
    menuItemId: fc.uuid(),
    menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(1000), noNaN: true }),
    specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  });

  // Generator for order data
  const orderDataGenerator = () => fc.record({
    outletId: fc.uuid(),
    tableId: fc.option(fc.uuid(), { nil: null }),
    customerId: fc.option(fc.uuid(), { nil: null }),
    orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
    items: fc.array(menuItemGenerator(), { minLength: 1, maxLength: 10 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  });

  /**
   * Property 1: Order Total Calculation Accuracy
   * For any combination of menu items, quantities, taxes, and discounts, 
   * the calculated total should equal the sum of (item_price × quantity) for all items, plus applicable taxes, minus applicable discounts
   * Validates: Requirements 1.1
   */
  describe('Property 1: Order Total Calculation Accuracy', () => {
    it('should calculate order totals accurately for any combination of items', async () => {
      // Feature: restaurant-management-system, Property 1: Order Total Calculation Accuracy
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        orderDataGenerator(),
        async (tenantId, orderData) => {
          // Calculate expected totals manually (matching implementation)
          let expectedSubtotal = 0;
          orderData.items.forEach(item => {
            const itemTotal = item.unitPrice * item.quantity;
            expectedSubtotal += itemTotal;
          });

          // Round subtotal to match implementation
          expectedSubtotal = Math.round(expectedSubtotal * 100) / 100;
          
          // Calculate expected tax (18% GST as per implementation)
          const expectedTax = Math.round(expectedSubtotal * 0.18 * 100) / 100;
          const expectedTotal = Math.round((expectedSubtotal + expectedTax) * 100) / 100;

          // Call the service method
          const result = await posService.createOrder(tenantId, orderData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('subtotal');
          expect(result.data).toHaveProperty('tax');
          expect(result.data).toHaveProperty('total');

          // Verify calculation accuracy (monetary values should be precise to 2 decimal places)
          expect(result.data.subtotal).toBeCloseTo(expectedSubtotal, 2);
          expect(result.data.tax).toBeCloseTo(expectedTax, 2);
          expect(result.data.total).toBeCloseTo(expectedTotal, 2);

          // Verify total equals subtotal + tax
          expect(result.data.total).toBeCloseTo(result.data.subtotal + result.data.tax, 2);

          // Verify order was created with correct totals
          expect(mockOrderModel.create).toHaveBeenCalledWith(
            tenantId,
            expect.objectContaining({
              subtotal: expectedSubtotal,
              tax: expectedTax,
              total: expectedTotal,
            })
          );
        }
      ), { numRuns: 20 });
    });

    it('should handle zero-priced items correctly', async () => {
      // Feature: restaurant-management-system, Property 1: Order Total Calculation Accuracy
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          outletId: fc.uuid(),
          orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
          items: fc.array(fc.record({
            menuItemId: fc.uuid(),
            menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 10 }),
            unitPrice: fc.constantFrom(0, 0.00), // Zero price items
            specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          }), { minLength: 1, maxLength: 5 }),
        }),
        async (tenantId, orderData) => {
          // Call the service method
          const result = await posService.createOrder(tenantId, orderData);

          // For zero-priced items, all totals should be zero
          expect(result.data.subtotal).toBe(0);
          expect(result.data.tax).toBe(0);
          expect(result.data.total).toBe(0);
        }
      ), { numRuns: 20 });
    });

    it('should maintain precision with decimal prices and quantities', async () => {
      // Feature: restaurant-management-system, Property 1: Order Total Calculation Accuracy
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          outletId: fc.uuid(),
          orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
          items: fc.array(fc.record({
            menuItemId: fc.uuid(),
            menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 5 }),
            unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(99.99), noNaN: true }), // Decimal prices
            specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          }), { minLength: 1, maxLength: 3 }),
        }),
        async (tenantId, orderData) => {
          // Call the service method
          const result = await posService.createOrder(tenantId, orderData);

          // Verify precision - all monetary values should have at most 2 decimal places
          expect(Number.isFinite(result.data.subtotal)).toBe(true);
          expect(Number.isFinite(result.data.tax)).toBe(true);
          expect(Number.isFinite(result.data.total)).toBe(true);

          // Check decimal precision (should be rounded to 2 decimal places)
          expect(result.data.subtotal).toBe(Math.round(result.data.subtotal * 100) / 100);
          expect(result.data.tax).toBe(Math.round(result.data.tax * 100) / 100);
          expect(result.data.total).toBe(Math.round(result.data.total * 100) / 100);

          // Verify total is sum of subtotal and tax (within floating point precision)
          const calculatedTotal = result.data.subtotal + result.data.tax;
          expect(result.data.total).toBeCloseTo(calculatedTotal, 2);
        }
      ), { numRuns: 20 });
    });

    it('should handle large quantities and prices without overflow', async () => {
      // Feature: restaurant-management-system, Property 1: Order Total Calculation Accuracy
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          outletId: fc.uuid(),
          orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
          items: fc.array(fc.record({
            menuItemId: fc.uuid(),
            menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 100 }), // Large quantities
            unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(10000), noNaN: true }), // Large prices
            specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
          }), { minLength: 1, maxLength: 3 }),
        }),
        async (tenantId, orderData) => {
          // Call the service method
          const result = await posService.createOrder(tenantId, orderData);

          // Verify no overflow or invalid numbers
          expect(Number.isFinite(result.data.subtotal)).toBe(true);
          expect(Number.isFinite(result.data.tax)).toBe(true);
          expect(Number.isFinite(result.data.total)).toBe(true);
          expect(result.data.subtotal).toBeGreaterThanOrEqual(0);
          expect(result.data.tax).toBeGreaterThanOrEqual(0);
          expect(result.data.total).toBeGreaterThanOrEqual(0);

          // Verify mathematical relationship holds
          expect(result.data.total).toBeCloseTo(result.data.subtotal + result.data.tax, 2);
        }
      ), { numRuns: 20 });
    });
  });
});
const fc = require('fast-check');
const POSService = require('../../src/services/POSService');
const BillingService = require('../../src/services/BillingService');
const { OrderModel } = require('@rms/shared');

describe('Bill Split Integrity Property Tests', () => {
  let posService;
  let billingService;
  let mockDb;
  let mockOrderModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    mockOrderModel = {
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
    };
    
    posService = new POSService(mockDb);
    posService.orderModel = mockOrderModel;
    
    billingService = new BillingService(mockDb);
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for order items
  const orderItemGenerator = () => fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    menuItemId: fc.uuid(),
    menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 5 }),
    unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
    totalPrice: fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }),
  });

  // Generator for mock orders
  const mockOrderGenerator = () => fc.record({
    id: fc.uuid(),
    orderNumber: fc.string({ minLength: 10, maxLength: 30 }),
    outletId: fc.uuid(),
    tableId: fc.uuid(),
    items: fc.array(orderItemGenerator(), { minLength: 2, maxLength: 8 }),
    subtotal: fc.float({ min: Math.fround(10), max: Math.fround(1000), noNaN: true }),
    tax: fc.float({ min: Math.fround(1), max: Math.fround(180), noNaN: true }),
    total: fc.float({ min: Math.fround(11), max: Math.fround(1180), noNaN: true }),
    paymentStatus: fc.constantFrom('PENDING'),
  });

  // Generator for split amounts
  const splitAmountsGenerator = (total) => {
    return fc.array(
      fc.float({ min: Math.fround(0.01), max: Math.fround(total / 2), noNaN: true }),
      { minLength: 2, maxLength: 5 }
    ).map(amounts => {
      // Adjust the last amount to make the total match exactly
      const sumExceptLast = amounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0);
      amounts[amounts.length - 1] = Math.round((total - sumExceptLast) * 100) / 100;
      return amounts.filter(amount => amount > 0);
    });
  };

  /**
   * Property 5: Bill Split Integrity
   * For any split bill operation, the sum of all resulting split bills should equal the original bill total
   * Validates: Requirements 1.5
   */
  describe('Property 5: Bill Split Integrity', () => {
    it('should maintain total integrity when splitting bills by equal amounts', async () => {
      // Feature: restaurant-management-system, Property 5: Bill Split Integrity
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        mockOrderGenerator(),
        fc.integer({ min: 2, max: 6 }),
        async (tenantId, mockOrder, numberOfSplits) => {
          // Ensure order items total matches order subtotal
          const itemsTotal = mockOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
          const adjustedOrder = {
            ...mockOrder,
            subtotal: Math.round(itemsTotal * 100) / 100,
            tax: Math.round(itemsTotal * 0.18 * 100) / 100,
          };
          adjustedOrder.total = Math.round((adjustedOrder.subtotal + adjustedOrder.tax) * 100) / 100;

          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(adjustedOrder);

          // Create split data for equal split
          const splitData = {
            splitType: 'EQUAL',
            splits: {
              numberOfPeople: numberOfSplits,
            },
          };

          // Call the service method
          const result = await posService.splitBill(tenantId, mockOrder.id, splitData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('splits');
          expect(result.data.splits).toHaveLength(numberOfSplits);

          // Verify split integrity - sum of all splits equals original total
          const totalSplitAmount = result.data.splits.reduce((sum, split) => sum + split.amount, 0);
          expect(totalSplitAmount).toBeCloseTo(adjustedOrder.total, 2);

          // Verify each split has a positive amount
          result.data.splits.forEach((split, index) => {
            expect(split.amount).toBeGreaterThan(0);
            expect(split.splitNumber).toBe(index + 1);
          });

          // Verify the original total is preserved
          expect(result.data.originalTotal).toBe(adjustedOrder.total);
        }
      ), { numRuns: 20 });
    });

    it('should maintain total integrity when splitting bills by specific amounts', async () => {
      // Feature: restaurant-management-system, Property 5: Bill Split Integrity
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        mockOrderGenerator(),
        async (tenantId, mockOrder) => {
          // Ensure order items total matches order subtotal
          const itemsTotal = mockOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
          const adjustedOrder = {
            ...mockOrder,
            subtotal: Math.round(itemsTotal * 100) / 100,
            tax: Math.round(itemsTotal * 0.18 * 100) / 100,
          };
          adjustedOrder.total = Math.round((adjustedOrder.subtotal + adjustedOrder.tax) * 100) / 100;

          // Generate split amounts that sum to the total
          const splitAmounts = await fc.sample(splitAmountsGenerator(adjustedOrder.total), 1)[0];
          
          if (!splitAmounts || splitAmounts.length < 2) {
            return; // Skip if we can't generate valid split amounts
          }

          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(adjustedOrder);

          // Create split data for amount-based split
          const splitData = {
            splitType: 'BY_AMOUNT',
            splits: {
              amountSplits: splitAmounts.map((amount, index) => ({
                amount,
                description: `Split ${index + 1}`,
              })),
            },
          };

          // Call the service method
          const result = await posService.splitBill(tenantId, mockOrder.id, splitData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('splits');
          expect(result.data.splits).toHaveLength(splitAmounts.length);

          // Verify split integrity - sum of all splits equals original total
          const totalSplitAmount = result.data.splits.reduce((sum, split) => sum + split.amount, 0);
          expect(totalSplitAmount).toBeCloseTo(adjustedOrder.total, 2);

          // Verify each split matches the requested amount
          result.data.splits.forEach((split, index) => {
            expect(split.amount).toBeCloseTo(splitAmounts[index], 2);
            expect(split.splitNumber).toBe(index + 1);
          });
        }
      ), { numRuns: 20 });
    });

    it('should maintain total integrity when splitting bills by items', async () => {
      // Feature: restaurant-management-system, Property 5: Bill Split Integrity
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        mockOrderGenerator(),
        async (tenantId, mockOrder) => {
          // Ensure we have at least 2 items to split
          if (mockOrder.items.length < 2) {
            return;
          }

          // Ensure order items total matches order subtotal
          const itemsTotal = mockOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
          const adjustedOrder = {
            ...mockOrder,
            subtotal: Math.round(itemsTotal * 100) / 100,
            tax: Math.round(itemsTotal * 0.18 * 100) / 100,
          };
          adjustedOrder.total = Math.round((adjustedOrder.subtotal + adjustedOrder.tax) * 100) / 100;

          // Create item splits - divide items between 2 splits
          const midPoint = Math.ceil(adjustedOrder.items.length / 2);
          const itemSplits = [
            {
              itemIds: adjustedOrder.items.slice(0, midPoint).map(item => item.id),
            },
            {
              itemIds: adjustedOrder.items.slice(midPoint).map(item => item.id),
            },
          ].filter(split => split.itemIds.length > 0);

          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(adjustedOrder);

          // Create split data for item-based split
          const splitData = {
            splitType: 'BY_ITEMS',
            splits: {
              itemSplits,
            },
          };

          // Call the service method
          const result = await posService.splitBill(tenantId, mockOrder.id, splitData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('splits');
          expect(result.data.splits).toHaveLength(itemSplits.length);

          // Verify split integrity - sum of all splits equals original total
          const totalSplitAmount = result.data.splits.reduce((sum, split) => sum + split.total, 0);
          expect(totalSplitAmount).toBeCloseTo(adjustedOrder.total, 2);

          // Verify each split contains the correct items
          result.data.splits.forEach((split, index) => {
            expect(split.items).toBeDefined();
            expect(split.items.length).toBe(itemSplits[index].itemIds.length);
            expect(split.total).toBeGreaterThan(0);
            expect(split.splitNumber).toBe(index + 1);
          });

          // Verify all items are accounted for
          const allSplitItemIds = result.data.splits.flatMap(split => 
            split.items.map(item => item.id || item.menuItemId)
          );
          const originalItemIds = adjustedOrder.items.map(item => item.id);
          expect(allSplitItemIds.sort()).toEqual(originalItemIds.sort());
        }
      ), { numRuns: 20 });
    });

    it('should reject splits that do not equal the original total', async () => {
      // Feature: restaurant-management-system, Property 5: Bill Split Integrity
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        mockOrderGenerator(),
        fc.array(fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }), { minLength: 2, maxLength: 4 }),
        async (tenantId, mockOrder, invalidSplitAmounts) => {
          // Ensure order items total matches order subtotal
          const itemsTotal = mockOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
          const adjustedOrder = {
            ...mockOrder,
            subtotal: Math.round(itemsTotal * 100) / 100,
            tax: Math.round(itemsTotal * 0.18 * 100) / 100,
          };
          adjustedOrder.total = Math.round((adjustedOrder.subtotal + adjustedOrder.tax) * 100) / 100;

          // Ensure split amounts don't equal the total (add/subtract a random amount)
          const totalSplitAmount = invalidSplitAmounts.reduce((sum, amount) => sum + amount, 0);
          const difference = Math.abs(totalSplitAmount - adjustedOrder.total);
          
          // Skip if the amounts accidentally equal the total
          if (difference < 0.02) {
            return;
          }

          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(adjustedOrder);

          // Create split data with invalid amounts
          const splitData = {
            splitType: 'BY_AMOUNT',
            splits: {
              amountSplits: invalidSplitAmounts.map((amount, index) => ({
                amount,
                description: `Split ${index + 1}`,
              })),
            },
          };

          // Call the service method and expect it to throw an error
          try {
            await posService.splitBill(tenantId, mockOrder.id, splitData);
            // If we reach here, the split was accepted when it shouldn't have been
            expect(true).toBe(false); // Force test failure
          } catch (error) {
            // Verify the error is about split amounts not matching total
            expect(error.message).toContain('Split amounts');
            expect(error.message).toContain('do not equal order total');
          }
        }
      ), { numRuns: 20 });
    });

    it('should handle billing service split integrity', async () => {
      // Feature: restaurant-management-system, Property 5: Bill Split Integrity
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.string({ minLength: 10, maxLength: 20 }),
        fc.array(fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }), { minLength: 2, maxLength: 4 }),
        async (tenantId, billId, baseAmounts) => {
          // Calculate total and adjust amounts to sum exactly to total
          const total = Math.round(baseAmounts.reduce((sum, amount) => sum + amount, 0) * 100) / 100;
          const adjustedAmounts = [...baseAmounts];
          const currentSum = adjustedAmounts.slice(0, -1).reduce((sum, amount) => sum + amount, 0);
          adjustedAmounts[adjustedAmounts.length - 1] = Math.round((total - currentSum) * 100) / 100;

          // Filter out any negative or zero amounts
          const validAmounts = adjustedAmounts.filter(amount => amount > 0);
          if (validAmounts.length < 2) {
            return; // Skip if we don't have enough valid amounts
          }

          // Mock bill data
          const mockBill = {
            id: billId,
            billNumber: 'BILL-001-20240105-123456',
            total,
            status: 'PENDING',
          };

          // Mock getBillDetails method
          billingService.getBillDetails = jest.fn().mockResolvedValue(mockBill);

          // Call the service method
          const result = await billingService.splitBillByAmount(tenantId, billId, validAmounts);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('splitBills');
          expect(result.data.splitBills).toHaveLength(validAmounts.length);

          // Verify split integrity - sum of all splits equals original total
          const totalSplitAmount = result.data.splitBills.reduce((sum, split) => sum + split.amount, 0);
          expect(totalSplitAmount).toBeCloseTo(total, 2);

          // Verify each split has the correct amount
          result.data.splitBills.forEach((split, index) => {
            expect(split.amount).toBeCloseTo(validAmounts[index], 2);
            expect(split.splitNumber).toBe(index + 1);
            expect(split.parentBillId).toBe(billId);
          });
        }
      ), { numRuns: 20 });
    });
  });
});
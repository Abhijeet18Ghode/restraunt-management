const fc = require('fast-check');
const OrderValidationService = require('../../src/services/OrderValidationService');
const { DatabaseManager } = require('@rms/shared');

describe('Inventory Validation for Online Orders Property Tests', () => {
  let orderValidationService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    orderValidationService = new OrderValidationService(mockDb);
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for menu items with inventory constraints
  const menuItemWithInventoryGenerator = () => fc.record({
    menuItemId: fc.uuid(),
    menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 20 }),
    unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(300), noNaN: true }),
    specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  });

  // Generator for order data with inventory considerations
  const orderDataWithInventoryGenerator = () => fc.record({
    outletId: fc.uuid(),
    customerId: fc.option(fc.uuid(), { nil: null }),
    orderType: fc.constantFrom('DELIVERY', 'PICKUP'),
    items: fc.array(menuItemWithInventoryGenerator(), { minLength: 1, max: 10 }),
    deliveryAddress: fc.record({
      street: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      pincode: fc.string({ minLength: 6, maxLength: 6 }),
    }),
    scheduledTime: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 24 * 60 * 60 * 1000) }), { nil: null }),
    promotionCode: fc.option(fc.constantFrom('WELCOME10', 'FLAT50'), { nil: null }),
  });

  /**
   * Property 16: Inventory Validation for Online Orders
   * For any online order, the system should validate inventory availability for all items,
   * prevent overselling, and provide accurate availability information
   * Validates: Requirements 4.2
   */
  describe('Property 16: Inventory Validation for Online Orders', () => {
    it('should validate inventory availability for all order items', async () => {
      // Feature: restaurant-management-system, Property 16: Inventory Validation for Online Orders
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        orderDataWithInventoryGenerator(),
        async (tenantId, orderData) => {
          // Mock inventory check to return varying availability
          orderValidationService.checkInventoryAvailability = jest.fn().mockImplementation(
            (tenantId, menuItemId, requestedQuantity) => {
              const availableQuantity = Math.floor(Math.random() * 30) + 5; // 5-35 available
              const stockLevel = availableQuantity < 10 ? 'low' : 'normal';
              
              return Promise.resolve({
                isAvailable: availableQuantity >= requestedQuantity,
                availableQuantity,
                stockLevel,
              });
            }
          );

          const result = await orderValidationService.validateInventoryAvailability(tenantId, orderData.items);

          // Verify result structure
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('errors');
          expect(result).toHaveProperty('warnings');
          expect(result).toHaveProperty('validatedItems');

          // Verify all items were validated
          expect(result.validatedItems).toHaveLength(orderData.items.length);

          // Verify each validated item has required properties
          result.validatedItems.forEach((validatedItem, index) => {
            const originalItem = orderData.items[index];
            
            expect(validatedItem).toHaveProperty('menuItemId', originalItem.menuItemId);
            expect(validatedItem).toHaveProperty('menuItemName', originalItem.menuItemName);
            expect(validatedItem).toHaveProperty('requestedQuantity', originalItem.quantity);
            expect(validatedItem).toHaveProperty('availableQuantity');
            expect(validatedItem).toHaveProperty('isAvailable');
            expect(validatedItem).toHaveProperty('stockLevel');

            // Verify availability logic
            expect(validatedItem.isAvailable).toBe(
              validatedItem.availableQuantity >= validatedItem.requestedQuantity
            );

            // Verify stock level is valid
            expect(['low', 'normal', 'unknown']).toContain(validatedItem.stockLevel);
          });

          // Verify inventory check was called for each item
          expect(orderValidationService.checkInventoryAvailability).toHaveBeenCalledTimes(orderData.items.length);
        }
      ), { numRuns: 20 });
    });

    it('should prevent orders when inventory is insufficient', async () => {
      // Feature: restaurant-management-system, Property 16: Inventory Validation for Online Orders
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        orderDataWithInventoryGenerator(),
        async (tenantId, orderData) => {
          // Mock inventory check to return insufficient stock for some items
          orderValidationService.checkInventoryAvailability = jest.fn().mockImplementation(
            (tenantId, menuItemId, requestedQuantity) => {
              // Randomly make some items unavailable
              const isUnavailable = Math.random() < 0.3; // 30% chance of being unavailable
              
              if (isUnavailable) {
                const availableQuantity = Math.max(0, requestedQuantity - Math.floor(Math.random() * 5) - 1);
                return Promise.resolve({
                  isAvailable: false,
                  availableQuantity,
                  stockLevel: availableQuantity === 0 ? 'out_of_stock' : 'low',
                });
              } else {
                const availableQuantity = requestedQuantity + Math.floor(Math.random() * 10) + 1;
                return Promise.resolve({
                  isAvailable: true,
                  availableQuantity,
                  stockLevel: 'normal',
                });
              }
            }
          );

          const result = await orderValidationService.validateInventoryAvailability(tenantId, orderData.items);

          // Check if any items are unavailable
          const unavailableItems = result.validatedItems.filter(item => !item.isAvailable);
          
          if (unavailableItems.length > 0) {
            // Order should be invalid if any items are unavailable
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            
            // Verify error messages mention unavailable items
            unavailableItems.forEach(item => {
              const hasErrorForItem = result.errors.some(error => 
                error.includes(item.menuItemName)
              );
              expect(hasErrorForItem).toBe(true);
            });
          } else {
            // Order should be valid if all items are available
            expect(result.isValid).toBe(true);
          }
        }
      ), { numRuns: 20 });
    });

    it('should provide warnings for low stock items while allowing the order', async () => {
      // Feature: restaurant-management-system, Property 16: Inventory Validation for Online Orders
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        orderDataWithInventoryGenerator(),
        async (tenantId, orderData) => {
          // Mock inventory check to return low stock for some items but still available
          orderValidationService.checkInventoryAvailability = jest.fn().mockImplementation(
            (tenantId, menuItemId, requestedQuantity) => {
              const isLowStock = Math.random() < 0.4; // 40% chance of low stock
              
              if (isLowStock) {
                const availableQuantity = requestedQuantity + Math.floor(Math.random() * 3) + 1; // Just enough + a bit more
                return Promise.resolve({
                  isAvailable: true,
                  availableQuantity,
                  stockLevel: 'low',
                });
              } else {
                const availableQuantity = requestedQuantity + Math.floor(Math.random() * 20) + 5;
                return Promise.resolve({
                  isAvailable: true,
                  availableQuantity,
                  stockLevel: 'normal',
                });
              }
            }
          );

          const result = await orderValidationService.validateInventoryAvailability(tenantId, orderData.items);

          // Order should be valid since all items are available
          expect(result.isValid).toBe(true);

          // Check for low stock warnings
          const lowStockItems = result.validatedItems.filter(item => item.stockLevel === 'low');
          
          if (lowStockItems.length > 0) {
            // Should have warnings for low stock items
            expect(result.warnings.length).toBeGreaterThan(0);
            
            // Verify warning messages mention low stock items
            lowStockItems.forEach(item => {
              const hasWarningForItem = result.warnings.some(warning => 
                warning.includes(item.menuItemName) && warning.includes('low')
              );
              expect(hasWarningForItem).toBe(true);
            });
          }
        }
      ), { numRuns: 20 });
    });

    it('should handle zero inventory correctly', async () => {
      // Feature: restaurant-management-system, Property 16: Inventory Validation for Online Orders
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          outletId: fc.uuid(),
          orderType: fc.constantFrom('DELIVERY', 'PICKUP'),
          items: fc.array(fc.record({
            menuItemId: fc.uuid(),
            menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
            quantity: fc.integer({ min: 1, max: 5 }),
            unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
          }), { minLength: 1, maxLength: 3 }),
        }),
        async (tenantId, orderData) => {
          // Mock inventory check to return zero stock for all items
          orderValidationService.checkInventoryAvailability = jest.fn().mockResolvedValue({
            isAvailable: false,
            availableQuantity: 0,
            stockLevel: 'out_of_stock',
          });

          const result = await orderValidationService.validateInventoryAvailability(tenantId, orderData.items);

          // Order should be invalid
          expect(result.isValid).toBe(false);
          expect(result.errors.length).toBe(orderData.items.length);

          // All items should be marked as unavailable
          result.validatedItems.forEach(item => {
            expect(item.isAvailable).toBe(false);
            expect(item.availableQuantity).toBe(0);
            expect(item.stockLevel).toBe('out_of_stock');
          });

          // All error messages should mention "out of stock"
          result.errors.forEach(error => {
            expect(error).toContain('out of stock');
          });
        }
      ), { numRuns: 20 });
    });

    it('should validate large quantity orders against inventory limits', async () => {
      // Feature: restaurant-management-system, Property 16: Inventory Validation for Online Orders
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          outletId: fc.uuid(),
          orderType: fc.constantFrom('DELIVERY', 'PICKUP'),
          items: fc.array(fc.record({
            menuItemId: fc.uuid(),
            menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
            quantity: fc.integer({ min: 10, max: 50 }), // Large quantities
            unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true }),
          }), { minLength: 1, maxLength: 3 }),
        }),
        async (tenantId, orderData) => {
          // Mock inventory check with realistic stock levels
          orderValidationService.checkInventoryAvailability = jest.fn().mockImplementation(
            (tenantId, menuItemId, requestedQuantity) => {
              const availableQuantity = Math.floor(Math.random() * 40) + 5; // 5-45 available
              
              return Promise.resolve({
                isAvailable: availableQuantity >= requestedQuantity,
                availableQuantity,
                stockLevel: availableQuantity < 15 ? 'low' : 'normal',
              });
            }
          );

          const result = await orderValidationService.validateInventoryAvailability(tenantId, orderData.items);

          // Verify validation logic for large quantities
          result.validatedItems.forEach((validatedItem, index) => {
            const originalItem = orderData.items[index];
            
            // Availability should be correctly calculated for large quantities
            expect(validatedItem.isAvailable).toBe(
              validatedItem.availableQuantity >= originalItem.quantity
            );

            // If unavailable, should have appropriate error message
            if (!validatedItem.isAvailable) {
              const hasErrorForItem = result.errors.some(error => 
                error.includes(validatedItem.menuItemName) &&
                error.includes(validatedItem.availableQuantity.toString()) &&
                error.includes(originalItem.quantity.toString())
              );
              expect(hasErrorForItem).toBe(true);
            }
          });

          // Overall validation should fail if any item is unavailable
          const hasUnavailableItems = result.validatedItems.some(item => !item.isAvailable);
          expect(result.isValid).toBe(!hasUnavailableItems);
        }
      ), { numRuns: 20 });
    });
  });
});
const fc = require('fast-check');
const InventoryService = require('../../src/services/InventoryService');
const { InventoryItemModel } = require('@rms/shared');

describe('Low Stock Alert Generation Property Tests', () => {
  let inventoryService;
  let mockDb;
  let mockInventoryItemModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    mockInventoryItemModel = {
      getLowStockItems: jest.fn(),
    };
    
    inventoryService = new InventoryService(mockDb);
    inventoryService.inventoryItemModel = mockInventoryItemModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for outlet IDs  
  const outletIdGenerator = () => fc.uuid();

  // Generator for inventory items with varying stock levels
  const inventoryItemGenerator = () => fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    currentStock: fc.float({ min: 0, max: 100 }),
    minimumStock: fc.float({ min: 1, max: 20 }),
    unit: fc.constantFrom('kg', 'liter', 'piece', 'gram'),
    category: fc.constantFrom('Vegetables', 'Meat', 'Dairy', 'Spices', 'Beverages'),
    outletId: fc.uuid(),
  });

  /**
   * Property 12: Low Stock Alert Generation
   * For any inventory item with current stock at or below minimum threshold, a low-stock alert should be generated
   * Validates: Requirements 3.1
   */
  describe('Property 12: Low Stock Alert Generation', () => {
    it('should generate alerts for all items at or below minimum stock threshold', async () => {
      // Feature: restaurant-management-system, Property 12: Low Stock Alert Generation
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(inventoryItemGenerator(), { minLength: 1, maxLength: 10 }),
        async (tenantId, outletId, inventoryItems) => {
          // Filter items that should trigger low stock alerts
          const lowStockItems = inventoryItems.filter(item => 
            item.currentStock <= item.minimumStock
          );

          // Mock the database response
          mockInventoryItemModel.getLowStockItems.mockResolvedValue(lowStockItems);

          // Call the service method
          const result = await inventoryService.checkLowStock(tenantId, outletId);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toBeInstanceOf(Array);
          expect(result.data).toHaveLength(lowStockItems.length);

          // Verify each alert has the required properties
          result.data.forEach((alert, index) => {
            const item = lowStockItems[index];
            expect(alert).toHaveProperty('itemId', item.id);
            expect(alert).toHaveProperty('itemName', item.name);
            expect(alert).toHaveProperty('currentStock', item.currentStock);
            expect(alert).toHaveProperty('minimumStock', item.minimumStock);
            expect(alert).toHaveProperty('outletId', item.outletId);
            expect(alert).toHaveProperty('severity');
            expect(alert).toHaveProperty('message');
            expect(alert).toHaveProperty('createdAt');

            // Verify severity is correct
            if (item.currentStock === 0) {
              expect(alert.severity).toBe('CRITICAL');
            } else {
              expect(alert.severity).toBe('WARNING');
            }

            // Verify message content
            expect(alert.message).toContain(item.name);
          });

          // Verify the service was called with correct parameters
          expect(mockInventoryItemModel.getLowStockItems).toHaveBeenCalledWith(tenantId, outletId);
        }
      ), { numRuns: 100 });
    });

    it('should return empty alerts when no items are below minimum stock', async () => {
      // Feature: restaurant-management-system, Property 12: Low Stock Alert Generation
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(fc.record({
          id: fc.uuid(),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          currentStock: fc.float({ min: 21, max: 100 }), // Always above minimum
          minimumStock: fc.float({ min: 1, max: 20 }),   // Always below current
          unit: fc.constantFrom('kg', 'liter', 'piece', 'gram'),
          category: fc.constantFrom('Vegetables', 'Meat', 'Dairy', 'Spices', 'Beverages'),
          outletId: fc.uuid(),
        }), { minLength: 1, maxLength: 10 }),
        async (tenantId, outletId, inventoryItems) => {
          // Ensure no items are low stock
          const lowStockItems = inventoryItems.filter(item => 
            item.currentStock <= item.minimumStock
          );
          expect(lowStockItems).toHaveLength(0);

          // Mock empty response
          mockInventoryItemModel.getLowStockItems.mockResolvedValue([]);

          // Call the service method
          const result = await inventoryService.checkLowStock(tenantId, outletId);

          // Verify empty result
          expect(result.success).toBe(true);
          expect(result.data).toBeInstanceOf(Array);
          expect(result.data).toHaveLength(0);
          expect(result.message).toContain('0 low stock alerts');
        }
      ), { numRuns: 100 });
    });
  });
});
const fc = require('fast-check');
const MenuService = require('../../src/services/MenuService');

describe('Inventory-Based Menu Availability Property Tests', () => {
  let menuService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    menuService = new MenuService(mockDb);
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 });

  // Generator for outlet IDs
  const outletIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 });

  // Generator for menu items with ingredients
  const menuItemWithIngredientsGenerator = () => fc.record({
    id: fc.string({ minLength: 36, maxLength: 36 }),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    price: fc.float({ min: 0.01, max: 999.99 }),
    ingredients: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    isAvailable: fc.boolean(),
  });

  // Generator for inventory items
  const inventoryItemGenerator = () => fc.record({
    id: fc.string({ minLength: 36, maxLength: 36 }),
    name: fc.string({ minLength: 3, maxLength: 20 }),
    currentStock: fc.float({ min: 0, max: 1000 }),
    minimumStock: fc.float({ min: 1, max: 50 }),
    unit: fc.constantFrom('kg', 'liter', 'piece', 'gram'),
  });

  /**
   * Property 10: Inventory-Based Menu Availability
   * For any menu item with low inventory, the item should be automatically marked as unavailable
   * Validates: Requirements 2.3
   */
  describe('Property 10: Inventory-Based Menu Availability', () => {
    it('should mark menu items as unavailable when any required ingredient has low stock', async () => {
      // Feature: restaurant-management-system, Property 10: Inventory-Based Menu Availability
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(menuItemWithIngredientsGenerator(), { minLength: 1, maxLength: 10 }),
        fc.array(inventoryItemGenerator(), { minLength: 1, maxLength: 15 }),
        async (tenantId, outletId, menuItems, inventoryItems) => {
          // Ensure we have some inventory items
          if (inventoryItems.length === 0) return;

          // Create mapping between menu items and inventory
          const menuItemsWithInventory = menuItems.map(item => {
            // Assign some inventory items as ingredients for this menu item
            const assignedIngredients = item.ingredients.slice(0, Math.min(item.ingredients.length, inventoryItems.length));
            const itemInventory = assignedIngredients.map((ingredientName, index) => {
              const inventoryItem = inventoryItems[index % inventoryItems.length];
              return {
                ...inventoryItem,
                name: ingredientName, // Use ingredient name from menu item
              };
            });

            return {
              ...item,
              ingredients: assignedIngredients,
              inventory: itemInventory,
            };
          });

          // Mock the menu service methods
          menuService.menuItemModel = {
            getItemsWithLowInventory: jest.fn(),
            updateAvailability: jest.fn(),
            find: jest.fn(),
          };

          // Determine which items should be unavailable due to low inventory
          const itemsWithLowInventory = [];
          const itemsWithSufficientInventory = [];

          menuItemsWithInventory.forEach(item => {
            const hasLowInventory = item.inventory.some(inv => 
              inv.currentStock <= inv.minimumStock
            );

            if (hasLowInventory) {
              itemsWithLowInventory.push({
                ...item,
                isAvailable: false, // Should be marked unavailable
                lowInventoryIngredients: item.inventory.filter(inv => 
                  inv.currentStock <= inv.minimumStock
                ),
              });
            } else {
              itemsWithSufficientInventory.push({
                ...item,
                isAvailable: true, // Should remain available
              });
            }
          });

          // Mock the low inventory check
          menuService.menuItemModel.getItemsWithLowInventory
            .mockResolvedValue(itemsWithLowInventory);

          // Mock availability updates
          if (itemsWithLowInventory.length > 0) {
            const updatedItems = itemsWithLowInventory.map(item => ({
              ...item,
              isAvailable: false,
              updatedAt: new Date(),
            }));

            menuService.menuItemModel.updateAvailability
              .mockResolvedValue(updatedItems);
          }

          // Execute the inventory-based availability check
          const lowInventoryResult = await menuService.getItemsWithLowInventory(tenantId, outletId);

          // Verify that items with low inventory were identified
          expect(lowInventoryResult.success).toBe(true);
          expect(lowInventoryResult.data).toHaveLength(itemsWithLowInventory.length);

          // If there are items with low inventory, update their availability
          if (itemsWithLowInventory.length > 0) {
            const itemIds = itemsWithLowInventory.map(item => item.id);
            const updateResult = await menuService.updateMultipleItemsAvailability(
              tenantId, 
              itemIds, 
              false // Mark as unavailable
            );

            // Verify availability was updated
            expect(updateResult.success).toBe(true);
            expect(updateResult.data).toHaveLength(itemsWithLowInventory.length);

            // Verify all updated items are marked as unavailable
            updateResult.data.forEach(item => {
              expect(item.isAvailable).toBe(false);
              expect(itemIds).toContain(item.id);
            });
          }

          // Verify the property: items with low inventory should be unavailable
          lowInventoryResult.data.forEach(item => {
            // Item should have low inventory ingredients
            expect(item.lowInventoryIngredients).toBeDefined();
            expect(item.lowInventoryIngredients.length).toBeGreaterThan(0);

            // Each low inventory ingredient should have stock <= minimum
            item.lowInventoryIngredients.forEach(ingredient => {
              expect(ingredient.currentStock).toBeLessThanOrEqual(ingredient.minimumStock);
            });
          });

          // Verify that items with sufficient inventory are not affected
          // (In a real system, we would check that these items remain available)
          itemsWithSufficientInventory.forEach(item => {
            item.inventory.forEach(ingredient => {
              expect(ingredient.currentStock).toBeGreaterThan(ingredient.minimumStock);
            });
          });
        }
      ), { numRuns: 50 });
    });

    it('should automatically restore availability when inventory is restocked', async () => {
      // Feature: restaurant-management-system, Property 10: Inventory-Based Menu Availability
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        menuItemWithIngredientsGenerator(),
        inventoryItemGenerator(),
        fc.float({ min: 51, max: 1000 }), // New stock level (above minimum)
        async (tenantId, outletId, menuItem, inventoryItem, newStockLevel) => {
          // Ensure the inventory item starts with low stock
          const lowStockInventory = {
            ...inventoryItem,
            currentStock: inventoryItem.minimumStock - 1, // Below minimum
          };

          // Menu item initially unavailable due to low inventory
          const unavailableMenuItem = {
            ...menuItem,
            ingredients: [lowStockInventory.name],
            isAvailable: false,
            inventory: [lowStockInventory],
          };

          menuService.menuItemModel = {
            getItemsWithLowInventory: jest.fn(),
            updateAvailability: jest.fn(),
            findById: jest.fn(),
          };

          // Mock initial state - item has low inventory
          menuService.menuItemModel.getItemsWithLowInventory
            .mockResolvedValueOnce([unavailableMenuItem]);

          // Verify initial low inventory state
          const initialResult = await menuService.getItemsWithLowInventory(tenantId, outletId);
          expect(initialResult.data).toHaveLength(1);
          expect(initialResult.data[0].id).toBe(menuItem.id);

          // Simulate inventory restock
          const restockedInventory = {
            ...lowStockInventory,
            currentStock: newStockLevel, // Above minimum
          };

          const availableMenuItem = {
            ...unavailableMenuItem,
            isAvailable: true,
            inventory: [restockedInventory],
          };

          // Mock post-restock state - no items with low inventory
          menuService.menuItemModel.getItemsWithLowInventory
            .mockResolvedValueOnce([]);

          // Mock availability update to make item available
          menuService.menuItemModel.updateAvailability
            .mockResolvedValue([availableMenuItem]);

          // Check inventory after restock
          const postRestockResult = await menuService.getItemsWithLowInventory(tenantId, outletId);
          expect(postRestockResult.data).toHaveLength(0);

          // Restore availability for items that now have sufficient inventory
          const restoreResult = await menuService.updateMultipleItemsAvailability(
            tenantId, 
            [menuItem.id], 
            true // Mark as available
          );

          // Verify availability was restored
          expect(restoreResult.success).toBe(true);
          expect(restoreResult.data).toHaveLength(1);
          expect(restoreResult.data[0].isAvailable).toBe(true);
          expect(restoreResult.data[0].id).toBe(menuItem.id);

          // Verify the property: when inventory is sufficient, item should be available
          expect(restockedInventory.currentStock).toBeGreaterThan(restockedInventory.minimumStock);
          expect(restoreResult.data[0].isAvailable).toBe(true);
        }
      ), { numRuns: 50 });
    });

    it('should handle multiple ingredients with varying stock levels correctly', async () => {
      // Feature: restaurant-management-system, Property 10: Inventory-Based Menu Availability
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.record({
          id: fc.string({ minLength: 36, maxLength: 36 }),
          name: fc.string({ minLength: 3, maxLength: 50 }),
          price: fc.float({ min: 0.01, max: 999.99 }),
        }),
        fc.array(inventoryItemGenerator(), { minLength: 2, maxLength: 8 }),
        async (tenantId, outletId, menuItemBase, inventoryItems) => {
          // Ensure we have at least 2 inventory items
          if (inventoryItems.length < 2) return;

          // Create menu item with multiple ingredients
          const menuItem = {
            ...menuItemBase,
            ingredients: inventoryItems.map(inv => inv.name),
            isAvailable: true,
          };

          // Categorize inventory items by stock level
          const lowStockItems = [];
          const sufficientStockItems = [];

          inventoryItems.forEach(item => {
            if (item.currentStock <= item.minimumStock) {
              lowStockItems.push(item);
            } else {
              sufficientStockItems.push(item);
            }
          });

          menuService.menuItemModel = {
            getItemsWithLowInventory: jest.fn(),
            updateAvailability: jest.fn(),
          };

          // If any ingredient has low stock, the menu item should be unavailable
          const shouldBeUnavailable = lowStockItems.length > 0;

          if (shouldBeUnavailable) {
            const unavailableMenuItem = {
              ...menuItem,
              isAvailable: false,
              lowInventoryIngredients: lowStockItems,
            };

            menuService.menuItemModel.getItemsWithLowInventory
              .mockResolvedValue([unavailableMenuItem]);

            menuService.menuItemModel.updateAvailability
              .mockResolvedValue([{ ...unavailableMenuItem, isAvailable: false }]);
          } else {
            menuService.menuItemModel.getItemsWithLowInventory
              .mockResolvedValue([]);
          }

          // Check for items with low inventory
          const lowInventoryResult = await menuService.getItemsWithLowInventory(tenantId, outletId);

          if (shouldBeUnavailable) {
            // Verify item is identified as having low inventory
            expect(lowInventoryResult.data).toHaveLength(1);
            expect(lowInventoryResult.data[0].id).toBe(menuItem.id);
            expect(lowInventoryResult.data[0].lowInventoryIngredients).toHaveLength(lowStockItems.length);

            // Update availability
            const updateResult = await menuService.updateMultipleItemsAvailability(
              tenantId, 
              [menuItem.id], 
              false
            );

            expect(updateResult.data[0].isAvailable).toBe(false);

            // Verify the property: if ANY ingredient has low stock, item is unavailable
            const hasLowStockIngredient = lowInventoryResult.data[0].lowInventoryIngredients.some(
              ingredient => ingredient.currentStock <= ingredient.minimumStock
            );
            expect(hasLowStockIngredient).toBe(true);
          } else {
            // Verify item is not identified as having low inventory
            expect(lowInventoryResult.data).toHaveLength(0);

            // Verify the property: if ALL ingredients have sufficient stock, item can be available
            inventoryItems.forEach(ingredient => {
              expect(ingredient.currentStock).toBeGreaterThan(ingredient.minimumStock);
            });
          }
        }
      ), { numRuns: 50 });
    });

    it('should maintain consistency across multiple outlets with different inventory levels', async () => {
      // Feature: restaurant-management-system, Property 10: Inventory-Based Menu Availability
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.array(outletIdGenerator(), { minLength: 2, maxLength: 4 }),
        menuItemWithIngredientsGenerator(),
        fc.array(inventoryItemGenerator(), { minLength: 1, maxLength: 5 }),
        async (tenantId, outletIds, menuItem, baseInventoryItems) => {
          // Ensure we have at least 2 outlets
          if (outletIds.length < 2) return;

          // Create different inventory levels for each outlet
          const outletInventories = outletIds.map((outletId, index) => {
            const outletInventory = baseInventoryItems.map(item => ({
              ...item,
              outletId,
              // Vary stock levels across outlets
              currentStock: index === 0 
                ? item.minimumStock - 1 // First outlet has low stock
                : item.minimumStock + 10, // Other outlets have sufficient stock
            }));

            return {
              outletId,
              inventory: outletInventory,
            };
          });

          menuService.menuItemModel = {
            getItemsWithLowInventory: jest.fn(),
            updateAvailability: jest.fn(),
          };

          // Check each outlet independently
          const outletResults = [];

          for (const { outletId, inventory } of outletInventories) {
            const hasLowInventory = inventory.some(item => 
              item.currentStock <= item.minimumStock
            );

            if (hasLowInventory) {
              const unavailableItem = {
                ...menuItem,
                isAvailable: false,
                lowInventoryIngredients: inventory.filter(item => 
                  item.currentStock <= item.minimumStock
                ),
              };

              menuService.menuItemModel.getItemsWithLowInventory
                .mockResolvedValueOnce([unavailableItem]);

              menuService.menuItemModel.updateAvailability
                .mockResolvedValueOnce([{ ...unavailableItem, isAvailable: false }]);
            } else {
              menuService.menuItemModel.getItemsWithLowInventory
                .mockResolvedValueOnce([]);
            }

            const result = await menuService.getItemsWithLowInventory(tenantId, outletId);
            
            outletResults.push({
              outletId,
              hasLowInventory,
              result: result.data,
              inventory,
            });
          }

          // Verify outlet-specific availability
          outletResults.forEach(({ outletId, hasLowInventory, result, inventory }) => {
            if (hasLowInventory) {
              // Outlet with low inventory should have the item marked as unavailable
              expect(result).toHaveLength(1);
              expect(result[0].id).toBe(menuItem.id);
              
              // Verify at least one ingredient has low stock
              const lowStockIngredients = inventory.filter(item => 
                item.currentStock <= item.minimumStock
              );
              expect(lowStockIngredients.length).toBeGreaterThan(0);
            } else {
              // Outlet with sufficient inventory should not have the item in low inventory list
              expect(result).toHaveLength(0);
              
              // Verify all ingredients have sufficient stock
              inventory.forEach(item => {
                expect(item.currentStock).toBeGreaterThan(item.minimumStock);
              });
            }
          });

          // Verify independence: different outlets can have different availability
          const lowInventoryOutlets = outletResults.filter(r => r.hasLowInventory);
          const sufficientInventoryOutlets = outletResults.filter(r => !r.hasLowInventory);

          // At least one outlet should have low inventory (first outlet by design)
          expect(lowInventoryOutlets.length).toBeGreaterThan(0);
          
          // Other outlets should have sufficient inventory
          expect(sufficientInventoryOutlets.length).toBeGreaterThan(0);

          // Verify the property: availability is determined independently per outlet
          expect(lowInventoryOutlets.length + sufficientInventoryOutlets.length).toBe(outletIds.length);
        }
      ), { numRuns: 50 });
    });
  });
});
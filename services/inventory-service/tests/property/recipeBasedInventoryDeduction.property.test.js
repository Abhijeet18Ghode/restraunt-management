const fc = require('fast-check');
const StockService = require('../../src/services/StockService');
const { InventoryItemModel } = require('@rms/shared');

describe('Recipe-Based Inventory Deduction Property Tests', () => {
  let stockService;
  let mockDb;
  let mockInventoryItemModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    mockInventoryItemModel = {
      findByNameAndOutlet: jest.fn(),
      updateById: jest.fn(),
    };
    
    stockService = new StockService(mockDb);
    stockService.inventoryItemModel = mockInventoryItemModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for outlet IDs
  const outletIdGenerator = () => fc.uuid();

  // Generator for recipe ingredients
  const ingredientGenerator = () => fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    quantityPerUnit: fc.float({ min: 0.1, max: 10 }),
  });

  // Generator for inventory items with sufficient stock
  const inventoryItemWithStockGenerator = (requiredQuantity) => fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    currentStock: fc.float({ min: requiredQuantity + 1, max: requiredQuantity + 100 }),
    outletId: fc.uuid(),
  });

  // Generator for consumption data
  const consumptionDataGenerator = () => fc.record({
    outletId: outletIdGenerator(),
    recipeId: fc.string({ minLength: 5, maxLength: 20 }),
    recipeName: fc.string({ minLength: 3, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    ingredients: fc.array(ingredientGenerator(), { minLength: 1, maxLength: 5 }),
  });

  /**
   * Property 14: Recipe-Based Inventory Deduction
   * For any order fulfillment, ingredient stock levels should decrease according to recipe requirements
   * Validates: Requirements 3.3
   */
  describe('Property 14: Recipe-Based Inventory Deduction', () => {
    it('should decrease stock levels by exact recipe requirements when sufficient stock exists', async () => {
      // Feature: restaurant-management-system, Property 14: Recipe-Based Inventory Deduction
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        consumptionDataGenerator(),
        async (tenantId, consumptionData) => {
          // Create inventory items with sufficient stock for each ingredient
          const inventoryItems = consumptionData.ingredients.map((ingredient) => {
            const requiredQuantity = ingredient.quantityPerUnit * consumptionData.quantity;
            return {
              id: 'item-' + Math.random().toString(36).substr(2, 9),
              name: ingredient.name,
              currentStock: requiredQuantity + Math.random() * 50 + 10, // Ensure sufficient stock
              outletId: consumptionData.outletId,
            };
          });

          // Mock database responses
          consumptionData.ingredients.forEach((ingredient, index) => {
            const inventoryItem = inventoryItems[index];
            const requiredQuantity = ingredient.quantityPerUnit * consumptionData.quantity;
            
            // Mock finding the inventory item
            mockInventoryItemModel.findByNameAndOutlet
              .mockResolvedValueOnce(inventoryItem);

            // Mock the update response
            const updatedItem = {
              ...inventoryItem,
              currentStock: inventoryItem.currentStock - requiredQuantity,
            };
            mockInventoryItemModel.updateById.mockResolvedValueOnce(updatedItem);
          });

          // Process the consumption
          const result = await stockService.processRecipeConsumption(tenantId, consumptionData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('consumedItems');
          expect(result.data).toHaveProperty('recipeId', consumptionData.recipeId);
          expect(result.data).toHaveProperty('recipeName', consumptionData.recipeName);
          expect(result.data).toHaveProperty('quantity', consumptionData.quantity);
          expect(result.data.consumedItems).toHaveLength(consumptionData.ingredients.length);

          // Verify each consumed item
          result.data.consumedItems.forEach((consumedItem, index) => {
            const ingredient = consumptionData.ingredients[index];
            const inventoryItem = inventoryItems[index];
            const expectedConsumption = ingredient.quantityPerUnit * consumptionData.quantity;

            expect(consumedItem).toHaveProperty('inventoryItem');
            expect(consumedItem).toHaveProperty('consumed', expectedConsumption);
            expect(consumedItem).toHaveProperty('previousStock', inventoryItem.currentStock);
            expect(consumedItem).toHaveProperty('newStock', inventoryItem.currentStock - expectedConsumption);

            // Verify exact deduction
            expect(consumedItem.newStock).toBe(consumedItem.previousStock - expectedConsumption);
          });

          // Verify database calls
          consumptionData.ingredients.forEach((ingredient, index) => {
            const inventoryItem = inventoryItems[index];
            const expectedConsumption = ingredient.quantityPerUnit * consumptionData.quantity;

            expect(mockInventoryItemModel.findByNameAndOutlet).toHaveBeenCalledWith(
              tenantId,
              ingredient.name,
              consumptionData.outletId
            );
            expect(mockInventoryItemModel.updateById).toHaveBeenCalledWith(
              tenantId,
              inventoryItem.id,
              expect.objectContaining({
                currentStock: inventoryItem.currentStock - expectedConsumption,
              })
            );
          });
        }
      ), { numRuns: 100 });
    });

    it('should reject consumption when insufficient stock exists', async () => {
      // Feature: restaurant-management-system, Property 14: Recipe-Based Inventory Deduction
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        consumptionDataGenerator(),
        async (tenantId, consumptionData) => {
          // Create inventory items with insufficient stock for at least one ingredient
          const inventoryItems = consumptionData.ingredients.map((ingredient, index) => {
            const requiredQuantity = ingredient.quantityPerUnit * consumptionData.quantity;
            const insufficientStock = index === 0 
              ? Math.max(0, requiredQuantity - 1) // First item has insufficient stock
              : requiredQuantity + Math.random() * 50 + 10; // Others have sufficient stock
            
            return {
              id: 'item-' + Math.random().toString(36).substr(2, 9),
              name: ingredient.name,
              currentStock: insufficientStock,
              outletId: consumptionData.outletId,
            };
          });

          // Mock database responses
          consumptionData.ingredients.forEach((ingredient, index) => {
            const inventoryItem = inventoryItems[index];
            mockInventoryItemModel.findByNameAndOutlet
              .mockResolvedValueOnce(inventoryItem);
          });

          // Process the consumption
          const result = await stockService.processRecipeConsumption(tenantId, consumptionData);

          // Should return failure with insufficient items
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('success', false);
          expect(result.data).toHaveProperty('insufficientItems');
          expect(result.data.insufficientItems.length).toBeGreaterThan(0);

          // Verify insufficient items details
          result.data.insufficientItems.forEach((insufficientItem) => {
            expect(insufficientItem).toHaveProperty('name');
            expect(insufficientItem).toHaveProperty('required');
            expect(insufficientItem).toHaveProperty('available');
            expect(insufficientItem).toHaveProperty('shortage');
            expect(insufficientItem.shortage).toBeGreaterThan(0);
            expect(insufficientItem.available).toBeLessThan(insufficientItem.required);
          });

          // Verify no stock updates were made
          expect(mockInventoryItemModel.updateById).not.toHaveBeenCalled();
        }
      ), { numRuns: 100 });
    });

    it('should handle missing ingredients by reporting them as insufficient', async () => {
      // Feature: restaurant-management-system, Property 14: Recipe-Based Inventory Deduction
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        consumptionDataGenerator(),
        async (tenantId, consumptionData) => {
          // Mock database responses for missing ingredients (return null)
          consumptionData.ingredients.forEach((ingredient) => {
            mockInventoryItemModel.findByNameAndOutlet
              .mockResolvedValueOnce(null); // Item doesn't exist
          });

          // Process the consumption
          const result = await stockService.processRecipeConsumption(tenantId, consumptionData);

          // Should return failure with all items as insufficient
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('success', false);
          expect(result.data).toHaveProperty('insufficientItems');
          expect(result.data.insufficientItems).toHaveLength(consumptionData.ingredients.length);

          // Verify all ingredients are reported as missing
          result.data.insufficientItems.forEach((insufficientItem, index) => {
            const ingredient = consumptionData.ingredients[index];
            const expectedRequired = ingredient.quantityPerUnit * consumptionData.quantity;

            expect(insufficientItem.name).toBe(ingredient.name);
            expect(insufficientItem.required).toBe(expectedRequired);
            expect(insufficientItem.available).toBe(0);
            expect(insufficientItem.shortage).toBe(expectedRequired);
          });

          // Verify no stock updates were made
          expect(mockInventoryItemModel.updateById).not.toHaveBeenCalled();
        }
      ), { numRuns: 100 });
    });

    it('should handle zero or negative recipe quantities by validation', async () => {
      // Feature: restaurant-management-system, Property 14: Recipe-Based Inventory Deduction
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        consumptionDataGenerator(),
        async (tenantId, consumptionData) => {
          // Create consumption data with invalid quantity
          const invalidConsumptionData = {
            ...consumptionData,
            quantity: fc.sample(fc.constantFrom(0, -1, -5), 1)[0],
          };

          // Should handle gracefully (either reject or treat as zero consumption)
          try {
            const result = await stockService.processRecipeConsumption(tenantId, invalidConsumptionData);
            
            // If it succeeds, it should either:
            // 1. Return success with no consumption (quantity 0)
            // 2. Return failure due to invalid quantity
            if (result.success && result.data.success) {
              // If successful, consumption should be zero
              expect(result.data.quantity).toBe(invalidConsumptionData.quantity);
              if (invalidConsumptionData.quantity <= 0) {
                // No actual consumption should occur for zero/negative quantities
                expect(mockInventoryItemModel.updateById).not.toHaveBeenCalled();
              }
            }
          } catch (error) {
            // Validation error is acceptable for invalid quantities
            expect(error.message).toContain('quantity');
          }
        }
      ), { numRuns: 100 });
    });
  });
});
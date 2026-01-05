const fc = require('fast-check');
const { MenuItemModel } = require('../../index');

describe('Menu Item Data Completeness Property Tests', () => {
  let menuItemModel;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
      systemQuery: jest.fn(),
    };
    menuItemModel = new MenuItemModel(mockDb);
  });

  // Generator for valid menu item data
  const menuItemDataGenerator = () => fc.record({
    categoryId: fc.string({ minLength: 36, maxLength: 36 }),
    name: fc.string({ minLength: 2, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    price: fc.float({ min: 0.01, max: 9999.99 }),
    preparationTime: fc.integer({ min: 0, max: 180 }),
    ingredients: fc.array(fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      quantity: fc.float({ min: 0.1, max: 100 }),
      unit: fc.constantFrom('KG', 'GRAM', 'LITER', 'ML', 'PIECE'),
    }), { maxLength: 10 }),
    isAvailable: fc.boolean(),
    outletIds: fc.array(fc.string({ minLength: 36, maxLength: 36 }), { maxLength: 5 }),
  });

  const tenantIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 });

  /**
   * Property 8: Menu Item Data Completeness
   * For any created menu item, it should contain all required fields: name, description, price, category, and preparation time
   * Validates: Requirements 2.1
   */
  describe('Property 8: Menu Item Data Completeness', () => {
    it('should ensure all menu items have required fields after creation', async () => {
      // Feature: restaurant-management-system, Property 8: Menu Item Data Completeness
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        menuItemDataGenerator(),
        async (tenantId, menuItemData) => {
          // Mock successful creation
          const mockCreatedItem = {
            id: 'test-menu-item-id',
            category_id: menuItemData.categoryId,
            name: menuItemData.name,
            description: menuItemData.description,
            price: menuItemData.price,
            preparation_time: menuItemData.preparationTime,
            ingredients: JSON.stringify(menuItemData.ingredients),
            is_available: menuItemData.isAvailable,
            outlet_ids: JSON.stringify(menuItemData.outletIds),
            created_at: new Date(),
            updated_at: new Date(),
          };

          mockDb.query.mockResolvedValue({
            rows: [mockCreatedItem]
          });

          const result = await menuItemModel.create(tenantId, menuItemData);

          // Verify all required fields are present
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('description');
          expect(result).toHaveProperty('price');
          expect(result).toHaveProperty('categoryId');
          expect(result).toHaveProperty('preparationTime');

          // Verify field values match input
          expect(result.name).toBe(menuItemData.name);
          expect(result.description).toBe(menuItemData.description);
          expect(result.price).toBe(menuItemData.price);
          expect(result.categoryId).toBe(menuItemData.categoryId);
          expect(result.preparationTime).toBe(menuItemData.preparationTime);

          // Verify optional fields are handled correctly
          expect(result).toHaveProperty('ingredients');
          expect(result).toHaveProperty('isAvailable');
          expect(result).toHaveProperty('outletIds');
          expect(result).toHaveProperty('createdAt');
          expect(result).toHaveProperty('updatedAt');

          // Verify data types
          expect(typeof result.id).toBe('string');
          expect(typeof result.name).toBe('string');
          expect(typeof result.price).toBe('number');
          expect(typeof result.preparationTime).toBe('number');
          expect(typeof result.isAvailable).toBe('boolean');
          expect(Array.isArray(result.ingredients)).toBe(true);
          expect(Array.isArray(result.outletIds)).toBe(true);
        }
      ), { numRuns: 100 });
    });

    it('should reject menu items with missing required fields', async () => {
      // Feature: restaurant-management-system, Property 8: Menu Item Data Completeness
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          // Intentionally missing required fields or with invalid values
          name: fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(''),
            fc.string({ minLength: 2, maxLength: 100 })
          ),
          price: fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(-1), // Invalid negative price
            fc.float({ min: 0.01, max: 9999.99 })
          ),
        }),
        async (tenantId, invalidData) => {
          // Test should throw ValidationError for invalid data
          if (!invalidData.name || invalidData.name === '' || 
              invalidData.price === null || invalidData.price === undefined || 
              invalidData.price < 0) {
            
            await expect(menuItemModel.create(tenantId, invalidData))
              .rejects.toThrow();
          }
        }
      ), { numRuns: 50 });
    });

    it('should maintain data integrity during updates', async () => {
      // Feature: restaurant-management-system, Property 8: Menu Item Data Completeness
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        menuItemDataGenerator(),
        fc.record({
          name: fc.option(fc.string({ minLength: 2, maxLength: 100 })),
          price: fc.option(fc.float({ min: 0.01, max: 9999.99 })),
          description: fc.option(fc.string({ maxLength: 500 })),
          preparationTime: fc.option(fc.integer({ min: 0, max: 180 })),
        }),
        async (tenantId, originalData, updateData) => {
          const itemId = 'test-item-id';

          // Mock original item
          const mockOriginalItem = {
            id: itemId,
            category_id: originalData.categoryId,
            name: originalData.name,
            description: originalData.description,
            price: originalData.price,
            preparation_time: originalData.preparationTime,
            ingredients: JSON.stringify(originalData.ingredients),
            is_available: originalData.isAvailable,
            outlet_ids: JSON.stringify(originalData.outletIds),
            created_at: new Date(),
            updated_at: new Date(),
          };

          // Mock updated item
          const mockUpdatedItem = {
            ...mockOriginalItem,
            name: updateData.name || originalData.name,
            price: updateData.price || originalData.price,
            description: updateData.description || originalData.description,
            preparation_time: updateData.preparationTime || originalData.preparationTime,
            updated_at: new Date(),
          };

          mockDb.query.mockResolvedValue({
            rows: [mockUpdatedItem]
          });

          const result = await menuItemModel.updateById(tenantId, itemId, updateData);

          // Verify all required fields are still present after update
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('price');
          expect(result).toHaveProperty('categoryId');
          expect(result).toHaveProperty('preparationTime');

          // Verify updated fields have new values
          if (updateData.name) {
            expect(result.name).toBe(updateData.name);
          }
          if (updateData.price) {
            expect(result.price).toBe(updateData.price);
          }
          if (updateData.description !== undefined) {
            expect(result.description).toBe(updateData.description);
          }
          if (updateData.preparationTime !== undefined) {
            expect(result.preparationTime).toBe(updateData.preparationTime);
          }

          // Verify non-updated fields retain original values
          if (!updateData.name) {
            expect(result.name).toBe(originalData.name);
          }
          if (!updateData.price) {
            expect(result.price).toBe(originalData.price);
          }
        }
      ), { numRuns: 50 });
    });

    it('should handle ingredient data structure correctly', async () => {
      // Feature: restaurant-management-system, Property 8: Menu Item Data Completeness
      await fc.assert(fc.property(
        fc.array(fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          quantity: fc.float({ min: 0.1, max: 100 }),
          unit: fc.constantFrom('KG', 'GRAM', 'LITER', 'ML', 'PIECE'),
        }), { maxLength: 10 }),
        (ingredients) => {
          // Test the mapRowToObject method with ingredients
          const mockRow = {
            id: 'test-id',
            name: 'Test Item',
            price: 10.99,
            ingredients: JSON.stringify(ingredients),
            created_at: new Date(),
          };

          const result = menuItemModel.mapRowToObject(mockRow);

          // Verify ingredients are properly parsed
          expect(Array.isArray(result.ingredients)).toBe(true);
          expect(result.ingredients).toHaveLength(ingredients.length);

          // Verify each ingredient has required structure
          result.ingredients.forEach((ingredient, index) => {
            expect(ingredient).toHaveProperty('name');
            expect(ingredient).toHaveProperty('quantity');
            expect(ingredient).toHaveProperty('unit');
            expect(ingredient.name).toBe(ingredients[index].name);
            expect(ingredient.quantity).toBe(ingredients[index].quantity);
            expect(ingredient.unit).toBe(ingredients[index].unit);
          });
        }
      ), { numRuns: 100 });
    });
  });
});
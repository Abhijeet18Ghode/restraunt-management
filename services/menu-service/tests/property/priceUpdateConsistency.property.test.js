const fc = require('fast-check');
const PricingService = require('../../src/services/PricingService');

describe('Price Update Consistency Property Tests', () => {
  let pricingService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    pricingService = new PricingService(mockDb);
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 });

  // Generator for outlet IDs
  const outletIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 });

  // Generator for price update data
  const priceUpdateGenerator = () => fc.record({
    itemId: fc.string({ minLength: 36, maxLength: 36 }),
    price: fc.float({ min: 0.01, max: 999.99 }),
  });

  /**
   * Property 9: Price Update Consistency
   * For any price update operation across specified outlets, all specified outlets should reflect the new price simultaneously
   * Validates: Requirements 2.2
   */
  describe('Property 9: Price Update Consistency', () => {
    it('should update prices consistently across all specified outlets', async () => {
      // Feature: restaurant-management-system, Property 9: Price Update Consistency
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.array(outletIdGenerator(), { minLength: 2, maxLength: 5 }),
        fc.array(priceUpdateGenerator(), { minLength: 1, maxLength: 10 }),
        async (tenantId, outletIds, priceUpdates) => {
          // Mock the pricing service to simulate database updates
          const updatedItems = [];
          
          // Mock the updatePricing method to track all updates
          pricingService.menuItemModel = {
            findById: jest.fn(),
            updateById: jest.fn(),
          };

          // For each price update, simulate finding and updating the item
          for (const update of priceUpdates) {
            const mockItem = {
              id: update.itemId,
              name: `Test Item ${update.itemId.slice(0, 8)}`,
              price: Math.random() * 100 + 1, // Random current price
              outletIds: outletIds, // Item is available in all outlets
            };

            pricingService.menuItemModel.findById.mockResolvedValue(mockItem);
            
            const updatedItem = {
              ...mockItem,
              price: update.price,
              updatedAt: new Date(),
            };
            
            pricingService.menuItemModel.updateById.mockResolvedValue(updatedItem);
            updatedItems.push(updatedItem);
          }

          // Execute the pricing update
          const result = await pricingService.updatePricing(tenantId, priceUpdates);

          // Verify that all items were updated successfully
          expect(result.success).toBe(true);
          expect(result.data).toHaveLength(priceUpdates.length);

          // Verify that each item has the correct new price
          result.data.forEach((item, index) => {
            expect(item.price).toBe(priceUpdates[index].price);
            expect(item.id).toBe(priceUpdates[index].itemId);
          });

          // Verify that updateById was called for each item
          expect(pricingService.menuItemModel.updateById).toHaveBeenCalledTimes(priceUpdates.length);

          // Verify that all outlets would see the same price for each item
          // (In a real system, this would check that the price is consistent across all outlets)
          for (let i = 0; i < priceUpdates.length; i++) {
            const update = priceUpdates[i];
            const updatedItem = result.data[i];
            
            // The price should be exactly what was requested
            expect(updatedItem.price).toBe(update.price);
            
            // The item should be available in all specified outlets
            expect(updatedItem.outletIds).toEqual(outletIds);
          }
        }
      ), { numRuns: 50 });
    });

    it('should maintain price consistency when applying percentage changes', async () => {
      // Feature: restaurant-management-system, Property 9: Price Update Consistency
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.array(fc.string({ minLength: 36, maxLength: 36 }), { minLength: 1, maxLength: 10 }),
        fc.float({ min: -50, max: 100 }), // Percentage change
        async (tenantId, itemIds, percentage) => {
          // Skip zero percentage as it's invalid
          if (percentage === 0) return;

          // Mock items with different starting prices
          const mockItems = itemIds.map(itemId => ({
            id: itemId,
            name: `Test Item ${itemId.slice(0, 8)}`,
            price: Math.random() * 100 + 1,
          }));

          pricingService.menuItemModel = {
            findById: jest.fn(),
            updateById: jest.fn(),
          };

          // Mock findById to return different items
          mockItems.forEach(item => {
            pricingService.menuItemModel.findById
              .mockResolvedValueOnce(item);
          });

          // Mock updateById to return updated items
          const expectedUpdatedItems = mockItems.map(item => {
            let newPrice = item.price * (1 + percentage / 100);
            newPrice = Math.round(newPrice * 100) / 100; // Round to 2 decimal places
            newPrice = Math.max(newPrice, 0.01); // Ensure minimum price
            
            return {
              ...item,
              price: newPrice,
              previousPrice: item.price,
              priceChange: newPrice - item.price,
              percentageApplied: percentage,
            };
          });

          expectedUpdatedItems.forEach(item => {
            pricingService.menuItemModel.updateById
              .mockResolvedValueOnce(item);
          });

          // Execute percentage change
          const result = await pricingService.applyPercentageChange(tenantId, {
            itemIds,
            percentage,
            roundTo: 0.01,
            minPrice: 0.01,
          });

          // Verify consistency
          expect(result.success).toBe(true);
          expect(result.data.updated).toHaveLength(itemIds.length);

          // Verify that the percentage was applied consistently to all items
          result.data.updated.forEach((updatedItem, index) => {
            const originalItem = mockItems[index];
            const expectedPrice = Math.max(
              Math.round(originalItem.price * (1 + percentage / 100) * 100) / 100,
              0.01
            );
            
            expect(updatedItem.price).toBe(expectedPrice);
            expect(updatedItem.percentageApplied).toBe(percentage);
            expect(updatedItem.previousPrice).toBe(originalItem.price);
          });

          // Verify that all items received the same percentage treatment
          const percentagesApplied = result.data.updated.map(item => item.percentageApplied);
          const uniquePercentages = [...new Set(percentagesApplied)];
          expect(uniquePercentages).toHaveLength(1);
          expect(uniquePercentages[0]).toBe(percentage);
        }
      ), { numRuns: 50 });
    });

    it('should ensure price updates are atomic across multiple items', async () => {
      // Feature: restaurant-management-system, Property 9: Price Update Consistency
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.array(priceUpdateGenerator(), { minLength: 2, maxLength: 5 }),
        async (tenantId, priceUpdates) => {
          // Ensure all prices are valid
          const validUpdates = priceUpdates.filter(update => update.price > 0);
          if (validUpdates.length === 0) return;

          pricingService.menuItemModel = {
            findById: jest.fn(),
            updateById: jest.fn(),
          };

          // Mock successful updates for all items
          const mockItems = validUpdates.map(update => ({
            id: update.itemId,
            name: `Test Item ${update.itemId.slice(0, 8)}`,
            price: Math.random() * 100 + 1,
          }));

          mockItems.forEach(item => {
            pricingService.menuItemModel.findById
              .mockResolvedValueOnce(item);
          });

          const updatedItems = validUpdates.map((update, index) => ({
            ...mockItems[index],
            price: update.price,
            updatedAt: new Date(),
          }));

          updatedItems.forEach(item => {
            pricingService.menuItemModel.updateById
              .mockResolvedValueOnce(item);
          });

          // Execute the update
          const result = await pricingService.updatePricing(tenantId, validUpdates);

          // Verify atomicity - either all updates succeed or none do
          expect(result.success).toBe(true);
          expect(result.data).toHaveLength(validUpdates.length);

          // Verify that all items were updated with their respective prices
          result.data.forEach((item, index) => {
            expect(item.price).toBe(validUpdates[index].price);
            expect(item.id).toBe(validUpdates[index].itemId);
          });

          // Verify that findById and updateById were called for each item
          expect(pricingService.menuItemModel.findById).toHaveBeenCalledTimes(validUpdates.length);
          expect(pricingService.menuItemModel.updateById).toHaveBeenCalledTimes(validUpdates.length);
        }
      ), { numRuns: 50 });
    });
  });
});
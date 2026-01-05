const fc = require('fast-check');
const StockService = require('../../src/services/StockService');
const { InventoryItemModel } = require('@rms/shared');

describe('Inventory Receipt Processing Property Tests', () => {
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
      create: jest.fn(),
    };
    
    stockService = new StockService(mockDb);
    stockService.inventoryItemModel = mockInventoryItemModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for outlet IDs
  const outletIdGenerator = () => fc.uuid();

  // Generator for supplier IDs
  const supplierIdGenerator = () => fc.uuid();

  // Generator for receipt items
  const receiptItemGenerator = () => fc.record({
    itemName: fc.string({ minLength: 3, maxLength: 50 }),
    quantityReceived: fc.float({ min: 0.1, max: 100 }),
    unitCost: fc.float({ min: 0.1, max: 1000 }),
    expiryDate: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
  });

  // Generator for existing inventory items
  const existingInventoryItemGenerator = () => fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 3, maxLength: 50 }),
    currentStock: fc.float({ min: 0, max: 100 }),
    unitCost: fc.float({ min: 0.1, max: 1000 }),
    outletId: fc.uuid(),
    supplierId: fc.uuid(),
  });

  // Generator for receipt data
  const receiptDataGenerator = () => fc.record({
    supplierId: supplierIdGenerator(),
    outletId: outletIdGenerator(),
    receiptNumber: fc.string({ minLength: 5, maxLength: 20 }),
    deliveryDate: fc.date({ min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), max: new Date() }),
    items: fc.array(receiptItemGenerator(), { minLength: 1, maxLength: 5 }),
    notes: fc.string({ maxLength: 200 }),
  });

  /**
   * Property 13: Inventory Receipt Processing
   * For any inventory receipt, the current stock level should increase by exactly the received quantity
   * Validates: Requirements 3.2
   */
  describe('Property 13: Inventory Receipt Processing', () => {
    it('should increase stock levels by exactly the received quantity for existing items', async () => {
      // Feature: restaurant-management-system, Property 13: Inventory Receipt Processing
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        receiptDataGenerator(),
        fc.array(existingInventoryItemGenerator(), { minLength: 1, maxLength: 5 }),
        async (tenantId, receiptData, existingItems) => {
          // Ensure receipt items match existing items
          const alignedReceiptData = {
            ...receiptData,
            items: receiptData.items.slice(0, existingItems.length).map((item, index) => ({
              ...item,
              itemName: existingItems[index].name,
            })),
          };

          // Mock database responses for existing items
          alignedReceiptData.items.forEach((receiptItem, index) => {
            const existingItem = existingItems[index];
            mockInventoryItemModel.findByNameAndOutlet
              .mockResolvedValueOnce(existingItem);

            // Mock the update response
            const updatedItem = {
              ...existingItem,
              currentStock: existingItem.currentStock + receiptItem.quantityReceived,
              unitCost: receiptItem.unitCost || existingItem.unitCost,
              lastRestocked: expect.any(Date),
            };
            mockInventoryItemModel.updateById.mockResolvedValueOnce(updatedItem);
          });

          // Process the receipt
          const result = await stockService.processStockReceipt(tenantId, alignedReceiptData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('processedItems');
          expect(result.data).toHaveProperty('errors');
          expect(result.data.processedItems).toHaveLength(alignedReceiptData.items.length);
          expect(result.data.errors).toHaveLength(0);

          // Verify each processed item
          result.data.processedItems.forEach((processedItem, index) => {
            const receiptItem = alignedReceiptData.items[index];
            const existingItem = existingItems[index];

            expect(processedItem).toHaveProperty('inventoryItem');
            expect(processedItem).toHaveProperty('quantityReceived', receiptItem.quantityReceived);
            expect(processedItem).toHaveProperty('unitCost', receiptItem.unitCost);
            expect(processedItem).toHaveProperty('totalValue', receiptItem.quantityReceived * receiptItem.unitCost);

            // Verify stock increase
            expect(processedItem.inventoryItem.currentStock).toBe(
              existingItem.currentStock + receiptItem.quantityReceived
            );
          });

          // Verify database calls
          alignedReceiptData.items.forEach((receiptItem, index) => {
            expect(mockInventoryItemModel.findByNameAndOutlet).toHaveBeenCalledWith(
              tenantId,
              receiptItem.itemName,
              alignedReceiptData.outletId
            );
            expect(mockInventoryItemModel.updateById).toHaveBeenCalledWith(
              tenantId,
              existingItems[index].id,
              expect.objectContaining({
                currentStock: existingItems[index].currentStock + receiptItem.quantityReceived,
                unitCost: receiptItem.unitCost,
                lastRestocked: expect.any(Date),
              })
            );
          });
        }
      ), { numRuns: 100 });
    });

    it('should create new inventory items when they do not exist', async () => {
      // Feature: restaurant-management-system, Property 13: Inventory Receipt Processing
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        receiptDataGenerator(),
        async (tenantId, receiptData) => {
          // Mock database responses for non-existing items
          receiptData.items.forEach((receiptItem) => {
            mockInventoryItemModel.findByNameAndOutlet
              .mockResolvedValueOnce(null); // Item doesn't exist

            // Mock the create response
            const newItem = {
              id: 'new-item-id-' + Math.random().toString(36).substr(2, 9),
              name: receiptItem.itemName,
              outletId: receiptData.outletId,
              currentStock: receiptItem.quantityReceived,
              minimumStock: 10,
              unitCost: receiptItem.unitCost || 0,
              unit: 'piece',
              category: 'General',
              supplierId: receiptData.supplierId,
              lastRestocked: expect.any(Date),
            };
            mockInventoryItemModel.create.mockResolvedValueOnce(newItem);
          });

          // Process the receipt
          const result = await stockService.processStockReceipt(tenantId, receiptData);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('processedItems');
          expect(result.data.processedItems).toHaveLength(receiptData.items.length);

          // Verify each processed item
          result.data.processedItems.forEach((processedItem, index) => {
            const receiptItem = receiptData.items[index];

            expect(processedItem).toHaveProperty('inventoryItem');
            expect(processedItem).toHaveProperty('quantityReceived', receiptItem.quantityReceived);
            expect(processedItem.inventoryItem.currentStock).toBe(receiptItem.quantityReceived);
          });

          // Verify database calls
          receiptData.items.forEach((receiptItem) => {
            expect(mockInventoryItemModel.findByNameAndOutlet).toHaveBeenCalledWith(
              tenantId,
              receiptItem.itemName,
              receiptData.outletId
            );
            expect(mockInventoryItemModel.create).toHaveBeenCalledWith(
              tenantId,
              expect.objectContaining({
                name: receiptItem.itemName,
                outletId: receiptData.outletId,
                currentStock: receiptItem.quantityReceived,
              })
            );
          });
        }
      ), { numRuns: 100 });
    });

    it('should handle invalid quantities by rejecting them', async () => {
      // Feature: restaurant-management-system, Property 13: Inventory Receipt Processing
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        receiptDataGenerator(),
        async (tenantId, receiptData) => {
          // Create receipt with invalid quantities
          const invalidReceiptData = {
            ...receiptData,
            items: receiptData.items.map(item => ({
              ...item,
              quantityReceived: Math.abs(fc.sample(fc.constantFrom(-1, 0, -10), 1)[0]) * -1, // Invalid quantities
            })),
          };

          // Process the receipt
          const result = await stockService.processStockReceipt(tenantId, invalidReceiptData);

          // Should have errors for all items
          expect(result.data.errors).toHaveLength(invalidReceiptData.items.length);
          expect(result.data.processedItems).toHaveLength(0);

          // Verify error messages contain quantity validation
          result.data.errors.forEach((error) => {
            expect(error.error).toContain('Invalid quantity');
          });
        }
      ), { numRuns: 100 });
    });
  });
});
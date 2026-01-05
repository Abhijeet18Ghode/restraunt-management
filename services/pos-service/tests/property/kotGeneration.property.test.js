const fc = require('fast-check');
const KOTService = require('../../src/services/KOTService');
const POSService = require('../../src/services/POSService');
const { OrderModel } = require('@rms/shared');

describe('KOT Generation Property Tests', () => {
  let kotService;
  let posService;
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
    
    kotService = new KOTService(mockDb);
    posService = new POSService(mockDb);
    posService.orderModel = mockOrderModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for order items
  const orderItemGenerator = () => fc.record({
    id: fc.string({ minLength: 10, maxLength: 20 }),
    menuItemId: fc.uuid(),
    menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
    quantity: fc.integer({ min: 1, max: 10 }),
    specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  });

  // Generator for finalized bills/orders
  const finalizedOrderGenerator = () => fc.record({
    id: fc.uuid(),
    orderNumber: fc.string({ minLength: 10, maxLength: 30 }),
    outletId: fc.uuid(),
    tableId: fc.option(fc.uuid(), { nil: null }),
    orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
    items: fc.array(orderItemGenerator(), { minLength: 1, maxLength: 8 }),
    status: fc.constantFrom('CONFIRMED', 'PAID'),
    paymentStatus: fc.constantFrom('PAID'),
  });

  // Generator for KOT data
  const kotDataGenerator = () => fc.record({
    orderId: fc.uuid(),
    orderNumber: fc.string({ minLength: 10, maxLength: 30 }),
    tableId: fc.option(fc.uuid(), { nil: null }),
    orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
    items: fc.array(orderItemGenerator(), { minLength: 1, maxLength: 8 }),
    priority: fc.constantFrom('LOW', 'NORMAL', 'HIGH', 'URGENT'),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
  });

  /**
   * Property 3: KOT Generation for Finalized Bills
   * For any finalized bill, there should exist a corresponding KOT with matching order details
   * Validates: Requirements 1.3
   */
  describe('Property 3: KOT Generation for Finalized Bills', () => {
    it('should generate KOT for every finalized bill with matching order details', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        finalizedOrderGenerator(),
        async (tenantId, finalizedOrder) => {
          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(finalizedOrder);

          // Mock getOrderItems method
          posService.getOrderItems = jest.fn().mockResolvedValue(finalizedOrder.items);

          // Generate KOT for the finalized order
          const result = await posService.generateKOT(tenantId, finalizedOrder.id);

          // Verify the result structure
          expect(result.success).toBe(true);
          expect(result.data).toHaveProperty('kotNumber');
          expect(result.data).toHaveProperty('orderId', finalizedOrder.id);
          expect(result.data).toHaveProperty('orderNumber', finalizedOrder.orderNumber);
          expect(result.data).toHaveProperty('tableId', finalizedOrder.tableId);
          expect(result.data).toHaveProperty('orderType', finalizedOrder.orderType);
          expect(result.data).toHaveProperty('items');
          expect(result.data).toHaveProperty('status', 'PENDING');
          expect(result.data).toHaveProperty('createdAt');
          expect(result.data).toHaveProperty('estimatedCompletionTime');

          // Verify KOT number format
          expect(result.data.kotNumber).toMatch(/^KOT-.+-\d{6,}$/);
          expect(result.data.kotNumber).toContain(finalizedOrder.orderNumber);

          // Verify all order items are included in KOT
          expect(result.data.items).toHaveLength(finalizedOrder.items.length);
          
          result.data.items.forEach((kotItem, index) => {
            const originalItem = finalizedOrder.items[index];
            expect(kotItem).toHaveProperty('menuItemId', originalItem.menuItemId);
            expect(kotItem).toHaveProperty('name', originalItem.menuItemName);
            expect(kotItem).toHaveProperty('quantity', originalItem.quantity);
            expect(kotItem).toHaveProperty('specialInstructions', originalItem.specialInstructions);
            expect(kotItem).toHaveProperty('status', 'PENDING');
          });

          // Verify estimated completion time is in the future
          expect(new Date(result.data.estimatedCompletionTime)).toBeInstanceOf(Date);
          expect(new Date(result.data.estimatedCompletionTime).getTime()).toBeGreaterThan(Date.now());

          // Verify database calls
          expect(mockOrderModel.findById).toHaveBeenCalledWith(tenantId, finalizedOrder.id);
          expect(posService.getOrderItems).toHaveBeenCalledWith(tenantId, finalizedOrder.id);
        }
      ), { numRuns: 20 });
    });

    it('should generate unique KOT numbers for concurrent orders', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.array(finalizedOrderGenerator(), { minLength: 2, maxLength: 5 }),
        async (tenantId, finalizedOrders) => {
          // Mock order retrieval for each order
          finalizedOrders.forEach(order => {
            mockOrderModel.findById.mockResolvedValueOnce(order);
          });

          // Mock getOrderItems method for each order
          finalizedOrders.forEach(order => {
            posService.getOrderItems = jest.fn().mockResolvedValue(order.items);
          });

          // Generate KOTs for all orders concurrently
          const kotPromises = finalizedOrders.map(order => 
            posService.generateKOT(tenantId, order.id)
          );

          const results = await Promise.all(kotPromises);

          // Extract KOT numbers
          const kotNumbers = results.map(result => result.data.kotNumber);

          // Verify all KOT numbers are unique
          const uniqueKOTNumbers = new Set(kotNumbers);
          expect(uniqueKOTNumbers.size).toBe(kotNumbers.length);

          // Verify each KOT corresponds to the correct order
          results.forEach((result, index) => {
            const originalOrder = finalizedOrders[index];
            expect(result.data.orderId).toBe(originalOrder.id);
            expect(result.data.orderNumber).toBe(originalOrder.orderNumber);
            expect(result.data.kotNumber).toContain(originalOrder.orderNumber);
          });
        }
      ), { numRuns: 20 });
    });

    it('should handle different order types correctly in KOT generation', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
        finalizedOrderGenerator(),
        async (tenantId, orderType, baseOrder) => {
          const finalizedOrder = {
            ...baseOrder,
            orderType,
          };

          // Mock order retrieval
          mockOrderModel.findById.mockResolvedValue(finalizedOrder);

          // Mock getOrderItems method
          posService.getOrderItems = jest.fn().mockResolvedValue(finalizedOrder.items);

          // Generate KOT
          const result = await posService.generateKOT(tenantId, finalizedOrder.id);

          // Verify KOT contains correct order type
          expect(result.data.orderType).toBe(orderType);

          // Verify order type specific handling
          if (orderType === 'DINE_IN') {
            expect(result.data.tableId).toBeDefined();
          }

          // All order types should have the same basic KOT structure
          expect(result.data).toHaveProperty('kotNumber');
          expect(result.data).toHaveProperty('items');
          expect(result.data).toHaveProperty('status', 'PENDING');
          expect(result.data).toHaveProperty('estimatedCompletionTime');
        }
      ), { numRuns: 20 });
    });

    it('should calculate appropriate estimated completion times based on order complexity', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        kotDataGenerator(),
        async (tenantId, kotData) => {
          // Generate KOT directly using KOTService
          const result = await kotService.generateKOT(tenantId, kotData);

          // Verify estimated completion time is reasonable
          const estimatedTime = new Date(result.data.estimatedCompletionTime);
          const currentTime = new Date();
          const timeDifferenceMinutes = (estimatedTime.getTime() - currentTime.getTime()) / (1000 * 60);

          // Should be at least 15 minutes in the future
          expect(timeDifferenceMinutes).toBeGreaterThanOrEqual(15);

          // Should not be more than 2 hours in the future (reasonable upper bound)
          expect(timeDifferenceMinutes).toBeLessThanOrEqual(120);

          // More items should generally result in longer estimated times
          const totalItems = kotData.items.reduce((sum, item) => sum + item.quantity, 0);
          if (totalItems > 5) {
            expect(timeDifferenceMinutes).toBeGreaterThan(20);
          }
        }
      ), { numRuns: 20 });
    });

    it('should reject KOT generation for orders without items', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.record({
          orderId: fc.uuid(),
          orderNumber: fc.string({ minLength: 10, maxLength: 30 }),
          tableId: fc.option(fc.uuid(), { nil: null }),
          orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
          items: fc.constant([]), // Empty items array
          priority: fc.constantFrom('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        }),
        async (tenantId, emptyKotData) => {
          // Attempt to generate KOT with no items
          try {
            await kotService.generateKOT(tenantId, emptyKotData);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error.message).toContain('KOT must contain at least one item');
          }
        }
      ), { numRuns: 20 });
    });

    it('should preserve special instructions and item details in KOT', async () => {
      // Feature: restaurant-management-system, Property 3: KOT Generation for Finalized Bills
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        kotDataGenerator(),
        async (tenantId, kotData) => {
          // Generate KOT
          const result = await kotService.generateKOT(tenantId, kotData);

          // Verify all item details are preserved
          expect(result.data.items).toHaveLength(kotData.items.length);

          result.data.items.forEach((kotItem, index) => {
            const originalItem = kotData.items[index];
            
            // Verify core item properties
            expect(kotItem.menuItemId).toBe(originalItem.menuItemId);
            expect(kotItem.name).toBe(originalItem.menuItemName);
            expect(kotItem.quantity).toBe(originalItem.quantity);
            expect(kotItem.specialInstructions).toBe(originalItem.specialInstructions);
            
            // Verify KOT-specific properties
            expect(kotItem).toHaveProperty('status', 'PENDING');
            expect(kotItem).toHaveProperty('startedAt', null);
            expect(kotItem).toHaveProperty('completedAt', null);
          });
        }
      ), { numRuns: 20 });
    });
  });
});
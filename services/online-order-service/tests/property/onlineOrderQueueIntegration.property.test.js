const fc = require('fast-check');
const OnlineOrderService = require('../../src/services/OnlineOrderService');
const { OrderModel } = require('@rms/shared');

describe('Online Order Queue Integration Property Tests', () => {
  let onlineOrderService;
  let mockDb;
  let mockOrderModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    
    mockOrderModel = {
      create: jest.fn().mockImplementation((tenantId, orderData) => {
        return Promise.resolve({
          id: 'order-' + Math.random().toString(36).substr(2, 9),
          orderNumber: orderData.orderNumber,
          ...orderData,
          createdAt: new Date(),
        });
      }),
      findById: jest.fn(),
      updateById: jest.fn(),
    };
    
    onlineOrderService = new OnlineOrderService(mockDb);
    onlineOrderService.orderModel = mockOrderModel;
  });

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.uuid();

  // Generator for outlet IDs
  const outletIdGenerator = () => fc.uuid();

  // Generator for online order data
  const onlineOrderDataGenerator = () => fc.record({
    outletId: fc.uuid(),
    customerId: fc.option(fc.uuid(), { nil: null }),
    customerInfo: fc.record({
      name: fc.string({ minLength: 2, maxLength: 50 }),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
      email: fc.option(fc.emailAddress(), { nil: null }),
    }),
    deliveryAddress: fc.record({
      street: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      pincode: fc.string({ minLength: 6, maxLength: 6 }),
      coordinates: fc.option(fc.record({
        lat: fc.float({ min: -90, max: 90 }),
        lng: fc.float({ min: -180, max: 180 }),
      }), { nil: null }),
    }),
    orderType: fc.constantFrom('DELIVERY', 'PICKUP'),
    items: fc.array(fc.record({
      menuItemId: fc.uuid(),
      menuItemName: fc.string({ minLength: 3, maxLength: 50 }),
      quantity: fc.integer({ min: 1, max: 10 }),
      unitPrice: fc.float({ min: Math.fround(1), max: Math.fround(500), noNaN: true }),
      specialInstructions: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
    }), { minLength: 1, maxLength: 8 }),
    notes: fc.option(fc.string({ maxLength: 200 }), { nil: null }),
    scheduledTime: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }), { nil: null }),
    promotionCode: fc.option(fc.constantFrom('WELCOME10', 'FLAT50', 'FIRSTORDER'), { nil: null }),
  });

  /**
   * Property 15: Online Order Queue Integration
   * For any valid online order, the system should correctly manage queue positions, 
   * maintain order processing sequence, and provide accurate estimated times
   * Validates: Requirements 4.1
   */
  describe('Property 15: Online Order Queue Integration', () => {
    it('should maintain correct queue positions for multiple orders', async () => {
      // Feature: restaurant-management-system, Property 15: Online Order Queue Integration
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(onlineOrderDataGenerator(), { minLength: 2, maxLength: 5 }),
        async (tenantId, outletId, ordersData) => {
          // Ensure all orders are for the same outlet
          const normalizedOrders = ordersData.map(order => ({
            ...order,
            outletId: outletId,
          }));

          const createdOrders = [];
          
          // Create orders sequentially
          for (let i = 0; i < normalizedOrders.length; i++) {
            const orderData = normalizedOrders[i];
            const result = await onlineOrderService.createOnlineOrder(tenantId, orderData);
            
            expect(result.success).toBe(true);
            expect(result.data).toHaveProperty('queuePosition');
            expect(result.data).toHaveProperty('estimatedTime');
            
            createdOrders.push(result.data);
            
            // Verify queue position is correct (should be i + 1)
            expect(result.data.queuePosition).toBe(i + 1);
            
            // Verify estimated time increases with queue position
            if (i > 0) {
              expect(result.data.estimatedTime).toBeGreaterThan(createdOrders[i - 1].estimatedTime);
            }
          }

          // Verify queue integrity
          const queueResult = await onlineOrderService.getOrderQueue(tenantId, outletId);
          expect(queueResult.success).toBe(true);
          expect(queueResult.data.totalItems).toBe(normalizedOrders.length);
          
          // Verify queue positions are sequential
          const queuePositions = queueResult.data.queue.map(order => order.queuePosition);
          const expectedPositions = Array.from({ length: normalizedOrders.length }, (_, i) => i + 1);
          expect(queuePositions.sort()).toEqual(expectedPositions);
        }
      ), { numRuns: 20 });
    });

    it('should correctly process orders in queue sequence', async () => {
      // Feature: restaurant-management-system, Property 15: Online Order Queue Integration
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(onlineOrderDataGenerator(), { minLength: 3, maxLength: 5 }),
        async (tenantId, outletId, ordersData) => {
          // Ensure all orders are for the same outlet
          const normalizedOrders = ordersData.map(order => ({
            ...order,
            outletId: outletId,
          }));

          // Create multiple orders
          const createdOrders = [];
          for (const orderData of normalizedOrders) {
            const result = await onlineOrderService.createOnlineOrder(tenantId, orderData);
            createdOrders.push(result.data);
          }

          // Process orders one by one
          for (let i = 0; i < createdOrders.length; i++) {
            const processResult = await onlineOrderService.processNextOrder(tenantId, outletId);
            
            if (i === 0) {
              // First order should be processed
              expect(processResult.success).toBe(true);
              expect(processResult.data).toHaveProperty('orderId');
              expect(processResult.data.position).toBe(1);
            }
            
            // Verify queue state after processing
            const queueResult = await onlineOrderService.getOrderQueue(tenantId, outletId, 'PENDING');
            expect(queueResult.data.totalItems).toBe(Math.max(0, normalizedOrders.length - i - 1));
          }
        }
      ), { numRuns: 20 });
    });

    it('should handle queue capacity limits correctly', async () => {
      // Feature: restaurant-management-system, Property 15: Online Order Queue Integration
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        async (tenantId, outletId) => {
          // Set a small queue size for testing
          const originalMaxSize = onlineOrderService.maxQueueSize;
          onlineOrderService.maxQueueSize = 3;

          try {
            const orderData = {
              outletId: outletId,
              orderType: 'DELIVERY',
              customerInfo: { name: 'Test Customer', phone: '1234567890' },
              deliveryAddress: { street: 'Test St', city: 'Test City', pincode: '123456' },
              items: [{
                menuItemId: fc.sample(fc.uuid(), 1)[0],
                menuItemName: 'Test Item',
                quantity: 1,
                unitPrice: 100,
              }],
            };

            // Fill the queue to capacity
            for (let i = 0; i < 3; i++) {
              const result = await onlineOrderService.createOnlineOrder(tenantId, orderData);
              expect(result.success).toBe(true);
            }

            // Try to add one more order (should fail)
            try {
              await onlineOrderService.createOnlineOrder(tenantId, orderData);
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              expect(error.message).toContain('queue is full');
            }

            // Verify queue is at capacity
            const queueResult = await onlineOrderService.getOrderQueue(tenantId, outletId);
            expect(queueResult.data.totalItems).toBe(3);
            expect(queueResult.data.maxCapacity).toBe(3);
          } finally {
            // Restore original queue size
            onlineOrderService.maxQueueSize = originalMaxSize;
          }
        }
      ), { numRuns: 20 });
    });

    it('should maintain queue integrity when orders are cancelled', async () => {
      // Feature: restaurant-management-system, Property 15: Online Order Queue Integration
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(onlineOrderDataGenerator(), { minLength: 4, maxLength: 6 }),
        async (tenantId, outletId, ordersData) => {
          // Ensure all orders are for the same outlet
          const normalizedOrders = ordersData.map(order => ({
            ...order,
            outletId: outletId,
          }));

          // Create multiple orders
          const createdOrders = [];
          for (const orderData of normalizedOrders) {
            const result = await onlineOrderService.createOnlineOrder(tenantId, orderData);
            createdOrders.push(result.data);
          }

          // Cancel a middle order
          const orderToCancel = createdOrders[Math.floor(createdOrders.length / 2)];
          await onlineOrderService.updateOrderStatus(tenantId, orderToCancel.id, 'CANCELLED');

          // Verify queue positions are recalculated
          const queueResult = await onlineOrderService.getOrderQueue(tenantId, outletId);
          expect(queueResult.data.totalItems).toBe(normalizedOrders.length - 1);

          // Verify remaining orders have sequential positions
          const remainingPositions = queueResult.data.queue.map(order => order.queuePosition);
          const expectedPositions = Array.from({ length: normalizedOrders.length - 1 }, (_, i) => i + 1);
          expect(remainingPositions.sort()).toEqual(expectedPositions);
        }
      ), { numRuns: 20 });
    });

    it('should calculate estimated times based on queue position and load', async () => {
      // Feature: restaurant-management-system, Property 15: Online Order Queue Integration
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        outletIdGenerator(),
        fc.array(onlineOrderDataGenerator(), { minLength: 2, maxLength: 4 }),
        async (tenantId, outletId, ordersData) => {
          // Ensure all orders are for the same outlet
          const normalizedOrders = ordersData.map(order => ({
            ...order,
            outletId: outletId,
          }));

          const createdOrders = [];
          let previousEstimatedTime = 0;

          // Create orders and verify estimated times increase
          for (const orderData of normalizedOrders) {
            const result = await onlineOrderService.createOnlineOrder(tenantId, orderData);
            createdOrders.push(result.data);

            // Estimated time should be positive
            expect(result.data.estimatedTime).toBeGreaterThan(0);

            // Each subsequent order should have a higher estimated time
            if (previousEstimatedTime > 0) {
              expect(result.data.estimatedTime).toBeGreaterThan(previousEstimatedTime);
            }

            previousEstimatedTime = result.data.estimatedTime;
          }

          // Verify estimated time calculation logic
          const baseTime = onlineOrderService.calculateBaseEstimatedTime();
          expect(baseTime).toBeGreaterThan(0);

          // First order should have base time
          expect(createdOrders[0].estimatedTime).toBe(baseTime);

          // Subsequent orders should have base time + queue delay
          for (let i = 1; i < createdOrders.length; i++) {
            const expectedTime = baseTime + (i * 5); // 5 minutes per order ahead
            expect(createdOrders[i].estimatedTime).toBe(expectedTime);
          }
        }
      ), { numRuns: 20 });
    });
  });
});
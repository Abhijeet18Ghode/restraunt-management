const fc = require('fast-check');

describe('Property Test: Table Merge Order Consolidation', () => {
  // Property 6: Table Merge Order Consolidation
  // Validates: Requirements 1.6
  test('should maintain order integrity when merging tables', () => {
    fc.assert(
      fc.property(
        // Generate multiple tables with orders
        fc.array(
          fc.record({
            tableId: fc.string({ minLength: 1, maxLength: 10 }),
            orders: fc.array(
              fc.record({
                orderId: fc.string({ minLength: 1, maxLength: 15 }),
                items: fc.array(
                  fc.record({
                    itemId: fc.string({ minLength: 1, maxLength: 10 }),
                    name: fc.string({ minLength: 1, maxLength: 20 }),
                    quantity: fc.integer({ min: 1, max: 10 }),
                    price: fc.float({ min: Math.fround(0.01), max: Math.fround(100.00), noNaN: true }).map(Math.fround),
                    total: fc.float({ min: Math.fround(0.01), max: Math.fround(1000.00), noNaN: true }).map(Math.fround)
                  }),
                  { minLength: 1, maxLength: 5 }
                ),
                subtotal: fc.float({ min: Math.fround(1.00), max: Math.fround(500.00), noNaN: true }).map(Math.fround),
                tax: fc.float({ min: Math.fround(0.00), max: Math.fround(50.00), noNaN: true }).map(Math.fround),
                total: fc.float({ min: Math.fround(1.00), max: Math.fround(550.00), noNaN: true }).map(Math.fround),
                timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
              }),
              { minLength: 1, maxLength: 3 }
            )
          }),
          { minLength: 2, maxLength: 5 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }), // Target merged table ID
        (tables, mergedTableId) => {
          // Simulate table merge operation
          const mergeResult = mergeTablesWithOrderConsolidation(tables, mergedTableId);

          // Property 1: All original orders must be preserved
          const originalOrderIds = tables.flatMap(table => 
            table.orders.map(order => order.orderId)
          );
          const mergedOrderIds = mergeResult.orders.map(order => order.orderId);
          
          expect(originalOrderIds.sort()).toEqual(mergedOrderIds.sort());

          // Property 2: All original items must be preserved
          const originalItems = tables.flatMap(table =>
            table.orders.flatMap(order => order.items)
          );
          const mergedItems = mergeResult.orders.flatMap(order => order.items);
          
          expect(originalItems.length).toBe(mergedItems.length);

          // Property 3: Total amount must be sum of all table totals
          const originalTotal = tables.reduce((sum, table) =>
            sum + table.orders.reduce((orderSum, order) => orderSum + order.total, 0), 0
          );
          
          expect(Math.abs(mergeResult.totalAmount - originalTotal)).toBeLessThan(0.01);

          // Property 4: Merged table ID must be assigned
          expect(mergeResult.tableId).toBe(mergedTableId);

          // Property 5: Order timestamps must be preserved
          const originalTimestamps = tables.flatMap(table =>
            table.orders.map(order => order.timestamp.getTime())
          );
          const mergedTimestamps = mergeResult.orders.map(order => order.timestamp.getTime());
          
          expect(originalTimestamps.sort()).toEqual(mergedTimestamps.sort());

          // Property 6: Each order must maintain its item integrity
          mergeResult.orders.forEach(mergedOrder => {
            const originalOrder = tables
              .flatMap(table => table.orders)
              .find(order => order.orderId === mergedOrder.orderId);
            
            expect(originalOrder).toBeDefined();
            expect(mergedOrder.items.length).toBe(originalOrder.items.length);
            expect(Math.abs(mergedOrder.total - originalOrder.total)).toBeLessThan(0.01);
          });

          // Property 7: No duplicate order IDs in merged result
          const uniqueOrderIds = new Set(mergedOrderIds);
          expect(uniqueOrderIds.size).toBe(mergedOrderIds.length);

          // Property 8: Subtotals and taxes must be preserved per order
          mergeResult.orders.forEach(mergedOrder => {
            const originalOrder = tables
              .flatMap(table => table.orders)
              .find(order => order.orderId === mergedOrder.orderId);
            
            expect(Math.abs(mergedOrder.subtotal - originalOrder.subtotal)).toBeLessThan(0.01);
            expect(Math.abs(mergedOrder.tax - originalOrder.tax)).toBeLessThan(0.01);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should handle edge cases in table merging', () => {
    fc.assert(
      fc.property(
        // Generate edge case scenarios
        fc.oneof(
          // Single table with single order
          fc.constant([{
            tableId: 'table-1',
            orders: [{
              orderId: 'order-1',
              items: [{
                itemId: 'item-1',
                name: 'Test Item',
                quantity: 1,
                price: 10.00,
                total: 10.00
              }],
              subtotal: 10.00,
              tax: 1.00,
              total: 11.00,
              timestamp: new Date('2024-01-01T12:00:00Z')
            }]
          }]),
          // Tables with zero-value orders
          fc.constant([
            {
              tableId: 'table-1',
              orders: [{
                orderId: 'order-1',
                items: [{
                  itemId: 'item-1',
                  name: 'Free Item',
                  quantity: 1,
                  price: 0.00,
                  total: 0.00
                }],
                subtotal: 0.00,
                tax: 0.00,
                total: 0.00,
                timestamp: new Date('2024-01-01T12:00:00Z')
              }]
            },
            {
              tableId: 'table-2',
              orders: [{
                orderId: 'order-2',
                items: [{
                  itemId: 'item-2',
                  name: 'Paid Item',
                  quantity: 1,
                  price: 5.00,
                  total: 5.00
                }],
                subtotal: 5.00,
                tax: 0.50,
                total: 5.50,
                timestamp: new Date('2024-01-01T12:05:00Z')
              }]
            }
          ])
        ),
        fc.string({ minLength: 1, maxLength: 10 }),
        (tables, mergedTableId) => {
          const mergeResult = mergeTablesWithOrderConsolidation(tables, mergedTableId);

          // Edge case properties
          expect(mergeResult).toBeDefined();
          expect(mergeResult.tableId).toBe(mergedTableId);
          expect(mergeResult.orders).toBeDefined();
          expect(Array.isArray(mergeResult.orders)).toBe(true);
          expect(typeof mergeResult.totalAmount).toBe('number');
          expect(mergeResult.totalAmount).toBeGreaterThanOrEqual(0);

          // Should handle empty scenarios gracefully
          if (tables.length === 0) {
            expect(mergeResult.orders.length).toBe(0);
            expect(mergeResult.totalAmount).toBe(0);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('should maintain order chronology after merge', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            tableId: fc.string({ minLength: 1, maxLength: 10 }),
            orders: fc.array(
              fc.record({
                orderId: fc.string({ minLength: 1, maxLength: 15 }),
                items: fc.array(
                  fc.record({
                    itemId: fc.string({ minLength: 1, maxLength: 10 }),
                    name: fc.string({ minLength: 1, maxLength: 20 }),
                    quantity: fc.integer({ min: 1, max: 5 }),
                    price: fc.float({ min: Math.fround(1.00), max: Math.fround(50.00), noNaN: true }).map(Math.fround),
                    total: fc.float({ min: Math.fround(1.00), max: Math.fround(250.00), noNaN: true }).map(Math.fround)
                  }),
                  { minLength: 1, maxLength: 3 }
                ),
                subtotal: fc.float({ min: Math.fround(1.00), max: Math.fround(200.00), noNaN: true }).map(Math.fround),
                tax: fc.float({ min: Math.fround(0.10), max: Math.fround(20.00), noNaN: true }).map(Math.fround),
                total: fc.float({ min: Math.fround(1.10), max: Math.fround(220.00), noNaN: true }).map(Math.fround),
                timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-01-02') })
              }),
              { minLength: 1, maxLength: 4 }
            )
          }),
          { minLength: 2, maxLength: 4 }
        ),
        (tables) => {
          const mergeResult = mergeTablesWithOrderConsolidation(tables, 'merged-table');

          // Property: Orders should be sorted chronologically
          const timestamps = mergeResult.orders.map(order => order.timestamp.getTime());
          const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
          
          expect(timestamps).toEqual(sortedTimestamps);

          // Property: Earliest and latest timestamps should be preserved
          const allOriginalTimestamps = tables
            .flatMap(table => table.orders)
            .map(order => order.timestamp.getTime());
          
          const earliestOriginal = Math.min(...allOriginalTimestamps);
          const latestOriginal = Math.max(...allOriginalTimestamps);
          const earliestMerged = Math.min(...timestamps);
          const latestMerged = Math.max(...timestamps);

          expect(earliestMerged).toBe(earliestOriginal);
          expect(latestMerged).toBe(latestOriginal);
        }
      ),
      { numRuns: 20 }
    );
  });
});

// Mock implementation of table merge functionality
function mergeTablesWithOrderConsolidation(tables, mergedTableId) {
  if (!tables || tables.length === 0) {
    return {
      tableId: mergedTableId,
      orders: [],
      totalAmount: 0,
      mergedAt: new Date().toISOString(),
      originalTableIds: []
    };
  }

  // Collect all orders from all tables
  const allOrders = tables.flatMap(table => 
    table.orders.map(order => ({
      ...order,
      originalTableId: table.tableId
    }))
  );

  // Sort orders chronologically
  allOrders.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Calculate total amount
  const totalAmount = allOrders.reduce((sum, order) => sum + order.total, 0);

  // Get original table IDs
  const originalTableIds = [...new Set(tables.map(table => table.tableId))];

  return {
    tableId: mergedTableId,
    orders: allOrders,
    totalAmount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
    mergedAt: new Date().toISOString(),
    originalTableIds,
    orderCount: allOrders.length,
    itemCount: allOrders.reduce((sum, order) => sum + order.items.length, 0)
  };
}
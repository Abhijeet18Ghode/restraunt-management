# WebSocket Service Method Fix Summary

## Issue Fixed: websocketService.subscribe is not a function

### Problem:
The `MenuInventoryIntegration` component was trying to call:
- `websocketService.subscribe('inventory_updated', handler)`
- `websocketService.unsubscribe('inventory_updated', handler)`

But the WebSocket service doesn't have generic `subscribe()` and `unsubscribe()` methods.

### Root Cause:
The WebSocket service uses:
- `on(event, handler)` - to listen to events
- `off(event, handler)` - to remove event listeners
- Specific subscription methods like `subscribeToInventory()`, `subscribeToAnalytics()`, etc.

### Solution Applied:

#### Fixed in `apps/admin-dashboard/app/components/Menu/MenuInventoryIntegration.js`:

**Before (Incorrect):**
```javascript
// Subscribe to WebSocket updates
websocketService.subscribe('inventory_updated', handleInventoryUpdate);
websocketService.subscribe('low_stock_alert', handleInventoryUpdate);
websocketService.subscribe('menu_availability_changed', handleInventoryUpdate);

return () => {
  websocketService.unsubscribe('inventory_updated', handleInventoryUpdate);
  websocketService.unsubscribe('low_stock_alert', handleInventoryUpdate);
  websocketService.unsubscribe('menu_availability_changed', handleInventoryUpdate);
};
```

**After (Correct):**
```javascript
// Subscribe to WebSocket updates using the correct method names
websocketService.on('stockUpdated', handleInventoryUpdate);
websocketService.on('lowStockAlert', handleInventoryUpdate);
websocketService.on('outOfStockAlert', handleInventoryUpdate);

return () => {
  websocketService.off('stockUpdated', handleInventoryUpdate);
  websocketService.off('lowStockAlert', handleInventoryUpdate);
  websocketService.off('outOfStockAlert', handleInventoryUpdate);
};
```

### WebSocket Service API Reference:

#### Event Listening Methods:
- `websocketService.on(event, handler)` - Add event listener
- `websocketService.off(event, handler)` - Remove event listener

#### Subscription Methods (for subscribing to data streams):
- `websocketService.subscribeToAnalytics(outletIds)`
- `websocketService.subscribeToOrders(outletIds)`
- `websocketService.subscribeToInventory(outletIds)`
- `websocketService.subscribeToStaff(outletIds)`
- `websocketService.subscribeToCustomers(outletIds)`
- `websocketService.subscribeToPayments(outletIds)`

#### Available Events:
- `'stockUpdated'` - Inventory stock level changes
- `'lowStockAlert'` - Low stock warnings
- `'outOfStockAlert'` - Out of stock alerts
- `'salesUpdate'` - Real-time sales data
- `'newOrder'` - New order notifications
- `'orderStatusChanged'` - Order status updates
- And many more...

### Files Modified:
- `apps/admin-dashboard/app/components/Menu/MenuInventoryIntegration.js` - Fixed WebSocket event subscription

### Testing:
- ✅ No syntax errors
- ✅ Using correct WebSocket service API
- ✅ Event names match the service's event emission patterns

The WebSocket service error should now be resolved and the component should work properly with real-time inventory updates!
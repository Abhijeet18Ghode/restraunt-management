import { io } from 'socket.io-client';
import config from '../config/env';

const WS_BASE_URL = config.wsUrl;

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
    this.outletId = null;
    this.staffId = null;
  }

  // Connection Management
  connect(outletId, staffId) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    this.outletId = outletId;
    this.staffId = staffId;

    const token = typeof window !== 'undefined' ? 
      document.cookie.split('; ').find(row => row.startsWith('pos_auth_token='))?.split('=')[1] : 
      null;

    this.socket = io(WS_BASE_URL, {
      auth: {
        token,
        outletId,
        staffId,
        clientType: 'pos'
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection', { status: 'error', error: error.message });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.emit('connection', { status: 'reconnected', attempts: attemptNumber });
    });

    // Order events
    this.socket.on('order:created', (data) => {
      this.emit('orderCreated', data);
    });

    this.socket.on('order:updated', (data) => {
      this.emit('orderUpdated', data);
    });

    this.socket.on('order:status_changed', (data) => {
      this.emit('orderStatusChanged', data);
    });

    this.socket.on('order:cancelled', (data) => {
      this.emit('orderCancelled', data);
    });

    // Kitchen events
    this.socket.on('kitchen:order_ready', (data) => {
      this.emit('kitchenOrderReady', data);
    });

    this.socket.on('kitchen:order_preparing', (data) => {
      this.emit('kitchenOrderPreparing', data);
    });

    this.socket.on('kitchen:item_ready', (data) => {
      this.emit('kitchenItemReady', data);
    });

    this.socket.on('kitchen:delay_notification', (data) => {
      this.emit('kitchenDelayNotification', data);
    });

    // Table events
    this.socket.on('table:status_changed', (data) => {
      this.emit('tableStatusChanged', data);
    });

    this.socket.on('table:occupied', (data) => {
      this.emit('tableOccupied', data);
    });

    this.socket.on('table:freed', (data) => {
      this.emit('tableFreed', data);
    });

    this.socket.on('table:call_waiter', (data) => {
      this.emit('tableCallWaiter', data);
    });

    // Payment events
    this.socket.on('payment:completed', (data) => {
      this.emit('paymentCompleted', data);
    });

    this.socket.on('payment:failed', (data) => {
      this.emit('paymentFailed', data);
    });

    this.socket.on('payment:refunded', (data) => {
      this.emit('paymentRefunded', data);
    });

    // Inventory events
    this.socket.on('inventory:low_stock', (data) => {
      this.emit('inventoryLowStock', data);
    });

    this.socket.on('inventory:out_of_stock', (data) => {
      this.emit('inventoryOutOfStock', data);
    });

    this.socket.on('inventory:updated', (data) => {
      this.emit('inventoryUpdated', data);
    });

    // Staff events
    this.socket.on('staff:shift_change', (data) => {
      this.emit('staffShiftChange', data);
    });

    this.socket.on('staff:break_reminder', (data) => {
      this.emit('staffBreakReminder', data);
    });

    // System events
    this.socket.on('system:notification', (data) => {
      this.emit('systemNotification', data);
    });

    this.socket.on('system:alert', (data) => {
      this.emit('systemAlert', data);
    });

    this.socket.on('system:maintenance', (data) => {
      this.emit('systemMaintenance', data);
    });

    // Analytics events
    this.socket.on('analytics:real_time_update', (data) => {
      this.emit('analyticsUpdate', data);
    });
  }

  // Event Management
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  // Order Events
  subscribeToOrderUpdates(orderId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:order', { orderId });
    }
  }

  unsubscribeFromOrderUpdates(orderId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe:order', { orderId });
    }
  }

  notifyOrderCreated(orderData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:create', orderData);
    }
  }

  notifyOrderStatusChange(orderId, status, notes = '') {
    if (this.socket && this.isConnected) {
      this.socket.emit('order:status_change', {
        orderId,
        status,
        notes,
        staffId: this.staffId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Kitchen Events
  subscribeToKitchenUpdates() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:kitchen', { outletId: this.outletId });
    }
  }

  notifyKitchenOrderReady(orderId, items = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('kitchen:order_ready', {
        orderId,
        items,
        outletId: this.outletId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Table Events
  subscribeToTableUpdates() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:tables', { outletId: this.outletId });
    }
  }

  notifyTableStatusChange(tableId, status, orderId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('table:status_change', {
        tableId,
        status,
        orderId,
        staffId: this.staffId,
        outletId: this.outletId,
        timestamp: new Date().toISOString()
      });
    }
  }

  notifyTableCallWaiter(tableId, requestType = 'assistance') {
    if (this.socket && this.isConnected) {
      this.socket.emit('table:call_waiter', {
        tableId,
        requestType,
        outletId: this.outletId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Payment Events
  notifyPaymentCompleted(paymentData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('payment:completed', {
        ...paymentData,
        staffId: this.staffId,
        outletId: this.outletId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Inventory Events
  subscribeToInventoryUpdates() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:inventory', { outletId: this.outletId });
    }
  }

  notifyInventoryUsage(items) {
    if (this.socket && this.isConnected) {
      this.socket.emit('inventory:usage', {
        items,
        outletId: this.outletId,
        staffId: this.staffId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Staff Events
  subscribeToStaffUpdates() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:staff', { outletId: this.outletId });
    }
  }

  notifyStaffActivity(activity, data = {}) {
    if (this.socket && this.isConnected) {
      this.socket.emit('staff:activity', {
        activity,
        staffId: this.staffId,
        outletId: this.outletId,
        data,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Analytics Events
  subscribeToAnalytics() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:analytics', { outletId: this.outletId });
    }
  }

  // Utility Methods
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      outletId: this.outletId,
      staffId: this.staffId
    };
  }

  // Heartbeat
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('heartbeat', {
          outletId: this.outletId,
          staffId: this.staffId,
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Cleanup
  cleanup() {
    this.stopHeartbeat();
    this.disconnect();
    this.eventHandlers.clear();
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
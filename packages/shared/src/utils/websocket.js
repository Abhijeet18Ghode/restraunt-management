import { io } from 'socket.io-client';
import { authUtils } from './auth';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
  }

  connect() {
    const token = authUtils.getAuthToken();
    const tenantId = authUtils.getTenantId();
    
    if (!token || !tenantId) {
      console.warn('Cannot connect to WebSocket: missing token or tenantId');
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000';
    
    this.socket = io(socketUrl, {
      auth: {
        token,
        tenantId
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connection_status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('connection_status', { connected: false, reason });
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.emit('connection_error', error);
      this.handleReconnect();
    });

    // Business event handlers
    this.socket.on('order_created', (data) => {
      this.emit('order_created', data);
    });

    this.socket.on('order_updated', (data) => {
      this.emit('order_updated', data);
    });

    this.socket.on('inventory_updated', (data) => {
      this.emit('inventory_updated', data);
    });

    this.socket.on('table_status_changed', (data) => {
      this.emit('table_status_changed', data);
    });

    this.socket.on('kitchen_order_ready', (data) => {
      this.emit('kitchen_order_ready', data);
    });

    this.socket.on('payment_processed', (data) => {
      this.emit('payment_processed', data);
    });

    this.socket.on('staff_activity', (data) => {
      this.emit('staff_activity', data);
    });

    this.socket.on('system_alert', (data) => {
      this.emit('system_alert', data);
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max_reconnect_attempts_reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  // Event emission
  emit(event, data) {
    const eventListeners = this.listeners.get(event) || [];
    eventListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket event listener for ${event}:`, error);
      }
    });
  }

  // Event subscription
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(event) || [];
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    };
  }

  // Remove event listener
  off(event, callback) {
    const eventListeners = this.listeners.get(event) || [];
    const index = eventListeners.indexOf(callback);
    if (index > -1) {
      eventListeners.splice(index, 1);
    }
  }

  // Send data to server
  send(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot send ${event}: WebSocket not connected`);
    }
  }

  // Connection status
  isConnected() {
    return this.socket && this.socket.connected;
  }

  // Join room (for tenant/outlet specific events)
  joinRoom(room) {
    this.send('join_room', { room });
  }

  // Leave room
  leaveRoom(room) {
    this.send('leave_room', { room });
  }

  // Kitchen specific methods
  updateOrderStatus(orderId, status) {
    this.send('update_order_status', { orderId, status });
  }

  notifyOrderReady(orderId) {
    this.send('order_ready', { orderId });
  }

  // POS specific methods
  createOrder(orderData) {
    this.send('create_order', orderData);
  }

  updateTableStatus(tableId, status) {
    this.send('update_table_status', { tableId, status });
  }

  // Admin specific methods
  broadcastAnnouncement(message) {
    this.send('broadcast_announcement', { message });
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
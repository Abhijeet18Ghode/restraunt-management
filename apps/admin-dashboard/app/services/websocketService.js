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
    this.tenantId = null;
    this.userId = null;
  }

  // Connection Management
  connect(tenantId, userId) {
    if (this.socket && this.isConnected) {
      console.log('WebSocket already connected');
      return;
    }

    this.tenantId = tenantId;
    this.userId = userId;

    const token = typeof window !== 'undefined' ? 
      document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : 
      null;

    this.socket = io(WS_BASE_URL, {
      auth: {
        token,
        tenantId,
        userId,
        clientType: 'admin'
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
      console.log('Admin WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connection', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Admin WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('connection', { status: 'disconnected', reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Admin WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection', { status: 'error', error: error.message });
    });

    // Real-time Analytics Events
    this.socket.on('analytics:sales_update', (data) => {
      this.emit('salesUpdate', data);
    });

    this.socket.on('analytics:revenue_update', (data) => {
      this.emit('revenueUpdate', data);
    });

    this.socket.on('analytics:order_metrics', (data) => {
      this.emit('orderMetricsUpdate', data);
    });

    this.socket.on('analytics:customer_metrics', (data) => {
      this.emit('customerMetricsUpdate', data);
    });

    // Order Management Events
    this.socket.on('order:new_order', (data) => {
      this.emit('newOrder', data);
    });

    this.socket.on('order:status_changed', (data) => {
      this.emit('orderStatusChanged', data);
    });

    this.socket.on('order:cancelled', (data) => {
      this.emit('orderCancelled', data);
    });

    this.socket.on('order:refunded', (data) => {
      this.emit('orderRefunded', data);
    });

    // Inventory Management Events
    this.socket.on('inventory:low_stock_alert', (data) => {
      this.emit('lowStockAlert', data);
    });

    this.socket.on('inventory:out_of_stock_alert', (data) => {
      this.emit('outOfStockAlert', data);
    });

    this.socket.on('inventory:stock_updated', (data) => {
      this.emit('stockUpdated', data);
    });

    this.socket.on('inventory:purchase_order_received', (data) => {
      this.emit('purchaseOrderReceived', data);
    });

    // Staff Management Events
    this.socket.on('staff:clock_in', (data) => {
      this.emit('staffClockIn', data);
    });

    this.socket.on('staff:clock_out', (data) => {
      this.emit('staffClockOut', data);
    });

    this.socket.on('staff:break_started', (data) => {
      this.emit('staffBreakStarted', data);
    });

    this.socket.on('staff:break_ended', (data) => {
      this.emit('staffBreakEnded', data);
    });

    this.socket.on('staff:performance_alert', (data) => {
      this.emit('staffPerformanceAlert', data);
    });

    // Customer Events
    this.socket.on('customer:new_registration', (data) => {
      this.emit('newCustomerRegistration', data);
    });

    this.socket.on('customer:loyalty_milestone', (data) => {
      this.emit('customerLoyaltyMilestone', data);
    });

    this.socket.on('customer:feedback_received', (data) => {
      this.emit('customerFeedbackReceived', data);
    });

    this.socket.on('customer:complaint_received', (data) => {
      this.emit('customerComplaintReceived', data);
    });

    // Payment Events
    this.socket.on('payment:large_transaction', (data) => {
      this.emit('largeTransaction', data);
    });

    this.socket.on('payment:failed_transaction', (data) => {
      this.emit('failedTransaction', data);
    });

    this.socket.on('payment:chargeback_alert', (data) => {
      this.emit('chargebackAlert', data);
    });

    this.socket.on('payment:settlement_completed', (data) => {
      this.emit('settlementCompleted', data);
    });

    // Online Order Events
    this.socket.on('online_order:new_order', (data) => {
      this.emit('newOnlineOrder', data);
    });

    this.socket.on('online_order:delivery_delayed', (data) => {
      this.emit('deliveryDelayed', data);
    });

    this.socket.on('online_order:customer_review', (data) => {
      this.emit('customerReview', data);
    });

    this.socket.on('online_order:platform_issue', (data) => {
      this.emit('platformIssue', data);
    });

    // System Events
    this.socket.on('system:alert', (data) => {
      this.emit('systemAlert', data);
    });

    this.socket.on('system:maintenance_scheduled', (data) => {
      this.emit('maintenanceScheduled', data);
    });

    this.socket.on('system:backup_completed', (data) => {
      this.emit('backupCompleted', data);
    });

    this.socket.on('system:security_alert', (data) => {
      this.emit('securityAlert', data);
    });

    // Multi-location Events
    this.socket.on('multi_location:sync_completed', (data) => {
      this.emit('multiLocationSyncCompleted', data);
    });

    this.socket.on('multi_location:inventory_transfer', (data) => {
      this.emit('inventoryTransfer', data);
    });

    this.socket.on('multi_location:performance_comparison', (data) => {
      this.emit('performanceComparison', data);
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

  // Subscription Management
  subscribeToAnalytics(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:analytics', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToOrders(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:orders', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToInventory(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:inventory', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToStaff(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:staff', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToCustomers(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:customers', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToPayments(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:payments', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToOnlineOrders(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:online_orders', { 
        tenantId: this.tenantId,
        outletIds 
      });
    }
  }

  subscribeToSystemEvents() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe:system', { 
        tenantId: this.tenantId 
      });
    }
  }

  // Notification Management
  sendNotification(outletId, notification) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:send_notification', {
        outletId,
        notification,
        tenantId: this.tenantId,
        userId: this.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  broadcastMessage(outletIds, message, type = 'info') {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:broadcast_message', {
        outletIds,
        message,
        type,
        tenantId: this.tenantId,
        userId: this.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Dashboard Management
  requestDashboardUpdate(outletIds = []) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:request_dashboard_update', {
        outletIds,
        tenantId: this.tenantId,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Report Generation
  requestReportGeneration(reportType, parameters) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:request_report', {
        reportType,
        parameters,
        tenantId: this.tenantId,
        userId: this.userId,
        timestamp: new Date().toISOString()
      });
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
      tenantId: this.tenantId,
      userId: this.userId
    };
  }

  // Heartbeat
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('admin:heartbeat', {
          tenantId: this.tenantId,
          userId: this.userId,
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
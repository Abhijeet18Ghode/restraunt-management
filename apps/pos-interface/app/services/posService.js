import axios from 'axios';
import CustomerService from './customerService';
import PaymentService from './paymentService';
import websocketService from './websocketService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class POSService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/pos`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize integrated services
    this.customerService = new CustomerService();
    this.paymentService = new PaymentService();
    this.websocketService = websocketService;

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? 
        document.cookie.split('; ').find(row => row.startsWith('pos_auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Enhanced Orders with Customer and Payment Integration
  async processOrder(orderData) {
    try {
      // Process the order
      const response = await this.api.post('/orders', orderData);
      const order = response.data;

      // Handle customer loyalty points if customer is provided
      if (orderData.customerId && orderData.totalAmount) {
        try {
          await this.customerService.addLoyaltyPoints(
            orderData.customerId, 
            Math.floor(orderData.totalAmount / 10), // 1 point per $10
            order.id,
            'Order purchase'
          );
        } catch (error) {
          console.warn('Failed to add loyalty points:', error);
        }
      }

      // Notify kitchen via WebSocket
      if (this.websocketService.isSocketConnected()) {
        this.websocketService.notifyOrderCreated(order);
      }

      // Track inventory usage
      if (orderData.items && orderData.items.length > 0) {
        this.websocketService.notifyInventoryUsage(orderData.items);
      }

      return order;
    } catch (error) {
      console.error('Failed to process order:', error);
      throw error;
    }
  }

  async getOrder(orderId) {
    const response = await this.api.get(`/orders/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(orderId, status) {
    try {
      const response = await this.api.patch(`/orders/${orderId}/status`, { status });
      
      // Notify via WebSocket
      if (this.websocketService.isSocketConnected()) {
        this.websocketService.notifyOrderStatusChange(orderId, status);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }

  // Tables
  async getTables(outletId) {
    const response = await this.api.get(`/tables?outletId=${outletId}`);
    return response.data;
  }

  // Enhanced Tables with WebSocket Integration
  async updateTableStatus(tableId, status) {
    try {
      const response = await this.api.patch(`/tables/${tableId}/status`, { status });
      
      // Notify via WebSocket
      if (this.websocketService.isSocketConnected()) {
        this.websocketService.notifyTableStatusChange(tableId, status);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to update table status:', error);
      throw error;
    }
  }

  // Menu
  async getMenu(outletId) {
    const response = await this.api.get(`/menu?outletId=${outletId}`);
    return response.data;
  }

  async getCategories(outletId) {
    const response = await this.api.get(`/categories?outletId=${outletId}`);
    return response.data;
  }

  // Billing
  async generateBill(orderId) {
    const response = await this.api.post(`/billing/generate`, { orderId });
    return response.data;
  }

  async splitBill(orderId, splitData) {
    const response = await this.api.post(`/billing/split`, { orderId, ...splitData });
    return response.data;
  }

  async processPayment(paymentData) {
    const response = await this.api.post('/billing/payment', paymentData);
    return response.data;
  }

  // KOT (Kitchen Order Ticket)
  async generateKOT(orderId) {
    const response = await this.api.post('/kot/generate', { orderId });
    return response.data;
  }

  async getKOTs(outletId, status = null) {
    let url = `/kot?outletId=${outletId}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await this.api.get(url);
    return response.data;
  }

  async updateKOTStatus(kotId, status) {
    const response = await this.api.patch(`/kot/${kotId}/status`, { status });
    return response.data;
  }

  // Reports
  async getDailySales(outletId, date) {
    const response = await this.api.get(`/reports/daily-sales?outletId=${outletId}&date=${date}`);
    return response.data;
  }

  async getOrderHistory(outletId, limit = 50) {
    const response = await this.api.get(`/orders/history?outletId=${outletId}&limit=${limit}`);
    return response.data;
  }

  // Integrated Service Methods
  
  // Customer Integration
  async searchCustomers(outletId, query) {
    return this.customerService.searchCustomers(outletId, query);
  }

  async getCustomerLoyalty(customerId) {
    return this.customerService.getCustomerLoyalty(customerId);
  }

  async redeemLoyaltyPoints(customerId, points, orderId) {
    return this.customerService.redeemLoyaltyPoints(customerId, points, orderId);
  }

  async getCustomerFavorites(customerId) {
    return this.customerService.getCustomerFavorites(customerId);
  }

  async quickRegisterCustomer(customerData) {
    return this.customerService.quickRegister(customerData);
  }

  // Payment Integration
  async processPaymentWithMethod(paymentData) {
    try {
      let paymentResult;
      
      switch (paymentData.method) {
        case 'card':
          paymentResult = await this.paymentService.processCardPayment(paymentData);
          break;
        case 'cash':
          paymentResult = await this.paymentService.processCashPayment(paymentData);
          break;
        case 'upi':
          paymentResult = await this.paymentService.processUPIPayment(paymentData);
          break;
        case 'digital_wallet':
          paymentResult = await this.paymentService.processDigitalWalletPayment(paymentData);
          break;
        case 'contactless':
          paymentResult = await this.paymentService.processContactlessPayment(paymentData);
          break;
        default:
          paymentResult = await this.paymentService.processPayment(paymentData);
      }

      // Notify via WebSocket
      if (this.websocketService.isSocketConnected()) {
        this.websocketService.notifyPaymentCompleted(paymentResult);
      }

      return paymentResult;
    } catch (error) {
      console.error('Payment processing failed:', error);
      throw error;
    }
  }

  async processSplitPayment(splitPaymentData) {
    return this.paymentService.processSplitPayment(splitPaymentData);
  }

  async processRefund(paymentId, refundData) {
    return this.paymentService.processRefund(paymentId, refundData);
  }

  async getAvailablePaymentMethods(outletId) {
    return this.paymentService.getAvailablePaymentMethods(outletId);
  }

  async addTip(paymentId, tipAmount) {
    return this.paymentService.addTip(paymentId, tipAmount);
  }

  async applyCoupon(couponCode, orderAmount, customerId = null) {
    return this.paymentService.applyCoupon(couponCode, orderAmount, customerId);
  }

  // WebSocket Integration
  initializeWebSocket(outletId, staffId) {
    try {
      this.websocketService.connect(outletId, staffId);
      
      // Subscribe to relevant updates
      this.websocketService.subscribeToOrderUpdates();
      this.websocketService.subscribeToKitchenUpdates();
      this.websocketService.subscribeToTableUpdates();
      this.websocketService.subscribeToInventoryUpdates();
      
      // Start heartbeat
      this.websocketService.startHeartbeat();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      return false;
    }
  }

  disconnectWebSocket() {
    this.websocketService.cleanup();
  }

  // WebSocket Event Handlers
  onOrderUpdate(handler) {
    this.websocketService.on('orderUpdated', handler);
  }

  onKitchenOrderReady(handler) {
    this.websocketService.on('kitchenOrderReady', handler);
  }

  onTableStatusChange(handler) {
    this.websocketService.on('tableStatusChanged', handler);
  }

  onInventoryAlert(handler) {
    this.websocketService.on('inventoryLowStock', handler);
    this.websocketService.on('inventoryOutOfStock', handler);
  }

  onPaymentUpdate(handler) {
    this.websocketService.on('paymentCompleted', handler);
    this.websocketService.on('paymentFailed', handler);
  }

  onSystemNotification(handler) {
    this.websocketService.on('systemNotification', handler);
    this.websocketService.on('systemAlert', handler);
  }

  // Offline Support
  async syncOfflineData(outletId) {
    try {
      // Sync offline customers
      const offlineCustomers = JSON.parse(localStorage.getItem('offline_customers') || '[]');
      if (offlineCustomers.length > 0) {
        await this.customerService.syncOfflineCustomers(offlineCustomers);
        localStorage.removeItem('offline_customers');
      }

      // Sync offline payments
      const offlinePayments = JSON.parse(localStorage.getItem('offline_payments') || '[]');
      if (offlinePayments.length > 0) {
        await this.paymentService.syncOfflinePayments(offlinePayments);
        localStorage.removeItem('offline_payments');
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to sync offline data:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Methods
  getWebSocketStatus() {
    return this.websocketService.getConnectionStatus();
  }

  isOnline() {
    return navigator.onLine && this.websocketService.isSocketConnected();
  }
}

export const posService = new POSService();
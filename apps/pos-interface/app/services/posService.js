import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class POSService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/pos`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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

  // Orders
  async processOrder(orderData) {
    const response = await this.api.post('/orders', orderData);
    return response.data;
  }

  async getOrder(orderId) {
    const response = await this.api.get(`/orders/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(orderId, status) {
    const response = await this.api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  }

  // Tables
  async getTables(outletId) {
    const response = await this.api.get(`/tables?outletId=${outletId}`);
    return response.data;
  }

  async updateTableStatus(tableId, status) {
    const response = await this.api.patch(`/tables/${tableId}/status`, { status });
    return response.data;
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
}

export const posService = new POSService();
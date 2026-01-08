import axios from 'axios';
import config from '../config/env';

const API_BASE_URL = config.apiUrl;

class CustomerService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/customers`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? 
        document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Customer Management
  async getCustomers(outletId, page = 1, limit = 20, search = '') {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    const response = await this.api.get(`/?${params}`);
    return response.data;
  }

  async getCustomer(customerId) {
    const response = await this.api.get(`/${customerId}`);
    return response.data;
  }

  async createCustomer(customerData) {
    const response = await this.api.post('/', customerData);
    return response.data;
  }

  async updateCustomer(customerId, data) {
    const response = await this.api.put(`/${customerId}`, data);
    return response.data;
  }

  async deleteCustomer(customerId) {
    const response = await this.api.delete(`/${customerId}`);
    return response.data;
  }

  async searchCustomers(outletId, query) {
    const response = await this.api.get(`/search?outletId=${outletId}&q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Loyalty Program Management
  async getLoyaltyPrograms(outletId) {
    const response = await this.api.get(`/loyalty/programs?outletId=${outletId}`);
    return response.data;
  }

  async createLoyaltyProgram(programData) {
    const response = await this.api.post('/loyalty/programs', programData);
    return response.data;
  }

  async updateLoyaltyProgram(programId, data) {
    const response = await this.api.put(`/loyalty/programs/${programId}`, data);
    return response.data;
  }

  async deleteLoyaltyProgram(programId) {
    const response = await this.api.delete(`/loyalty/programs/${programId}`);
    return response.data;
  }

  async getCustomerLoyalty(customerId) {
    const response = await this.api.get(`/${customerId}/loyalty`);
    return response.data;
  }

  async addLoyaltyPoints(customerId, points, reason) {
    const response = await this.api.post(`/${customerId}/loyalty/points`, {
      points,
      reason
    });
    return response.data;
  }

  async redeemLoyaltyPoints(customerId, points, orderId) {
    const response = await this.api.post(`/${customerId}/loyalty/redeem`, {
      points,
      orderId
    });
    return response.data;
  }

  // Customer Feedback Management
  async getFeedback(outletId, page = 1, limit = 20, rating = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(rating && { rating: rating.toString() })
    });
    const response = await this.api.get(`/feedback?${params}`);
    return response.data;
  }

  async getFeedbackById(feedbackId) {
    const response = await this.api.get(`/feedback/${feedbackId}`);
    return response.data;
  }

  async respondToFeedback(feedbackId, response) {
    const responseData = await this.api.post(`/feedback/${feedbackId}/respond`, {
      response
    });
    return responseData.data;
  }

  async markFeedbackAsResolved(feedbackId) {
    const response = await this.api.patch(`/feedback/${feedbackId}/resolve`);
    return response.data;
  }

  async getFeedbackStats(outletId, period = '30d') {
    const response = await this.api.get(`/feedback/stats?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Customer Analytics
  async getCustomerAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getCustomerSegments(outletId) {
    const response = await this.api.get(`/segments?outletId=${outletId}`);
    return response.data;
  }

  async getCustomerLifetimeValue(customerId) {
    const response = await this.api.get(`/${customerId}/lifetime-value`);
    return response.data;
  }

  async getCustomerOrderHistory(customerId, page = 1, limit = 10) {
    const response = await this.api.get(`/${customerId}/orders?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Customer Communication
  async sendCustomerNotification(customerId, notification) {
    const response = await this.api.post(`/${customerId}/notifications`, notification);
    return response.data;
  }

  async getCustomerPreferences(customerId) {
    const response = await this.api.get(`/${customerId}/preferences`);
    return response.data;
  }

  async updateCustomerPreferences(customerId, preferences) {
    const response = await this.api.put(`/${customerId}/preferences`, preferences);
    return response.data;
  }

  // Bulk Operations
  async importCustomers(outletId, csvData) {
    const formData = new FormData();
    formData.append('file', csvData);
    formData.append('outletId', outletId);
    
    const response = await this.api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async exportCustomers(outletId, format = 'csv') {
    const response = await this.api.get(`/export?outletId=${outletId}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
}

export default CustomerService;
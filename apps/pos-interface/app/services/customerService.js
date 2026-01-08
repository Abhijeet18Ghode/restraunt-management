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
        document.cookie.split('; ').find(row => row.startsWith('pos_auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Customer Lookup and Management (POS-focused)
  async searchCustomers(outletId, query) {
    const response = await this.api.get(`/search?outletId=${outletId}&q=${encodeURIComponent(query)}&limit=10`);
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

  async getCustomerByPhone(outletId, phone) {
    const response = await this.api.get(`/phone/${phone}?outletId=${outletId}`);
    return response.data;
  }

  async getCustomerByEmail(outletId, email) {
    const response = await this.api.get(`/email/${encodeURIComponent(email)}?outletId=${outletId}`);
    return response.data;
  }

  // Quick Customer Registration for POS
  async quickRegister(customerData) {
    const response = await this.api.post('/quick-register', customerData);
    return response.data;
  }

  // Loyalty Program Integration
  async getCustomerLoyalty(customerId) {
    const response = await this.api.get(`/${customerId}/loyalty`);
    return response.data;
  }

  async checkLoyaltyPoints(customerId) {
    const response = await this.api.get(`/${customerId}/loyalty/points`);
    return response.data;
  }

  async addLoyaltyPoints(customerId, points, orderId, reason = 'Order purchase') {
    const response = await this.api.post(`/${customerId}/loyalty/points`, {
      points,
      orderId,
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

  async calculateLoyaltyEarnings(customerId, orderAmount) {
    const response = await this.api.post(`/${customerId}/loyalty/calculate`, {
      orderAmount
    });
    return response.data;
  }

  async getLoyaltyHistory(customerId, page = 1, limit = 10) {
    const response = await this.api.get(`/${customerId}/loyalty/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Customer Preferences and Orders
  async getCustomerPreferences(customerId) {
    const response = await this.api.get(`/${customerId}/preferences`);
    return response.data;
  }

  async updateCustomerPreferences(customerId, preferences) {
    const response = await this.api.put(`/${customerId}/preferences`, preferences);
    return response.data;
  }

  async getCustomerOrderHistory(customerId, page = 1, limit = 5) {
    const response = await this.api.get(`/${customerId}/orders?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getCustomerFavorites(customerId) {
    const response = await this.api.get(`/${customerId}/favorites`);
    return response.data;
  }

  async addCustomerFavorite(customerId, menuItemId) {
    const response = await this.api.post(`/${customerId}/favorites`, {
      menuItemId
    });
    return response.data;
  }

  async removeCustomerFavorite(customerId, menuItemId) {
    const response = await this.api.delete(`/${customerId}/favorites/${menuItemId}`);
    return response.data;
  }

  // Customer Feedback (Quick POS feedback)
  async submitQuickFeedback(customerId, orderId, rating, comment = '') {
    const response = await this.api.post('/feedback/quick', {
      customerId,
      orderId,
      rating,
      comment
    });
    return response.data;
  }

  // Customer Discounts and Offers
  async getCustomerOffers(customerId, outletId) {
    const response = await this.api.get(`/${customerId}/offers?outletId=${outletId}`);
    return response.data;
  }

  async applyCustomerDiscount(customerId, discountCode, orderAmount) {
    const response = await this.api.post(`/${customerId}/discounts/apply`, {
      discountCode,
      orderAmount
    });
    return response.data;
  }

  async validateCustomerDiscount(customerId, discountCode) {
    const response = await this.api.post(`/${customerId}/discounts/validate`, {
      discountCode
    });
    return response.data;
  }

  // Customer Analytics (POS relevant)
  async getCustomerStats(customerId) {
    const response = await this.api.get(`/${customerId}/stats`);
    return response.data;
  }

  async getCustomerSpendingPattern(customerId) {
    const response = await this.api.get(`/${customerId}/spending-pattern`);
    return response.data;
  }

  // Customer Communication
  async sendOrderNotification(customerId, orderId, notificationType, message) {
    const response = await this.api.post(`/${customerId}/notifications`, {
      orderId,
      type: notificationType,
      message
    });
    return response.data;
  }

  async getCustomerNotificationPreferences(customerId) {
    const response = await this.api.get(`/${customerId}/notification-preferences`);
    return response.data;
  }

  // Customer Verification
  async verifyCustomerPhone(customerId, verificationCode) {
    const response = await this.api.post(`/${customerId}/verify-phone`, {
      verificationCode
    });
    return response.data;
  }

  async sendPhoneVerification(customerId) {
    const response = await this.api.post(`/${customerId}/send-phone-verification`);
    return response.data;
  }

  // Birthday and Special Occasions
  async getCustomerSpecialOffers(customerId) {
    const response = await this.api.get(`/${customerId}/special-offers`);
    return response.data;
  }

  async markBirthdayOffer(customerId, orderId) {
    const response = await this.api.post(`/${customerId}/birthday-offer`, {
      orderId
    });
    return response.data;
  }

  // Customer Groups and Segments
  async getCustomerSegment(customerId) {
    const response = await this.api.get(`/${customerId}/segment`);
    return response.data;
  }

  async getSegmentBenefits(segmentId) {
    const response = await this.api.get(`/segments/${segmentId}/benefits`);
    return response.data;
  }

  // Offline Support
  async syncOfflineCustomers(customers) {
    const response = await this.api.post('/sync/offline', {
      customers
    });
    return response.data;
  }

  async getOfflineCustomerData(outletId) {
    const response = await this.api.get(`/offline-data?outletId=${outletId}`);
    return response.data;
  }
}

export default CustomerService;
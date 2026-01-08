import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class OnlineOrderService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/online-orders`,
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

  // Online Order Management
  async getOnlineOrders(outletId, page = 1, limit = 20, status = null, platform = null, startDate = null, endDate = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(platform && { platform }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    const response = await this.api.get(`/?${params}`);
    return response.data;
  }

  async getOnlineOrder(orderId) {
    const response = await this.api.get(`/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(orderId, status, notes = '') {
    const response = await this.api.patch(`/${orderId}/status`, {
      status,
      notes
    });
    return response.data;
  }

  async cancelOrder(orderId, reason, refundAmount = null) {
    const response = await this.api.post(`/${orderId}/cancel`, {
      reason,
      refundAmount
    });
    return response.data;
  }

  async acceptOrder(orderId, estimatedTime) {
    const response = await this.api.post(`/${orderId}/accept`, {
      estimatedTime
    });
    return response.data;
  }

  async rejectOrder(orderId, reason) {
    const response = await this.api.post(`/${orderId}/reject`, {
      reason
    });
    return response.data;
  }

  // Delivery Management
  async getDeliveryOrders(outletId, status = null, page = 1, limit = 20) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/delivery?${params}`);
    return response.data;
  }

  async assignDeliveryPartner(orderId, partnerId) {
    const response = await this.api.post(`/${orderId}/delivery/assign`, {
      partnerId
    });
    return response.data;
  }

  async updateDeliveryStatus(orderId, status, location = null) {
    const response = await this.api.patch(`/${orderId}/delivery/status`, {
      status,
      location
    });
    return response.data;
  }

  async getDeliveryTracking(orderId) {
    const response = await this.api.get(`/${orderId}/delivery/tracking`);
    return response.data;
  }

  async getAvailableDeliveryPartners(outletId) {
    const response = await this.api.get(`/delivery/partners?outletId=${outletId}&available=true`);
    return response.data;
  }

  // Platform Integration Management
  async getPlatformIntegrations(outletId) {
    const response = await this.api.get(`/platforms?outletId=${outletId}`);
    return response.data;
  }

  async updatePlatformIntegration(integrationId, data) {
    const response = await this.api.put(`/platforms/${integrationId}`, data);
    return response.data;
  }

  async togglePlatformIntegration(integrationId, active) {
    const response = await this.api.patch(`/platforms/${integrationId}/toggle`, {
      active
    });
    return response.data;
  }

  async syncPlatformMenu(integrationId) {
    const response = await this.api.post(`/platforms/${integrationId}/sync-menu`);
    return response.data;
  }

  async syncPlatformOrders(integrationId) {
    const response = await this.api.post(`/platforms/${integrationId}/sync-orders`);
    return response.data;
  }

  // Menu Synchronization
  async getOnlineMenu(outletId, platform = null) {
    const params = new URLSearchParams({
      outletId,
      ...(platform && { platform })
    });
    const response = await this.api.get(`/menu?${params}`);
    return response.data;
  }

  async updateOnlineMenuAvailability(outletId, itemId, available, platforms = []) {
    const response = await this.api.patch('/menu/availability', {
      outletId,
      itemId,
      available,
      platforms
    });
    return response.data;
  }

  async updateOnlineMenuPricing(outletId, itemId, pricing, platforms = []) {
    const response = await this.api.patch('/menu/pricing', {
      outletId,
      itemId,
      pricing,
      platforms
    });
    return response.data;
  }

  async bulkUpdateOnlineMenu(outletId, updates, platforms = []) {
    const response = await this.api.post('/menu/bulk-update', {
      outletId,
      updates,
      platforms
    });
    return response.data;
  }

  // Customer Management
  async getOnlineCustomers(outletId, page = 1, limit = 20, platform = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(platform && { platform })
    });
    const response = await this.api.get(`/customers?${params}`);
    return response.data;
  }

  async getCustomerOrderHistory(customerId, page = 1, limit = 10) {
    const response = await this.api.get(`/customers/${customerId}/orders?page=${page}&limit=${limit}`);
    return response.data;
  }

  async blockCustomer(customerId, reason) {
    const response = await this.api.post(`/customers/${customerId}/block`, {
      reason
    });
    return response.data;
  }

  async unblockCustomer(customerId) {
    const response = await this.api.post(`/customers/${customerId}/unblock`);
    return response.data;
  }

  // Promotions and Discounts
  async getOnlinePromotions(outletId, active = true) {
    const response = await this.api.get(`/promotions?outletId=${outletId}&active=${active}`);
    return response.data;
  }

  async createPromotion(promotionData) {
    const response = await this.api.post('/promotions', promotionData);
    return response.data;
  }

  async updatePromotion(promotionId, data) {
    const response = await this.api.put(`/promotions/${promotionId}`, data);
    return response.data;
  }

  async togglePromotion(promotionId, active) {
    const response = await this.api.patch(`/promotions/${promotionId}/toggle`, {
      active
    });
    return response.data;
  }

  async deletePromotion(promotionId) {
    const response = await this.api.delete(`/promotions/${promotionId}`);
    return response.data;
  }

  async getPromotionAnalytics(promotionId, period = '30d') {
    const response = await this.api.get(`/promotions/${promotionId}/analytics?period=${period}`);
    return response.data;
  }

  // Order Queue Management
  async getOrderQueue(outletId, status = 'pending') {
    const response = await this.api.get(`/queue?outletId=${outletId}&status=${status}`);
    return response.data;
  }

  async updateQueuePosition(orderId, position) {
    const response = await this.api.patch(`/${orderId}/queue-position`, {
      position
    });
    return response.data;
  }

  async getQueueSettings(outletId) {
    const response = await this.api.get(`/queue/settings?outletId=${outletId}`);
    return response.data;
  }

  async updateQueueSettings(outletId, settings) {
    const response = await this.api.put('/queue/settings', {
      outletId,
      ...settings
    });
    return response.data;
  }

  // Analytics and Reporting
  async getOnlineOrderAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getPlatformPerformance(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/platforms?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getDeliveryAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/delivery?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getCustomerAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/customers?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getRevenueAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/revenue?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Commission and Fees
  async getCommissionReport(outletId, startDate, endDate, platform = null) {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      ...(platform && { platform })
    });
    const response = await this.api.get(`/commission/report?${params}`);
    return response.data;
  }

  async getFeesBreakdown(outletId, period = '30d') {
    const response = await this.api.get(`/commission/fees?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Reviews and Ratings
  async getOnlineReviews(outletId, page = 1, limit = 20, platform = null, rating = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(platform && { platform }),
      ...(rating && { rating: rating.toString() })
    });
    const response = await this.api.get(`/reviews?${params}`);
    return response.data;
  }

  async respondToReview(reviewId, response) {
    const responseData = await this.api.post(`/reviews/${reviewId}/respond`, {
      response
    });
    return responseData.data;
  }

  async flagReview(reviewId, reason) {
    const response = await this.api.post(`/reviews/${reviewId}/flag`, {
      reason
    });
    return response.data;
  }

  async getReviewsAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/reviews/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Notifications
  async getOrderNotifications(outletId, page = 1, limit = 20, read = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(read !== null && { read: read.toString() })
    });
    const response = await this.api.get(`/notifications?${params}`);
    return response.data;
  }

  async markNotificationAsRead(notificationId) {
    const response = await this.api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(outletId) {
    const response = await this.api.patch('/notifications/read-all', {
      outletId
    });
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateOrderStatus(orderIds, status, notes = '') {
    const response = await this.api.post('/bulk/update-status', {
      orderIds,
      status,
      notes
    });
    return response.data;
  }

  async exportOrders(outletId, startDate, endDate, format = 'csv', platform = null) {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      format,
      ...(platform && { platform })
    });
    const response = await this.api.get(`/export?${params}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Settings
  async getOnlineOrderSettings(outletId) {
    const response = await this.api.get(`/settings?outletId=${outletId}`);
    return response.data;
  }

  async updateOnlineOrderSettings(outletId, settings) {
    const response = await this.api.put('/settings', {
      outletId,
      ...settings
    });
    return response.data;
  }
}

export default OnlineOrderService;
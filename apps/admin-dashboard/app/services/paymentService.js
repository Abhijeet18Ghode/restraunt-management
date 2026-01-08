import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class PaymentService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/payments`,
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

  // Payment Transaction Management
  async getPayments(outletId, page = 1, limit = 20, status = null, method = null, startDate = null, endDate = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(method && { method }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    const response = await this.api.get(`/?${params}`);
    return response.data;
  }

  async getPayment(paymentId) {
    const response = await this.api.get(`/${paymentId}`);
    return response.data;
  }

  async processPayment(paymentData) {
    const response = await this.api.post('/process', paymentData);
    return response.data;
  }

  async refundPayment(paymentId, refundData) {
    const response = await this.api.post(`/${paymentId}/refund`, refundData);
    return response.data;
  }

  async voidPayment(paymentId, reason) {
    const response = await this.api.post(`/${paymentId}/void`, { reason });
    return response.data;
  }

  async capturePayment(paymentId, amount = null) {
    const response = await this.api.post(`/${paymentId}/capture`, { amount });
    return response.data;
  }

  // Payment Methods Management
  async getPaymentMethods(outletId, active = true) {
    const response = await this.api.get(`/methods?outletId=${outletId}&active=${active}`);
    return response.data;
  }

  async createPaymentMethod(methodData) {
    const response = await this.api.post('/methods', methodData);
    return response.data;
  }

  async updatePaymentMethod(methodId, data) {
    const response = await this.api.put(`/methods/${methodId}`, data);
    return response.data;
  }

  async togglePaymentMethod(methodId, active) {
    const response = await this.api.patch(`/methods/${methodId}/toggle`, { active });
    return response.data;
  }

  async deletePaymentMethod(methodId) {
    const response = await this.api.delete(`/methods/${methodId}`);
    return response.data;
  }

  // Gateway Configuration
  async getGatewayConfigs(outletId) {
    const response = await this.api.get(`/gateways?outletId=${outletId}`);
    return response.data;
  }

  async createGatewayConfig(configData) {
    const response = await this.api.post('/gateways', configData);
    return response.data;
  }

  async updateGatewayConfig(configId, data) {
    const response = await this.api.put(`/gateways/${configId}`, data);
    return response.data;
  }

  async testGatewayConnection(configId) {
    const response = await this.api.post(`/gateways/${configId}/test`);
    return response.data;
  }

  async toggleGateway(configId, active) {
    const response = await this.api.patch(`/gateways/${configId}/toggle`, { active });
    return response.data;
  }

  // Settlement Management
  async getSettlements(outletId, page = 1, limit = 20, status = null, startDate = null, endDate = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    const response = await this.api.get(`/settlements?${params}`);
    return response.data;
  }

  async getSettlement(settlementId) {
    const response = await this.api.get(`/settlements/${settlementId}`);
    return response.data;
  }

  async initiateSettlement(outletId, settlementData) {
    const response = await this.api.post('/settlements', {
      outletId,
      ...settlementData
    });
    return response.data;
  }

  async getSettlementReport(outletId, startDate, endDate) {
    const response = await this.api.get(`/settlements/report?outletId=${outletId}&startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  }

  // Dispute Management
  async getDisputes(outletId, page = 1, limit = 20, status = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/disputes?${params}`);
    return response.data;
  }

  async getDispute(disputeId) {
    const response = await this.api.get(`/disputes/${disputeId}`);
    return response.data;
  }

  async respondToDispute(disputeId, responseData) {
    const response = await this.api.post(`/disputes/${disputeId}/respond`, responseData);
    return response.data;
  }

  async uploadDisputeEvidence(disputeId, evidence) {
    const formData = new FormData();
    formData.append('file', evidence);
    
    const response = await this.api.post(`/disputes/${disputeId}/evidence`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Recurring Payments
  async getSubscriptions(outletId, page = 1, limit = 20, status = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/subscriptions?${params}`);
    return response.data;
  }

  async createSubscription(subscriptionData) {
    const response = await this.api.post('/subscriptions', subscriptionData);
    return response.data;
  }

  async updateSubscription(subscriptionId, data) {
    const response = await this.api.put(`/subscriptions/${subscriptionId}`, data);
    return response.data;
  }

  async cancelSubscription(subscriptionId, reason) {
    const response = await this.api.post(`/subscriptions/${subscriptionId}/cancel`, { reason });
    return response.data;
  }

  async pauseSubscription(subscriptionId, pauseData) {
    const response = await this.api.post(`/subscriptions/${subscriptionId}/pause`, pauseData);
    return response.data;
  }

  async resumeSubscription(subscriptionId) {
    const response = await this.api.post(`/subscriptions/${subscriptionId}/resume`);
    return response.data;
  }

  // Payment Analytics
  async getPaymentAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getPaymentMethodAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/methods?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getFailureAnalysis(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/failures?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getRevenueAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/revenue?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getChargebackAnalysis(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/chargebacks?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Fraud Detection
  async getFraudAlerts(outletId, page = 1, limit = 20, status = 'active') {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      status
    });
    const response = await this.api.get(`/fraud/alerts?${params}`);
    return response.data;
  }

  async reviewFraudAlert(alertId, action, notes = '') {
    const response = await this.api.post(`/fraud/alerts/${alertId}/review`, {
      action,
      notes
    });
    return response.data;
  }

  async getFraudSettings(outletId) {
    const response = await this.api.get(`/fraud/settings?outletId=${outletId}`);
    return response.data;
  }

  async updateFraudSettings(outletId, settings) {
    const response = await this.api.put(`/fraud/settings`, {
      outletId,
      ...settings
    });
    return response.data;
  }

  // Compliance and Reporting
  async getComplianceReport(outletId, reportType, startDate, endDate) {
    const params = new URLSearchParams({
      outletId,
      reportType,
      startDate,
      endDate
    });
    const response = await this.api.get(`/compliance/report?${params}`);
    return response.data;
  }

  async getTaxReport(outletId, startDate, endDate, taxType = null) {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      ...(taxType && { taxType })
    });
    const response = await this.api.get(`/tax/report?${params}`);
    return response.data;
  }

  async getAuditLog(outletId, page = 1, limit = 20, action = null) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(action && { action })
    });
    const response = await this.api.get(`/audit?${params}`);
    return response.data;
  }

  // Bulk Operations
  async bulkRefund(refundData) {
    const response = await this.api.post('/bulk/refund', refundData);
    return response.data;
  }

  async exportPayments(outletId, startDate, endDate, format = 'csv') {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      format
    });
    const response = await this.api.get(`/export?${params}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async reconcilePayments(outletId, reconciliationData) {
    const response = await this.api.post('/reconcile', {
      outletId,
      ...reconciliationData
    });
    return response.data;
  }
}

export default PaymentService;
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
        document.cookie.split('; ').find(row => row.startsWith('pos_auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Payment Processing (POS-focused)
  async processPayment(paymentData) {
    const response = await this.api.post('/process', paymentData);
    return response.data;
  }

  async processCardPayment(cardData) {
    const response = await this.api.post('/process/card', cardData);
    return response.data;
  }

  async processCashPayment(cashData) {
    const response = await this.api.post('/process/cash', cashData);
    return response.data;
  }

  async processDigitalWalletPayment(walletData) {
    const response = await this.api.post('/process/digital-wallet', walletData);
    return response.data;
  }

  async processUPIPayment(upiData) {
    const response = await this.api.post('/process/upi', upiData);
    return response.data;
  }

  async processContactlessPayment(contactlessData) {
    const response = await this.api.post('/process/contactless', contactlessData);
    return response.data;
  }

  // Split Payment Processing
  async processSplitPayment(splitPaymentData) {
    const response = await this.api.post('/process/split', splitPaymentData);
    return response.data;
  }

  async addSplitPaymentMethod(paymentId, paymentMethodData) {
    const response = await this.api.post(`/${paymentId}/split/add`, paymentMethodData);
    return response.data;
  }

  async completeSplitPayment(paymentId) {
    const response = await this.api.post(`/${paymentId}/split/complete`);
    return response.data;
  }

  // Payment Status and Verification
  async getPaymentStatus(paymentId) {
    const response = await this.api.get(`/${paymentId}/status`);
    return response.data;
  }

  async verifyPayment(paymentId) {
    const response = await this.api.post(`/${paymentId}/verify`);
    return response.data;
  }

  async cancelPayment(paymentId, reason) {
    const response = await this.api.post(`/${paymentId}/cancel`, { reason });
    return response.data;
  }

  // Refund Processing
  async processRefund(paymentId, refundData) {
    const response = await this.api.post(`/${paymentId}/refund`, refundData);
    return response.data;
  }

  async processPartialRefund(paymentId, amount, reason) {
    const response = await this.api.post(`/${paymentId}/refund/partial`, {
      amount,
      reason
    });
    return response.data;
  }

  async getRefundStatus(refundId) {
    const response = await this.api.get(`/refunds/${refundId}/status`);
    return response.data;
  }

  // Payment Methods
  async getAvailablePaymentMethods(outletId) {
    const response = await this.api.get(`/methods?outletId=${outletId}&active=true`);
    return response.data;
  }

  async validatePaymentMethod(methodId, amount) {
    const response = await this.api.post(`/methods/${methodId}/validate`, {
      amount
    });
    return response.data;
  }

  async getPaymentMethodFees(methodId, amount) {
    const response = await this.api.get(`/methods/${methodId}/fees?amount=${amount}`);
    return response.data;
  }

  // Terminal Integration
  async initializeTerminal(terminalId) {
    const response = await this.api.post('/terminal/initialize', {
      terminalId
    });
    return response.data;
  }

  async getTerminalStatus(terminalId) {
    const response = await this.api.get(`/terminal/${terminalId}/status`);
    return response.data;
  }

  async processTerminalPayment(terminalId, paymentData) {
    const response = await this.api.post(`/terminal/${terminalId}/process`, paymentData);
    return response.data;
  }

  async cancelTerminalTransaction(terminalId, transactionId) {
    const response = await this.api.post(`/terminal/${terminalId}/cancel`, {
      transactionId
    });
    return response.data;
  }

  // Receipt Management
  async generateReceipt(paymentId, receiptType = 'customer') {
    const response = await this.api.post(`/${paymentId}/receipt`, {
      type: receiptType
    });
    return response.data;
  }

  async printReceipt(paymentId, printerId) {
    const response = await this.api.post(`/${paymentId}/print`, {
      printerId
    });
    return response.data;
  }

  async emailReceipt(paymentId, email) {
    const response = await this.api.post(`/${paymentId}/email`, {
      email
    });
    return response.data;
  }

  async smsReceipt(paymentId, phone) {
    const response = await this.api.post(`/${paymentId}/sms`, {
      phone
    });
    return response.data;
  }

  // Tip Processing
  async addTip(paymentId, tipAmount, tipMethod = 'same') {
    const response = await this.api.post(`/${paymentId}/tip`, {
      amount: tipAmount,
      method: tipMethod
    });
    return response.data;
  }

  async processTipAdjustment(paymentId, newTipAmount) {
    const response = await this.api.post(`/${paymentId}/tip/adjust`, {
      amount: newTipAmount
    });
    return response.data;
  }

  // Loyalty Points Integration
  async processLoyaltyPayment(customerId, points, orderId) {
    const response = await this.api.post('/process/loyalty', {
      customerId,
      points,
      orderId
    });
    return response.data;
  }

  async calculateLoyaltyDiscount(customerId, orderAmount) {
    const response = await this.api.post('/loyalty/calculate', {
      customerId,
      orderAmount
    });
    return response.data;
  }

  // Gift Card Processing
  async processGiftCardPayment(giftCardData) {
    const response = await this.api.post('/process/gift-card', giftCardData);
    return response.data;
  }

  async checkGiftCardBalance(giftCardNumber) {
    const response = await this.api.get(`/gift-cards/${giftCardNumber}/balance`);
    return response.data;
  }

  async activateGiftCard(giftCardData) {
    const response = await this.api.post('/gift-cards/activate', giftCardData);
    return response.data;
  }

  // Discount and Coupon Processing
  async applyCoupon(couponCode, orderAmount, customerId = null) {
    const response = await this.api.post('/coupons/apply', {
      couponCode,
      orderAmount,
      customerId
    });
    return response.data;
  }

  async validateCoupon(couponCode, orderAmount, customerId = null) {
    const response = await this.api.post('/coupons/validate', {
      couponCode,
      orderAmount,
      customerId
    });
    return response.data;
  }

  async removeCoupon(paymentId, couponId) {
    const response = await this.api.delete(`/${paymentId}/coupons/${couponId}`);
    return response.data;
  }

  // Tax Calculation
  async calculateTax(orderData) {
    const response = await this.api.post('/tax/calculate', orderData);
    return response.data;
  }

  async getTaxBreakdown(paymentId) {
    const response = await this.api.get(`/${paymentId}/tax-breakdown`);
    return response.data;
  }

  // Payment Analytics (POS relevant)
  async getDailyPaymentSummary(outletId, date = null) {
    const dateParam = date || new Date().toISOString().split('T')[0];
    const response = await this.api.get(`/analytics/daily?outletId=${outletId}&date=${dateParam}`);
    return response.data;
  }

  async getPaymentMethodBreakdown(outletId, period = 'today') {
    const response = await this.api.get(`/analytics/methods?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getFailedPayments(outletId, date = null) {
    const dateParam = date || new Date().toISOString().split('T')[0];
    const response = await this.api.get(`/analytics/failures?outletId=${outletId}&date=${dateParam}`);
    return response.data;
  }

  // Offline Payment Support
  async storeOfflinePayment(paymentData) {
    const response = await this.api.post('/offline/store', paymentData);
    return response.data;
  }

  async syncOfflinePayments(payments) {
    const response = await this.api.post('/offline/sync', {
      payments
    });
    return response.data;
  }

  async getOfflinePayments(outletId) {
    const response = await this.api.get(`/offline?outletId=${outletId}`);
    return response.data;
  }

  // Settlement and Reconciliation
  async getDailySettlement(outletId, date = null) {
    const dateParam = date || new Date().toISOString().split('T')[0];
    const response = await this.api.get(`/settlement/daily?outletId=${outletId}&date=${dateParam}`);
    return response.data;
  }

  async reconcilePayments(outletId, reconciliationData) {
    const response = await this.api.post('/reconcile', {
      outletId,
      ...reconciliationData
    });
    return response.data;
  }

  // Error Handling and Retry
  async retryFailedPayment(paymentId) {
    const response = await this.api.post(`/${paymentId}/retry`);
    return response.data;
  }

  async getPaymentErrors(outletId, date = null) {
    const dateParam = date || new Date().toISOString().split('T')[0];
    const response = await this.api.get(`/errors?outletId=${outletId}&date=${dateParam}`);
    return response.data;
  }
}

export default PaymentService;
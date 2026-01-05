const stripe = require('stripe');
const axios = require('axios');

class PaymentGatewayService {
  constructor() {
    this.gateways = {};
    this._initializeGateways();
  }

  _initializeGateways() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.gateways.stripe = stripe(process.env.STRIPE_SECRET_KEY);
    }

    // Initialize PayPal (mock implementation)
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      this.gateways.paypal = {
        clientId: process.env.PAYPAL_CLIENT_ID,
        clientSecret: process.env.PAYPAL_CLIENT_SECRET,
        mode: process.env.PAYPAL_MODE || 'sandbox'
      };
    }

    // Initialize Razorpay (mock implementation)
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.gateways.razorpay = {
        keyId: process.env.RAZORPAY_KEY_ID,
        keySecret: process.env.RAZORPAY_KEY_SECRET
      };
    }

    // Initialize Square (mock implementation)
    if (process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_ACCESS_TOKEN) {
      this.gateways.square = {
        applicationId: process.env.SQUARE_APPLICATION_ID,
        accessToken: process.env.SQUARE_ACCESS_TOKEN,
        environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
      };
    }
  }

  getAvailableGateways() {
    return Object.keys(this.gateways);
  }

  async processStripePayment(paymentData) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    const { amount, currency, paymentMethodId, customerId, metadata } = paymentData;

    try {
      const paymentIntent = await this.gateways.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        customer: customerId,
        metadata: metadata,
        confirm: true,
        return_url: 'https://your-website.com/return'
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
        status: this._mapStripeStatus(paymentIntent.status),
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        type: error.type
      };
    }
  }

  async processPayPalPayment(paymentData) {
    if (!this.gateways.paypal) {
      throw new Error('PayPal gateway not configured');
    }

    // Mock PayPal implementation
    // In real implementation, use PayPal SDK
    const { amount, currency, orderId } = paymentData;

    try {
      // Simulate PayPal API call
      const mockResponse = {
        id: `PAYPAL_${Date.now()}`,
        status: 'COMPLETED',
        amount: { value: amount.toString(), currency_code: currency },
        create_time: new Date().toISOString()
      };

      return {
        success: true,
        transactionId: mockResponse.id,
        status: 'COMPLETED',
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processRazorpayPayment(paymentData) {
    if (!this.gateways.razorpay) {
      throw new Error('Razorpay gateway not configured');
    }

    // Mock Razorpay implementation
    // In real implementation, use Razorpay SDK
    const { amount, currency, orderId } = paymentData;

    try {
      // Simulate Razorpay API call
      const mockResponse = {
        id: `razorpay_${Date.now()}`,
        status: 'captured',
        amount: amount * 100, // Razorpay uses paise
        currency: currency,
        order_id: orderId
      };

      return {
        success: true,
        transactionId: mockResponse.id,
        status: 'COMPLETED',
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processSquarePayment(paymentData) {
    if (!this.gateways.square) {
      throw new Error('Square gateway not configured');
    }

    // Mock Square implementation
    // In real implementation, use Square SDK
    const { amount, currency, sourceId } = paymentData;

    try {
      // Simulate Square API call
      const mockResponse = {
        id: `square_${Date.now()}`,
        status: 'COMPLETED',
        amount_money: {
          amount: amount * 100, // Square uses cents
          currency: currency
        },
        source_type: 'CARD'
      };

      return {
        success: true,
        transactionId: mockResponse.id,
        status: 'COMPLETED',
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createStripeCustomer(customerData) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    try {
      const customer = await this.gateways.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: customerData.metadata || {}
      });

      return {
        success: true,
        customerId: customer.id,
        customer: customer
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createStripePaymentMethod(paymentMethodData) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    try {
      const paymentMethod = await this.gateways.stripe.paymentMethods.create({
        type: 'card',
        card: {
          number: paymentMethodData.cardNumber,
          exp_month: paymentMethodData.expiryMonth,
          exp_year: paymentMethodData.expiryYear,
          cvc: paymentMethodData.cvv
        }
      });

      return {
        success: true,
        paymentMethodId: paymentMethod.id,
        paymentMethod: paymentMethod
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async refundStripePayment(refundData) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    try {
      const refund = await this.gateways.stripe.refunds.create({
        payment_intent: refundData.paymentIntentId,
        amount: refundData.amount ? Math.round(refundData.amount * 100) : undefined,
        reason: refundData.reason || 'requested_by_customer',
        metadata: refundData.metadata || {}
      });

      return {
        success: true,
        refundId: refund.id,
        status: this._mapStripeRefundStatus(refund.status),
        refund: refund
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStripePaymentStatus(paymentIntentId) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    try {
      const paymentIntent = await this.gateways.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        success: true,
        status: this._mapStripeStatus(paymentIntent.status),
        paymentIntent: paymentIntent
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateWebhook(payload, signature, endpointSecret) {
    if (!this.gateways.stripe) {
      throw new Error('Stripe gateway not configured');
    }

    try {
      const event = this.gateways.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );

      return {
        success: true,
        event: event
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gateway-specific utility methods
  _mapStripeStatus(stripeStatus) {
    const statusMap = {
      'requires_payment_method': 'PENDING',
      'requires_confirmation': 'PENDING',
      'requires_action': 'PENDING',
      'processing': 'PROCESSING',
      'requires_capture': 'AUTHORIZED',
      'succeeded': 'COMPLETED',
      'canceled': 'CANCELLED'
    };

    return statusMap[stripeStatus] || 'UNKNOWN';
  }

  _mapStripeRefundStatus(stripeRefundStatus) {
    const statusMap = {
      'pending': 'PENDING',
      'succeeded': 'COMPLETED',
      'failed': 'FAILED',
      'canceled': 'CANCELLED'
    };

    return statusMap[stripeRefundStatus] || 'UNKNOWN';
  }

  // PCI compliance helpers
  maskCardNumber(cardNumber) {
    if (!cardNumber) return '';
    const str = cardNumber.toString().replace(/\s/g, '');
    if (str.length < 8) return '*'.repeat(str.length);
    return str.slice(0, 4) + '*'.repeat(str.length - 8) + str.slice(-4);
  }

  validateCardNumber(cardNumber) {
    // Luhn algorithm for card validation
    const num = cardNumber.toString().replace(/\s/g, '');
    if (!/^\d+$/.test(num)) return false;

    let sum = 0;
    let isEven = false;

    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  getCardType(cardNumber) {
    const num = cardNumber.toString().replace(/\s/g, '');
    
    // Visa
    if (/^4/.test(num)) return 'VISA';
    
    // Mastercard
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'MASTERCARD';
    
    // American Express
    if (/^3[47]/.test(num)) return 'AMEX';
    
    // Discover
    if (/^6(?:011|5)/.test(num)) return 'DISCOVER';
    
    return 'UNKNOWN';
  }

  // Security and compliance
  sanitizePaymentData(paymentData) {
    const sanitized = { ...paymentData };
    
    if (sanitized.cardNumber) {
      sanitized.cardNumber = this.maskCardNumber(sanitized.cardNumber);
    }
    
    if (sanitized.cvv) {
      sanitized.cvv = '***';
    }
    
    if (sanitized.paymentDetails) {
      if (sanitized.paymentDetails.cardNumber) {
        sanitized.paymentDetails.cardNumber = this.maskCardNumber(sanitized.paymentDetails.cardNumber);
      }
      if (sanitized.paymentDetails.cvv) {
        sanitized.paymentDetails.cvv = '***';
      }
    }
    
    return sanitized;
  }

  // Rate limiting for payment attempts
  async checkRateLimit(identifier, maxAttempts = 5, windowMinutes = 15) {
    // In a real implementation, use Redis or similar for rate limiting
    // This is a simplified mock
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetTime: new Date(Date.now() + windowMinutes * 60 * 1000)
    };
  }
}

module.exports = PaymentGatewayService;
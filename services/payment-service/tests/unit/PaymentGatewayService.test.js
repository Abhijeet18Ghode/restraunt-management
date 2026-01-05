const PaymentGatewayService = require('../../src/services/PaymentGatewayService');

describe('PaymentGatewayService', () => {
  let gatewayService;

  beforeAll(() => {
    gatewayService = new PaymentGatewayService();
  });

  describe('initialization', () => {
    it('should initialize gateway service successfully', () => {
      expect(gatewayService).toBeDefined();
      expect(gatewayService.gateways).toBeDefined();
    });

    it('should return available gateways', () => {
      const availableGateways = gatewayService.getAvailableGateways();
      expect(Array.isArray(availableGateways)).toBe(true);
    });
  });

  describe('card validation', () => {
    it('should validate card numbers using Luhn algorithm', () => {
      // Valid test card numbers
      expect(gatewayService.validateCardNumber('4242424242424242')).toBe(true); // Visa
      expect(gatewayService.validateCardNumber('5555555555554444')).toBe(true); // Mastercard
      expect(gatewayService.validateCardNumber('378282246310005')).toBe(true);  // Amex

      // Invalid card numbers
      expect(gatewayService.validateCardNumber('4242424242424241')).toBe(false);
      expect(gatewayService.validateCardNumber('1234567890123456')).toBe(false);
      expect(gatewayService.validateCardNumber('invalid')).toBe(false);
      expect(gatewayService.validateCardNumber('')).toBe(false);
    });

    it('should identify card types correctly', () => {
      expect(gatewayService.getCardType('4242424242424242')).toBe('VISA');
      expect(gatewayService.getCardType('5555555555554444')).toBe('MASTERCARD');
      expect(gatewayService.getCardType('378282246310005')).toBe('AMEX');
      expect(gatewayService.getCardType('6011111111111117')).toBe('DISCOVER');
      expect(gatewayService.getCardType('1234567890123456')).toBe('UNKNOWN');
    });

    it('should mask card numbers for security', () => {
      expect(gatewayService.maskCardNumber('4242424242424242')).toBe('4242********4242');
      expect(gatewayService.maskCardNumber('5555555555554444')).toBe('5555********4444');
      expect(gatewayService.maskCardNumber('378282246310005')).toBe('3782*******0005');
      expect(gatewayService.maskCardNumber('123')).toBe('***');
      expect(gatewayService.maskCardNumber('')).toBe('');
    });
  });

  describe('PayPal payment processing', () => {
    it('should process PayPal payment successfully', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        orderId: 'ORDER-001'
      };

      const result = await gatewayService.processPayPalPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.gatewayResponse).toBeDefined();
    });
  });

  describe('Razorpay payment processing', () => {
    it('should process Razorpay payment successfully', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'INR',
        orderId: 'ORDER-002'
      };

      const result = await gatewayService.processRazorpayPayment(paymentData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.gatewayResponse).toBeDefined();
    });
  });

  describe('Square payment processing', () => {
    it('should process Square payment successfully', async () => {
      const paymentData = {
        amount: 100.00,
        currency: 'USD',
        sourceId: 'SQUARE-SOURCE-001'
      };

      const result = await gatewayService.processSquarePayment(paymentData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.gatewayResponse).toBeDefined();
    });
  });

  describe('data sanitization', () => {
    it('should sanitize payment data for logging', () => {
      const paymentData = {
        amount: 100.00,
        cardNumber: '4242424242424242',
        cvv: '123',
        paymentDetails: {
          cardNumber: '5555555555554444',
          cvv: '456',
          expiryMonth: 12,
          expiryYear: 2025
        },
        customerName: 'John Doe'
      };

      const sanitized = gatewayService.sanitizePaymentData(paymentData);

      expect(sanitized.amount).toBe(100.00);
      expect(sanitized.customerName).toBe('John Doe');
      expect(sanitized.cardNumber).toBe('4242********4242');
      expect(sanitized.cvv).toBe('***');
      expect(sanitized.paymentDetails.cardNumber).toBe('5555********4444');
      expect(sanitized.paymentDetails.cvv).toBe('***');
      expect(sanitized.paymentDetails.expiryMonth).toBe(12);
      expect(sanitized.paymentDetails.expiryYear).toBe(2025);
    });
  });

  describe('rate limiting', () => {
    it('should check rate limits', async () => {
      const rateLimit = await gatewayService.checkRateLimit('test-user-1');

      expect(rateLimit).toBeDefined();
      expect(rateLimit.allowed).toBeDefined();
      expect(typeof rateLimit.allowed).toBe('boolean');
      expect(rateLimit.remaining).toBeDefined();
      expect(rateLimit.resetTime).toBeDefined();
    });
  });

  describe('Stripe status mapping', () => {
    it('should map Stripe statuses correctly', () => {
      expect(gatewayService._mapStripeStatus('succeeded')).toBe('COMPLETED');
      expect(gatewayService._mapStripeStatus('requires_payment_method')).toBe('PENDING');
      expect(gatewayService._mapStripeStatus('processing')).toBe('PROCESSING');
      expect(gatewayService._mapStripeStatus('requires_capture')).toBe('AUTHORIZED');
      expect(gatewayService._mapStripeStatus('canceled')).toBe('CANCELLED');
      expect(gatewayService._mapStripeStatus('unknown_status')).toBe('UNKNOWN');
    });

    it('should map Stripe refund statuses correctly', () => {
      expect(gatewayService._mapStripeRefundStatus('succeeded')).toBe('COMPLETED');
      expect(gatewayService._mapStripeRefundStatus('pending')).toBe('PENDING');
      expect(gatewayService._mapStripeRefundStatus('failed')).toBe('FAILED');
      expect(gatewayService._mapStripeRefundStatus('canceled')).toBe('CANCELLED');
      expect(gatewayService._mapStripeRefundStatus('unknown_status')).toBe('UNKNOWN');
    });
  });

  describe('error handling', () => {
    it('should handle missing gateway configuration', async () => {
      // Test with service that has no gateways configured
      const emptyGatewayService = new PaymentGatewayService();
      emptyGatewayService.gateways = {}; // Clear all gateways

      await expect(
        emptyGatewayService.processStripePayment({ amount: 100 })
      ).rejects.toThrow('Stripe gateway not configured');

      await expect(
        emptyGatewayService.processPayPalPayment({ amount: 100 })
      ).rejects.toThrow('PayPal gateway not configured');

      await expect(
        emptyGatewayService.processRazorpayPayment({ amount: 100 })
      ).rejects.toThrow('Razorpay gateway not configured');

      await expect(
        emptyGatewayService.processSquarePayment({ amount: 100 })
      ).rejects.toThrow('Square gateway not configured');
    });
  });

  describe('card number validation edge cases', () => {
    it('should handle card numbers with spaces', () => {
      expect(gatewayService.validateCardNumber('4242 4242 4242 4242')).toBe(true);
      expect(gatewayService.maskCardNumber('4242 4242 4242 4242')).toBe('4242********4242');
      expect(gatewayService.getCardType('4242 4242 4242 4242')).toBe('VISA');
    });

    it('should handle short card numbers', () => {
      expect(gatewayService.validateCardNumber('123')).toBe(false);
      expect(gatewayService.maskCardNumber('123')).toBe('***');
      expect(gatewayService.getCardType('123')).toBe('UNKNOWN');
    });

    it('should handle null and undefined inputs', () => {
      expect(gatewayService.validateCardNumber(null)).toBe(false);
      expect(gatewayService.validateCardNumber(undefined)).toBe(false);
      expect(gatewayService.maskCardNumber(null)).toBe('');
      expect(gatewayService.maskCardNumber(undefined)).toBe('');
    });
  });
});
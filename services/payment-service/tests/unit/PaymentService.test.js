const PaymentService = require('../../src/services/PaymentService');
const PaymentGatewayService = require('../../src/services/PaymentGatewayService');

describe('PaymentService', () => {
  let paymentService;
  let gatewayService;
  let testTenantId;

  beforeAll(() => {
    gatewayService = new PaymentGatewayService();
    paymentService = new PaymentService(global.dbPool, gatewayService.gateways);
    testTenantId = 'test_tenant_1';
  });

  describe('processPayment', () => {
    it('should process cash payment successfully', async () => {
      // Create test order
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'CASH-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-1',
        subtotal: 50.00,
        tax: 5.00,
        total: 55.00
      });

      const paymentData = {
        orderId: order.id,
        amount: 55.00,
        currency: 'USD',
        paymentMethod: 'CASH',
        customerId: 'customer-1',
        outletId: 'test-outlet-1'
      };

      const result = await paymentService.processPayment(testTenantId, paymentData);

      expect(result).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(55.00);
      expect(result.currency).toBe('USD');
      expect(result.paymentMethod).toBe('CASH');
      expect(result.receipt).toBeDefined();
    });

    it('should process digital wallet payment successfully', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'WALLET-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-2',
        subtotal: 75.00,
        tax: 7.50,
        total: 82.50
      });

      const paymentData = {
        orderId: order.id,
        amount: 82.50,
        currency: 'USD',
        paymentMethod: 'DIGITAL_WALLET',
        paymentDetails: {
          walletType: 'PAYPAL'
        },
        customerId: 'customer-2',
        outletId: 'test-outlet-1'
      };

      const result = await paymentService.processPayment(testTenantId, paymentData);

      expect(result).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(82.50);
      expect(result.paymentMethod).toBe('DIGITAL_WALLET');
    });

    it('should handle bank transfer payment with pending status', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'BANK-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-3',
        subtotal: 100.00,
        tax: 10.00,
        total: 110.00
      });

      const paymentData = {
        orderId: order.id,
        amount: 110.00,
        currency: 'USD',
        paymentMethod: 'BANK_TRANSFER',
        customerId: 'customer-3',
        outletId: 'test-outlet-1'
      };

      const result = await paymentService.processPayment(testTenantId, paymentData);

      expect(result).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(result.amount).toBe(110.00);
      expect(result.paymentMethod).toBe('BANK_TRANSFER');
    });

    it('should throw error for invalid payment data', async () => {
      const invalidPaymentData = {
        // Missing required fields
        amount: 50.00,
        paymentMethod: 'CASH'
      };

      await expect(
        paymentService.processPayment(testTenantId, invalidPaymentData)
      ).rejects.toThrow('Order ID is required');
    });

    it('should throw error for invalid payment method', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'INVALID-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-4',
        subtotal: 25.00,
        tax: 2.50,
        total: 27.50
      });

      const paymentData = {
        orderId: order.id,
        amount: 27.50,
        currency: 'USD',
        paymentMethod: 'INVALID_METHOD',
        customerId: 'customer-4',
        outletId: 'test-outlet-1'
      };

      await expect(
        paymentService.processPayment(testTenantId, paymentData)
      ).rejects.toThrow('Invalid payment method');
    });

    it('should validate card details for card payments', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'CARD-INVALID-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-5',
        subtotal: 30.00,
        tax: 3.00,
        total: 33.00
      });

      const paymentData = {
        orderId: order.id,
        amount: 33.00,
        currency: 'USD',
        paymentMethod: 'CREDIT_CARD',
        paymentDetails: {
          // Missing required card details
          cardNumber: '4242424242424242'
          // Missing expiryMonth, expiryYear, cvv
        },
        customerId: 'customer-5',
        outletId: 'test-outlet-1'
      };

      await expect(
        paymentService.processPayment(testTenantId, paymentData)
      ).rejects.toThrow('Complete card details are required');
    });
  });

  describe('refundPayment', () => {
    it('should process cash refund successfully', async () => {
      // First create a completed payment
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'REFUND-CASH-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-6',
        subtotal: 40.00,
        tax: 4.00,
        total: 44.00
      });

      const payment = await global.createTestPayment(testTenantId, {
        transactionId: 'TXN_CASH_REFUND_001',
        orderId: order.id,
        amount: 44.00,
        paymentMethod: 'CASH',
        customerId: 'customer-6',
        outletId: 'test-outlet-1',
        status: 'COMPLETED',
        gatewayTransactionId: 'CASH_TXN_001'
      });

      const refundData = {
        transactionId: payment.transaction_id,
        amount: 44.00,
        reason: 'Customer request',
        refundedBy: 'manager-1'
      };

      const result = await paymentService.refundPayment(testTenantId, refundData);

      expect(result).toBeDefined();
      expect(result.refundTransactionId).toBeDefined();
      expect(result.originalTransactionId).toBe(payment.transaction_id);
      expect(result.amount).toBe(44.00);
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error for non-existent payment', async () => {
      const refundData = {
        transactionId: 'NON_EXISTENT_TXN',
        amount: 50.00,
        reason: 'Test refund'
      };

      await expect(
        paymentService.refundPayment(testTenantId, refundData)
      ).rejects.toThrow('Original payment not found');
    });

    it('should throw error for incomplete payment refund', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'REFUND-PENDING-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-7',
        subtotal: 60.00,
        tax: 6.00,
        total: 66.00
      });

      const payment = await global.createTestPayment(testTenantId, {
        transactionId: 'TXN_PENDING_REFUND_001',
        orderId: order.id,
        amount: 66.00,
        paymentMethod: 'BANK_TRANSFER',
        customerId: 'customer-7',
        outletId: 'test-outlet-1',
        status: 'PENDING' // Not completed
      });

      const refundData = {
        transactionId: payment.transaction_id,
        amount: 66.00,
        reason: 'Customer request'
      };

      await expect(
        paymentService.refundPayment(testTenantId, refundData)
      ).rejects.toThrow('Cannot refund incomplete payment');
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment status successfully', async () => {
      const order = await global.createTestOrder(testTenantId, {
        orderNumber: 'STATUS-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-8',
        subtotal: 35.00,
        tax: 3.50,
        total: 38.50
      });

      const payment = await global.createTestPayment(testTenantId, {
        transactionId: 'TXN_STATUS_001',
        orderId: order.id,
        amount: 38.50,
        paymentMethod: 'CASH',
        customerId: 'customer-8',
        outletId: 'test-outlet-1',
        status: 'COMPLETED'
      });

      const status = await paymentService.getPaymentStatus(testTenantId, payment.transaction_id);

      expect(status).toBeDefined();
      expect(status.transactionId).toBe(payment.transaction_id);
      expect(status.orderId).toBe(order.id);
      expect(status.amount).toBe(38.50);
      expect(status.paymentMethod).toBe('CASH');
      expect(status.status).toBe('COMPLETED');
    });

    it('should throw error for non-existent payment', async () => {
      await expect(
        paymentService.getPaymentStatus(testTenantId, 'NON_EXISTENT_TXN')
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getTransactionHistory', () => {
    it('should retrieve transaction history with filters', async () => {
      // Create multiple test payments
      const order1 = await global.createTestOrder(testTenantId, {
        orderNumber: 'HISTORY-001',
        outletId: 'test-outlet-1',
        customerId: 'customer-9',
        subtotal: 25.00,
        tax: 2.50,
        total: 27.50
      });

      const order2 = await global.createTestOrder(testTenantId, {
        orderNumber: 'HISTORY-002',
        outletId: 'test-outlet-1',
        customerId: 'customer-10',
        subtotal: 45.00,
        tax: 4.50,
        total: 49.50
      });

      await global.createTestPayment(testTenantId, {
        transactionId: 'TXN_HISTORY_001',
        orderId: order1.id,
        amount: 27.50,
        paymentMethod: 'CASH',
        customerId: 'customer-9',
        outletId: 'test-outlet-1',
        status: 'COMPLETED'
      });

      await global.createTestPayment(testTenantId, {
        transactionId: 'TXN_HISTORY_002',
        orderId: order2.id,
        amount: 49.50,
        paymentMethod: 'DIGITAL_WALLET',
        customerId: 'customer-10',
        outletId: 'test-outlet-1',
        status: 'COMPLETED'
      });

      const history = await paymentService.getTransactionHistory(testTenantId, {
        paymentMethod: 'CASH',
        limit: 10
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      
      // Should find at least the cash payment we created
      const cashPayment = history.find(tx => tx.transaction_id === 'TXN_HISTORY_001');
      expect(cashPayment).toBeDefined();
      expect(cashPayment.payment_method).toBe('CASH');
    });
  });

  describe('generateReconciliationReport', () => {
    it('should generate reconciliation report for a period', async () => {
      const report = await paymentService.generateReconciliationReport(testTenantId, 'today');

      expect(report).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.paymentSummary).toBeDefined();
      expect(Array.isArray(report.paymentSummary)).toBe(true);
      expect(report.refundSummary).toBeDefined();
      expect(report.generatedAt).toBeDefined();
    });
  });

  describe('helper methods', () => {
    it('should validate payment data correctly', () => {
      const service = new PaymentService(global.dbPool, {});
      
      // Valid payment data should not throw
      expect(() => {
        service._validatePaymentData({
          orderId: 'ORDER-001',
          amount: 50.00,
          paymentMethod: 'CASH'
        });
      }).not.toThrow();

      // Invalid payment data should throw
      expect(() => {
        service._validatePaymentData({
          amount: 50.00,
          paymentMethod: 'CASH'
          // Missing orderId
        });
      }).toThrow('Order ID is required');
    });

    it('should generate unique transaction IDs', () => {
      const service = new PaymentService(global.dbPool, {});
      
      const id1 = service._generateTransactionId();
      const id2 = service._generateTransactionId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^TXN_\d+_[A-Z0-9]{8}$/);
      expect(id2).toMatch(/^TXN_\d+_[A-Z0-9]{8}$/);
    });

    it('should parse periods correctly', () => {
      const service = new PaymentService(global.dbPool, {});
      
      const todayPeriod = service._parsePeriod('today');
      expect(todayPeriod.startDate).toBeDefined();
      expect(todayPeriod.endDate).toBeDefined();
      
      const customPeriod = service._parsePeriod('2024-01-01,2024-01-31');
      expect(customPeriod.startDate).toContain('2024-01-01');
      expect(customPeriod.endDate).toContain('2024-01-31');
    });

    it('should generate correct schema name', () => {
      const service = new PaymentService(global.dbPool, {});
      const schemaName = service._getSchemaName('test_tenant_123');
      expect(schemaName).toBe('tenant_test_tenant_123');
    });
  });
});
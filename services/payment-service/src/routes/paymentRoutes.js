const express = require('express');
const { auth, requireRole, pciCompliance } = require('../middleware/auth');
const PaymentService = require('../services/PaymentService');
const PaymentGatewayService = require('../services/PaymentGatewayService');
const { Pool } = require('pg');

const router = express.Router();

// Database connection
const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Initialize services
const gatewayService = new PaymentGatewayService();
const paymentService = new PaymentService(dbPool, gatewayService.gateways);

// Apply PCI compliance middleware to all routes
router.use(pciCompliance);

// Process payment
router.post('/process', auth, requireRole(['cashier', 'manager', 'admin']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const paymentData = req.body;

    // Validate required fields
    const { orderId, amount, paymentMethod } = paymentData;
    if (!orderId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: orderId, amount, paymentMethod'
      });
    }

    // Check rate limiting
    const rateLimit = await gatewayService.checkRateLimit(`${tenantId}_${req.user.id}`);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: 'Too many payment attempts. Please try again later.',
        resetTime: rateLimit.resetTime
      });
    }

    const result = await paymentService.processPayment(tenantId, paymentData);

    res.json({
      success: true,
      data: result,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get payment status
router.get('/status/:transactionId', auth, async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const tenantId = req.tenantId;

    const status = await paymentService.getPaymentStatus(tenantId, transactionId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// Process refund
router.post('/refund', auth, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const refundData = {
      ...req.body,
      refundedBy: req.user.id
    };

    // Validate required fields
    const { transactionId, amount, reason } = refundData;
    if (!transactionId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, amount, reason'
      });
    }

    const result = await paymentService.refundPayment(tenantId, refundData);

    res.json({
      success: true,
      data: result,
      message: 'Refund processed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction history
router.get('/history', auth, requireRole(['cashier', 'manager', 'admin']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      paymentMethod: req.query.paymentMethod,
      status: req.query.status,
      outletId: req.query.outletId,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    };

    const history = await paymentService.getTransactionHistory(tenantId, filters);

    res.json({
      success: true,
      data: history,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: history.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Generate reconciliation report
router.get('/reconciliation/:period', auth, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const { period } = req.params;
    const tenantId = req.tenantId;

    const report = await paymentService.generateReconciliationReport(tenantId, period);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
});

// Get available payment methods
router.get('/methods', auth, async (req, res, next) => {
  try {
    const availableGateways = gatewayService.getAvailableGateways();
    
    const paymentMethods = [
      {
        method: 'CASH',
        name: 'Cash',
        description: 'Cash payment',
        available: true,
        icon: 'cash'
      },
      {
        method: 'CREDIT_CARD',
        name: 'Credit Card',
        description: 'Credit card payment via Stripe',
        available: availableGateways.includes('stripe'),
        icon: 'credit-card',
        supportedCards: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER']
      },
      {
        method: 'DEBIT_CARD',
        name: 'Debit Card',
        description: 'Debit card payment via Stripe',
        available: availableGateways.includes('stripe'),
        icon: 'debit-card',
        supportedCards: ['VISA', 'MASTERCARD']
      },
      {
        method: 'DIGITAL_WALLET',
        name: 'Digital Wallet',
        description: 'PayPal, Apple Pay, Google Pay',
        available: availableGateways.includes('paypal'),
        icon: 'wallet',
        supportedWallets: ['PAYPAL', 'APPLE_PAY', 'GOOGLE_PAY']
      },
      {
        method: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        description: 'Direct bank transfer',
        available: true,
        icon: 'bank',
        processingTime: '1-3 business days'
      }
    ];

    res.json({
      success: true,
      data: {
        paymentMethods: paymentMethods.filter(method => method.available),
        availableGateways
      }
    });
  } catch (error) {
    next(error);
  }
});

// Validate card number
router.post('/validate-card', auth, async (req, res, next) => {
  try {
    const { cardNumber } = req.body;

    if (!cardNumber) {
      return res.status(400).json({
        success: false,
        error: 'Card number is required'
      });
    }

    const isValid = gatewayService.validateCardNumber(cardNumber);
    const cardType = gatewayService.getCardType(cardNumber);
    const maskedNumber = gatewayService.maskCardNumber(cardNumber);

    res.json({
      success: true,
      data: {
        isValid,
        cardType,
        maskedNumber
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create Stripe customer (for recurring payments)
router.post('/customers', auth, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const customerData = req.body;

    const result = await gatewayService.createStripeCustomer(customerData);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        customerId: result.customerId,
        message: 'Customer created successfully'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Webhook endpoint for payment gateway notifications
router.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    const result = await gatewayService.validateWebhook(req.body, signature, endpointSecret);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    const event = result.event;

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        // Update payment status in database
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        // Update payment status in database
        break;
      case 'refund.created':
        console.log('Refund created:', event.data.object.id);
        // Handle refund notification
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

// Get payment analytics
router.get('/analytics', auth, requireRole(['manager', 'admin']), async (req, res, next) => {
  try {
    const tenantId = req.tenantId;
    const { period = 'today', outletId } = req.query;

    const report = await paymentService.generateReconciliationReport(tenantId, period);

    // Calculate additional metrics
    const totalTransactions = report.paymentSummary.reduce((sum, item) => sum + parseInt(item.transaction_count), 0);
    const totalAmount = report.paymentSummary.reduce((sum, item) => sum + parseFloat(item.total_amount), 0);
    const averageTransaction = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    const analytics = {
      period,
      outletId,
      summary: {
        totalTransactions,
        totalAmount,
        averageTransaction,
        totalRefunds: report.refundSummary.refund_count || 0,
        totalRefundAmount: report.refundSummary.total_refunded || 0
      },
      paymentMethodBreakdown: report.paymentSummary,
      refundSummary: report.refundSummary,
      generatedAt: report.generatedAt
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
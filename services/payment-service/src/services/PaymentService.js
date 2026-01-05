const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

class PaymentService {
  constructor(dbPool, gatewayProviders) {
    this.db = dbPool;
    this.gateways = gatewayProviders;
    this.encryptionKey = process.env.ENCRYPTION_KEY;
  }

  async processPayment(tenantId, paymentData) {
    const {
      orderId,
      amount,
      currency = 'USD',
      paymentMethod,
      paymentDetails,
      customerId,
      outletId,
      metadata = {}
    } = paymentData;

    // Validate payment data
    this._validatePaymentData(paymentData);

    // Generate unique transaction ID
    const transactionId = this._generateTransactionId();

    try {
      // Start database transaction
      await this.db.query('BEGIN');

      // Create payment record
      const paymentRecord = await this._createPaymentRecord(tenantId, {
        transactionId,
        orderId,
        amount,
        currency,
        paymentMethod,
        customerId,
        outletId,
        status: 'PENDING',
        metadata
      });

      let gatewayResponse;

      // Process payment based on method
      switch (paymentMethod) {
        case 'CASH':
          gatewayResponse = await this._processCashPayment(paymentData);
          break;
        case 'CREDIT_CARD':
        case 'DEBIT_CARD':
          gatewayResponse = await this._processCardPayment(paymentData);
          break;
        case 'DIGITAL_WALLET':
          gatewayResponse = await this._processDigitalWalletPayment(paymentData);
          break;
        case 'BANK_TRANSFER':
          gatewayResponse = await this._processBankTransferPayment(paymentData);
          break;
        default:
          throw new Error(`Unsupported payment method: ${paymentMethod}`);
      }

      // Update payment record with gateway response
      await this._updatePaymentRecord(tenantId, transactionId, {
        status: gatewayResponse.status,
        gatewayTransactionId: gatewayResponse.transactionId,
        gatewayResponse: this._encryptSensitiveData(gatewayResponse),
        processedAt: new Date()
      });

      // Log transaction for reconciliation
      await this._logTransaction(tenantId, {
        transactionId,
        orderId,
        amount,
        currency,
        paymentMethod,
        status: gatewayResponse.status,
        gatewayTransactionId: gatewayResponse.transactionId,
        processedAt: new Date()
      });

      await this.db.query('COMMIT');

      return {
        transactionId,
        status: gatewayResponse.status,
        gatewayTransactionId: gatewayResponse.transactionId,
        amount,
        currency,
        paymentMethod,
        processedAt: new Date(),
        receipt: this._generateReceipt(paymentRecord, gatewayResponse)
      };

    } catch (error) {
      await this.db.query('ROLLBACK');
      
      // Log failed transaction
      await this._logFailedTransaction(tenantId, {
        transactionId,
        orderId,
        amount,
        currency,
        paymentMethod,
        error: error.message,
        failedAt: new Date()
      });

      throw error;
    }
  }

  async refundPayment(tenantId, refundData) {
    const { transactionId, amount, reason, refundedBy } = refundData;

    // Get original payment record
    const originalPayment = await this._getPaymentRecord(tenantId, transactionId);
    if (!originalPayment) {
      throw new Error('Original payment not found');
    }

    if (originalPayment.status !== 'COMPLETED') {
      throw new Error('Cannot refund incomplete payment');
    }

    const refundTransactionId = this._generateTransactionId();

    try {
      await this.db.query('BEGIN');

      // Process refund through gateway
      let gatewayResponse;
      switch (originalPayment.payment_method) {
        case 'CASH':
          gatewayResponse = await this._processCashRefund(refundData, originalPayment);
          break;
        case 'CREDIT_CARD':
        case 'DEBIT_CARD':
          gatewayResponse = await this._processCardRefund(refundData, originalPayment);
          break;
        case 'DIGITAL_WALLET':
          gatewayResponse = await this._processDigitalWalletRefund(refundData, originalPayment);
          break;
        default:
          throw new Error(`Refund not supported for payment method: ${originalPayment.payment_method}`);
      }

      // Create refund record
      await this._createRefundRecord(tenantId, {
        refundTransactionId,
        originalTransactionId: transactionId,
        amount,
        reason,
        refundedBy,
        status: gatewayResponse.status,
        gatewayRefundId: gatewayResponse.refundId,
        processedAt: new Date()
      });

      // Update original payment record
      await this._updatePaymentRecord(tenantId, transactionId, {
        refundStatus: amount >= originalPayment.amount ? 'FULLY_REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAmount: (originalPayment.refunded_amount || 0) + amount
      });

      await this.db.query('COMMIT');

      return {
        refundTransactionId,
        originalTransactionId: transactionId,
        amount,
        status: gatewayResponse.status,
        gatewayRefundId: gatewayResponse.refundId,
        processedAt: new Date()
      };

    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  async getPaymentStatus(tenantId, transactionId) {
    const payment = await this._getPaymentRecord(tenantId, transactionId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Check with gateway for latest status if needed
    if (payment.status === 'PENDING') {
      const gatewayStatus = await this._checkGatewayStatus(payment);
      if (gatewayStatus.status !== payment.status) {
        await this._updatePaymentRecord(tenantId, transactionId, {
          status: gatewayStatus.status,
          updatedAt: new Date()
        });
        payment.status = gatewayStatus.status;
      }
    }

    return {
      transactionId: payment.transaction_id,
      orderId: payment.order_id,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      status: payment.status,
      createdAt: payment.created_at,
      processedAt: payment.processed_at,
      refundStatus: payment.refund_status,
      refundedAmount: payment.refunded_amount
    };
  }

  async getTransactionHistory(tenantId, filters = {}) {
    const {
      startDate,
      endDate,
      paymentMethod,
      status,
      outletId,
      limit = 50,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        transaction_id,
        order_id,
        amount,
        currency,
        payment_method,
        status,
        created_at,
        processed_at,
        outlet_id,
        customer_id
      FROM ${this._getSchemaName(tenantId)}.payments
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (startDate) {
      paramCount++;
      query += ` AND created_at >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND created_at <= $${paramCount}`;
      params.push(endDate);
    }

    if (paymentMethod) {
      paramCount++;
      query += ` AND payment_method = $${paramCount}`;
      params.push(paymentMethod);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (outletId) {
      paramCount++;
      query += ` AND outlet_id = $${paramCount}`;
      params.push(outletId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async generateReconciliationReport(tenantId, period) {
    const { startDate, endDate } = this._parsePeriod(period);

    const query = `
      SELECT 
        payment_method,
        status,
        COUNT(*) as transaction_count,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM ${this._getSchemaName(tenantId)}.payments
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY payment_method, status
      ORDER BY payment_method, status
    `;

    const result = await this.db.query(query, [startDate, endDate]);

    // Get refund summary
    const refundQuery = `
      SELECT 
        COUNT(*) as refund_count,
        SUM(amount) as total_refunded
      FROM ${this._getSchemaName(tenantId)}.refunds
      WHERE created_at >= $1 AND created_at <= $2
    `;

    const refundResult = await this.db.query(refundQuery, [startDate, endDate]);

    return {
      period: { startDate, endDate },
      paymentSummary: result.rows,
      refundSummary: refundResult.rows[0],
      generatedAt: new Date()
    };
  }

  // Payment method processors
  async _processCashPayment(paymentData) {
    // Cash payments are processed immediately
    return {
      status: 'COMPLETED',
      transactionId: this._generateTransactionId(),
      processedAt: new Date(),
      method: 'CASH'
    };
  }

  async _processCardPayment(paymentData) {
    const { paymentDetails, amount, currency } = paymentData;
    
    // Use Stripe as primary card processor
    if (this.gateways.stripe) {
      try {
        const paymentIntent = await this.gateways.stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          payment_method_data: {
            type: 'card',
            card: {
              number: paymentDetails.cardNumber,
              exp_month: paymentDetails.expiryMonth,
              exp_year: paymentDetails.expiryYear,
              cvc: paymentDetails.cvv
            }
          },
          confirm: true,
          return_url: 'https://your-website.com/return'
        });

        return {
          status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : 'PENDING',
          transactionId: paymentIntent.id,
          processedAt: new Date(),
          method: 'STRIPE',
          gatewayResponse: paymentIntent
        };
      } catch (error) {
        throw new Error(`Card payment failed: ${error.message}`);
      }
    }

    throw new Error('No card payment gateway configured');
  }

  async _processDigitalWalletPayment(paymentData) {
    const { paymentDetails, amount, currency } = paymentData;
    
    // Mock digital wallet processing
    // In real implementation, integrate with PayPal, Apple Pay, Google Pay, etc.
    return {
      status: 'COMPLETED',
      transactionId: this._generateTransactionId(),
      processedAt: new Date(),
      method: 'DIGITAL_WALLET',
      walletType: paymentDetails.walletType
    };
  }

  async _processBankTransferPayment(paymentData) {
    // Bank transfers typically require manual verification
    return {
      status: 'PENDING',
      transactionId: this._generateTransactionId(),
      processedAt: new Date(),
      method: 'BANK_TRANSFER'
    };
  }

  // Refund processors
  async _processCashRefund(refundData, originalPayment) {
    return {
      status: 'COMPLETED',
      refundId: this._generateTransactionId(),
      processedAt: new Date()
    };
  }

  async _processCardRefund(refundData, originalPayment) {
    if (this.gateways.stripe && originalPayment.gateway_transaction_id) {
      try {
        const refund = await this.gateways.stripe.refunds.create({
          payment_intent: originalPayment.gateway_transaction_id,
          amount: Math.round(refundData.amount * 100)
        });

        return {
          status: 'COMPLETED',
          refundId: refund.id,
          processedAt: new Date()
        };
      } catch (error) {
        throw new Error(`Card refund failed: ${error.message}`);
      }
    }

    throw new Error('Cannot process card refund');
  }

  async _processDigitalWalletRefund(refundData, originalPayment) {
    // Mock digital wallet refund
    return {
      status: 'COMPLETED',
      refundId: this._generateTransactionId(),
      processedAt: new Date()
    };
  }

  // Database operations
  async _createPaymentRecord(tenantId, paymentData) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.payments
      (transaction_id, order_id, amount, currency, payment_method, customer_id, outlet_id, status, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      paymentData.transactionId,
      paymentData.orderId,
      paymentData.amount,
      paymentData.currency,
      paymentData.paymentMethod,
      paymentData.customerId,
      paymentData.outletId,
      paymentData.status,
      JSON.stringify(paymentData.metadata),
      new Date()
    ]);

    return result.rows[0];
  }

  async _updatePaymentRecord(tenantId, transactionId, updates) {
    const setClause = Object.keys(updates).map((key, index) => 
      `${this._camelToSnake(key)} = $${index + 2}`
    ).join(', ');

    const query = `
      UPDATE ${this._getSchemaName(tenantId)}.payments
      SET ${setClause}, updated_at = NOW()
      WHERE transaction_id = $1
    `;

    const params = [transactionId, ...Object.values(updates)];
    await this.db.query(query, params);
  }

  async _getPaymentRecord(tenantId, transactionId) {
    const query = `
      SELECT * FROM ${this._getSchemaName(tenantId)}.payments
      WHERE transaction_id = $1
    `;

    const result = await this.db.query(query, [transactionId]);
    return result.rows[0];
  }

  async _createRefundRecord(tenantId, refundData) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.refunds
      (refund_transaction_id, original_transaction_id, amount, reason, refunded_by, status, gateway_refund_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.db.query(query, [
      refundData.refundTransactionId,
      refundData.originalTransactionId,
      refundData.amount,
      refundData.reason,
      refundData.refundedBy,
      refundData.status,
      refundData.gatewayRefundId,
      refundData.processedAt
    ]);
  }

  async _logTransaction(tenantId, transactionData) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.transaction_logs
      (transaction_id, order_id, amount, currency, payment_method, status, gateway_transaction_id, logged_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.db.query(query, [
      transactionData.transactionId,
      transactionData.orderId,
      transactionData.amount,
      transactionData.currency,
      transactionData.paymentMethod,
      transactionData.status,
      transactionData.gatewayTransactionId,
      transactionData.processedAt
    ]);
  }

  async _logFailedTransaction(tenantId, transactionData) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.failed_transactions
      (transaction_id, order_id, amount, currency, payment_method, error_message, failed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      transactionData.transactionId,
      transactionData.orderId,
      transactionData.amount,
      transactionData.currency,
      transactionData.paymentMethod,
      transactionData.error,
      transactionData.failedAt
    ]);
  }

  // Helper methods
  _validatePaymentData(paymentData) {
    const { orderId, amount, paymentMethod, paymentDetails } = paymentData;

    if (!orderId) throw new Error('Order ID is required');
    if (!amount || amount <= 0) throw new Error('Valid amount is required');
    if (!paymentMethod) throw new Error('Payment method is required');

    const validMethods = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER'];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    if (['CREDIT_CARD', 'DEBIT_CARD'].includes(paymentMethod)) {
      if (!paymentDetails?.cardNumber || !paymentDetails?.expiryMonth || 
          !paymentDetails?.expiryYear || !paymentDetails?.cvv) {
        throw new Error('Complete card details are required');
      }
    }
  }

  _generateTransactionId() {
    return `TXN_${Date.now()}_${uuidv4().substring(0, 8).toUpperCase()}`;
  }

  _encryptSensitiveData(data) {
    if (!this.encryptionKey) return data;
    
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  _decryptSensitiveData(encryptedData) {
    if (!this.encryptionKey) return encryptedData;
    
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  _generateReceipt(paymentRecord, gatewayResponse) {
    return {
      transactionId: paymentRecord.transaction_id,
      orderId: paymentRecord.order_id,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      paymentMethod: paymentRecord.payment_method,
      status: gatewayResponse.status,
      processedAt: gatewayResponse.processedAt,
      receiptNumber: `RCP_${paymentRecord.transaction_id}`
    };
  }

  async _checkGatewayStatus(payment) {
    // Mock gateway status check
    return { status: payment.status };
  }

  _parsePeriod(period) {
    const now = moment();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = now.clone().startOf('day');
        endDate = now.clone().endOf('day');
        break;
      case 'yesterday':
        startDate = now.clone().subtract(1, 'day').startOf('day');
        endDate = now.clone().subtract(1, 'day').endOf('day');
        break;
      case 'this_week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'last_week':
        startDate = now.clone().subtract(1, 'week').startOf('week');
        endDate = now.clone().subtract(1, 'week').endOf('week');
        break;
      case 'this_month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'last_month':
        startDate = now.clone().subtract(1, 'month').startOf('month');
        endDate = now.clone().subtract(1, 'month').endOf('month');
        break;
      default:
        // Custom date range: period should be "YYYY-MM-DD,YYYY-MM-DD"
        const [start, end] = period.split(',');
        startDate = moment(start);
        endDate = moment(end);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  _camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  _getSchemaName(tenantId) {
    return `tenant_${tenantId}`;
  }
}

module.exports = PaymentService;
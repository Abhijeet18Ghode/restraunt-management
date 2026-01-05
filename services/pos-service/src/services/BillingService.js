const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Billing and payment processing service
 */
class BillingService {
  constructor(dbManager) {
    this.db = dbManager;
  }

  /**
   * Generate bill for order
   */
  async generateBill(tenantId, billData) {
    const { 
      orderId, 
      discounts = [], 
      taxes = [],
      serviceCharge = 0,
      notes 
    } = billData;

    try {
      // Get order details (this would typically come from OrderModel)
      const order = await this.getOrderDetails(tenantId, orderId);
      if (!order) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      // Calculate bill totals
      const billCalculation = this.calculateBillTotals(order, {
        discounts,
        taxes,
        serviceCharge,
      });

      // Generate unique bill number
      const billNumber = await this.generateBillNumber(tenantId, order.outletId);

      const bill = {
        id: `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        billNumber,
        orderId,
        orderNumber: order.orderNumber,
        outletId: order.outletId,
        tableId: order.tableId,
        customerId: order.customerId,
        items: order.items,
        subtotal: billCalculation.subtotal,
        discounts: billCalculation.discounts,
        serviceCharge: billCalculation.serviceCharge,
        taxes: billCalculation.taxes,
        total: billCalculation.total,
        status: 'PENDING',
        notes,
        createdAt: new Date(),
      };

      return createApiResponse(bill, 'Bill generated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to generate bill', error.message);
    }
  }

  /**
   * Process payment for bill
   */
  async processPayment(tenantId, paymentData) {
    const { 
      billId, 
      payments,
      customerInfo 
    } = paymentData;

    try {
      // Validate payments array
      if (!payments || payments.length === 0) {
        throw new ValidationError('At least one payment method is required');
      }

      // Get bill details
      const bill = await this.getBillDetails(tenantId, billId);
      if (!bill) {
        throw new ResourceNotFoundError('Bill', billId);
      }

      if (bill.status === 'PAID') {
        throw new ValidationError('Bill has already been paid');
      }

      // Validate payment methods and amounts
      const validPaymentMethods = ['CASH', 'CARD', 'DIGITAL_WALLET', 'UPI', 'CREDIT'];
      let totalPaymentAmount = 0;

      payments.forEach((payment, index) => {
        if (!validPaymentMethods.includes(payment.method)) {
          throw new ValidationError(`Invalid payment method at index ${index}: ${payment.method}`);
        }
        if (payment.amount <= 0) {
          throw new ValidationError(`Invalid payment amount at index ${index}: ${payment.amount}`);
        }
        totalPaymentAmount += payment.amount;
      });

      // Check if payment amount matches bill total
      if (Math.abs(totalPaymentAmount - bill.total) > 0.01) {
        throw new ValidationError(`Payment amount (${totalPaymentAmount}) does not match bill total (${bill.total})`);
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tenantId, bill.outletId);

      // Process each payment
      const processedPayments = payments.map((payment, index) => ({
        id: `payment-${Date.now()}-${index}`,
        billId,
        method: payment.method,
        amount: payment.amount,
        reference: payment.reference || null,
        cardLast4: payment.cardLast4 || null,
        approvalCode: payment.approvalCode || null,
        processedAt: new Date(),
      }));

      // Update bill status
      const updatedBill = {
        ...bill,
        status: 'PAID',
        invoiceNumber,
        payments: processedPayments,
        totalPaid: totalPaymentAmount,
        paidAt: new Date(),
        customerInfo,
      };

      const result = {
        bill: updatedBill,
        invoice: {
          invoiceNumber,
          billNumber: bill.billNumber,
          total: bill.total,
          payments: processedPayments,
          issuedAt: new Date(),
        },
      };

      return createApiResponse(result, 'Payment processed successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to process payment', error.message);
    }
  }

  /**
   * Split bill by amount
   */
  async splitBillByAmount(tenantId, billId, splitAmounts) {
    try {
      const bill = await this.getBillDetails(tenantId, billId);
      if (!bill) {
        throw new ResourceNotFoundError('Bill', billId);
      }

      if (bill.status === 'PAID') {
        throw new ValidationError('Cannot split a bill that has already been paid');
      }

      // Validate split amounts
      const totalSplitAmount = splitAmounts.reduce((sum, amount) => sum + amount, 0);
      if (Math.abs(totalSplitAmount - bill.total) > 0.01) {
        throw new ValidationError(`Split amounts (${totalSplitAmount}) do not equal bill total (${bill.total})`);
      }

      // Generate split bills
      const splitBills = splitAmounts.map((amount, index) => ({
        id: `split-${bill.id}-${index + 1}`,
        parentBillId: billId,
        splitNumber: index + 1,
        billNumber: `${bill.billNumber}-S${index + 1}`,
        amount,
        items: 'Proportional split of all items',
        status: 'PENDING',
        createdAt: new Date(),
      }));

      const result = {
        originalBill: bill,
        splitBills,
        totalSplits: splitBills.length,
      };

      return createApiResponse(result, `Bill split into ${splitBills.length} parts`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to split bill by amount', error.message);
    }
  }

  /**
   * Split bill by items
   */
  async splitBillByItems(tenantId, billId, itemSplits) {
    try {
      const bill = await this.getBillDetails(tenantId, billId);
      if (!bill) {
        throw new ResourceNotFoundError('Bill', billId);
      }

      if (bill.status === 'PAID') {
        throw new ValidationError('Cannot split a bill that has already been paid');
      }

      // Validate that all items are accounted for
      const allItemIds = bill.items.map(item => item.id);
      const splitItemIds = itemSplits.flatMap(split => split.itemIds);
      
      const missingItems = allItemIds.filter(id => !splitItemIds.includes(id));
      if (missingItems.length > 0) {
        throw new ValidationError(`Items not assigned to any split: ${missingItems.join(', ')}`);
      }

      // Generate split bills
      const splitBills = itemSplits.map((split, index) => {
        const splitItems = bill.items.filter(item => split.itemIds.includes(item.id));
        const splitSubtotal = splitItems.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Calculate proportional taxes and charges
        const proportion = splitSubtotal / bill.subtotal;
        const splitTaxes = bill.taxes.map(tax => ({
          ...tax,
          amount: Math.round(tax.amount * proportion * 100) / 100,
        }));
        const splitServiceCharge = Math.round(bill.serviceCharge * proportion * 100) / 100;
        const splitDiscounts = bill.discounts.map(discount => ({
          ...discount,
          amount: Math.round(discount.amount * proportion * 100) / 100,
        }));

        const splitTotal = splitSubtotal + 
          splitTaxes.reduce((sum, tax) => sum + tax.amount, 0) + 
          splitServiceCharge - 
          splitDiscounts.reduce((sum, discount) => sum + discount.amount, 0);

        return {
          id: `split-${bill.id}-${index + 1}`,
          parentBillId: billId,
          splitNumber: index + 1,
          billNumber: `${bill.billNumber}-S${index + 1}`,
          items: splitItems,
          subtotal: splitSubtotal,
          taxes: splitTaxes,
          serviceCharge: splitServiceCharge,
          discounts: splitDiscounts,
          total: Math.round(splitTotal * 100) / 100,
          status: 'PENDING',
          createdAt: new Date(),
        };
      });

      const result = {
        originalBill: bill,
        splitBills,
        totalSplits: splitBills.length,
      };

      return createApiResponse(result, `Bill split into ${splitBills.length} parts by items`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to split bill by items', error.message);
    }
  }

  /**
   * Generate receipt
   */
  async generateReceipt(tenantId, billId) {
    try {
      const bill = await this.getBillDetails(tenantId, billId);
      if (!bill) {
        throw new ResourceNotFoundError('Bill', billId);
      }

      if (bill.status !== 'PAID') {
        throw new ValidationError('Cannot generate receipt for unpaid bill');
      }

      const receipt = {
        receiptNumber: bill.invoiceNumber,
        billNumber: bill.billNumber,
        outletId: bill.outletId,
        tableId: bill.tableId,
        orderNumber: bill.orderNumber,
        items: bill.items,
        subtotal: bill.subtotal,
        discounts: bill.discounts,
        serviceCharge: bill.serviceCharge,
        taxes: bill.taxes,
        total: bill.total,
        payments: bill.payments,
        customerInfo: bill.customerInfo,
        issuedAt: bill.paidAt,
        printedAt: new Date(),
      };

      return createApiResponse(receipt, 'Receipt generated successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to generate receipt', error.message);
    }
  }

  /**
   * Calculate bill totals
   */
  calculateBillTotals(order, options = {}) {
    const { discounts = [], taxes = [], serviceCharge = 0 } = options;
    
    let subtotal = order.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Apply discounts
    let totalDiscountAmount = 0;
    const processedDiscounts = discounts.map(discount => {
      let discountAmount = 0;
      if (discount.type === 'PERCENTAGE') {
        discountAmount = Math.round(subtotal * (discount.value / 100) * 100) / 100;
      } else if (discount.type === 'FIXED') {
        discountAmount = discount.value;
      }
      totalDiscountAmount += discountAmount;
      
      return {
        ...discount,
        amount: discountAmount,
      };
    });

    // Calculate service charge
    const serviceChargeAmount = Math.round(subtotal * (serviceCharge / 100) * 100) / 100;

    // Calculate taxes on (subtotal + service charge - discounts)
    const taxableAmount = subtotal + serviceChargeAmount - totalDiscountAmount;
    let totalTaxAmount = 0;
    const processedTaxes = taxes.map(tax => {
      const taxAmount = Math.round(taxableAmount * (tax.rate / 100) * 100) / 100;
      totalTaxAmount += taxAmount;
      
      return {
        ...tax,
        amount: taxAmount,
      };
    });

    const total = Math.round((subtotal + serviceChargeAmount + totalTaxAmount - totalDiscountAmount) * 100) / 100;

    return {
      subtotal,
      discounts: processedDiscounts,
      serviceCharge: serviceChargeAmount,
      taxes: processedTaxes,
      total,
    };
  }

  /**
   * Generate unique bill number
   */
  async generateBillNumber(tenantId, outletId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-6);
    return `BILL-${outletId.slice(-4)}-${dateStr}-${timeStr}`;
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber(tenantId, outletId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-6);
    return `INV-${outletId.slice(-4)}-${dateStr}-${timeStr}`;
  }

  /**
   * Get order details (mock implementation)
   */
  async getOrderDetails(tenantId, orderId) {
    // In a real implementation, this would query the orders table
    return {
      id: orderId,
      orderNumber: 'ORD-001-20240105-123456',
      outletId: 'outlet-1',
      tableId: 'table-1',
      customerId: 'customer-1',
      items: [
        {
          id: 'item-1',
          menuItemId: 'menu-1',
          name: 'Sample Item 1',
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
        },
        {
          id: 'item-2',
          menuItemId: 'menu-2',
          name: 'Sample Item 2',
          quantity: 1,
          unitPrice: 150,
          totalPrice: 150,
        },
      ],
      subtotal: 350,
      status: 'CONFIRMED',
    };
  }

  /**
   * Get bill details (mock implementation)
   */
  async getBillDetails(tenantId, billId) {
    // In a real implementation, this would query the bills table
    return {
      id: billId,
      billNumber: 'BILL-001-20240105-123456',
      orderId: 'order-1',
      orderNumber: 'ORD-001-20240105-123456',
      outletId: 'outlet-1',
      tableId: 'table-1',
      items: [
        {
          id: 'item-1',
          name: 'Sample Item 1',
          quantity: 2,
          unitPrice: 100,
          totalPrice: 200,
        },
      ],
      subtotal: 350,
      discounts: [],
      serviceCharge: 0,
      taxes: [{ name: 'GST', rate: 18, amount: 63 }],
      total: 413,
      status: 'PENDING',
    };
  }
}

module.exports = BillingService;
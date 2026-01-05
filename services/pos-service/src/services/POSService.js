const { 
  OrderModel,
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');
const KOTService = require('./KOTService');

/**
 * Point of Sale service for order processing and billing
 */
class POSService {
  constructor(dbManager) {
    this.db = dbManager;
    this.orderModel = new OrderModel(dbManager);
    this.kotService = new KOTService(dbManager);
  }

  /**
   * Create a new order
   */
  async createOrder(tenantId, orderData) {
    const { 
      outletId, 
      tableId, 
      customerId, 
      orderType = 'DINE_IN',
      items,
      notes 
    } = orderData;

    try {
      if (!items || items.length === 0) {
        throw new ValidationError('Order must contain at least one item');
      }

      // Validate order type
      const validOrderTypes = ['DINE_IN', 'TAKEAWAY', 'DELIVERY'];
      if (!validOrderTypes.includes(orderType)) {
        throw new ValidationError(`Invalid order type. Must be one of: ${validOrderTypes.join(', ')}`);
      }

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber(tenantId, outletId);

      // Calculate totals
      const { subtotal, tax, total } = this.calculateOrderTotals(items);

      // Create order
      const order = await this.orderModel.create(tenantId, {
        outletId,
        orderNumber,
        tableId,
        customerId,
        orderType,
        subtotal,
        tax,
        total,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        notes,
      });

      // Add order items
      const orderItems = [];
      for (const item of items) {
        const orderItem = await this.addOrderItem(tenantId, order.id, item);
        orderItems.push(orderItem);
      }

      const completeOrder = {
        ...order,
        items: orderItems,
      };

      return createApiResponse(completeOrder, 'Order created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create order', error.message);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(tenantId, orderId) {
    try {
      const order = await this.orderModel.findById(tenantId, orderId);
      
      if (!order) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      // Get order items
      const items = await this.getOrderItems(tenantId, orderId);
      
      const completeOrder = {
        ...order,
        items,
      };

      return createApiResponse(completeOrder, 'Order retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get order', error.message);
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(tenantId, orderId, status) {
    try {
      const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updatedOrder = await this.orderModel.updateById(tenantId, orderId, {
        status,
        updatedAt: new Date(),
      });

      if (!updatedOrder) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      return createApiResponse(updatedOrder, `Order status updated to ${status}`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update order status', error.message);
    }
  }

  /**
   * Process payment for order
   */
  async processPayment(tenantId, paymentData) {
    const { 
      orderId, 
      paymentMethod, 
      amount, 
      paymentReference,
      splitDetails 
    } = paymentData;

    try {
      const order = await this.orderModel.findById(tenantId, orderId);
      if (!order) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      // Validate payment method
      const validPaymentMethods = ['CASH', 'CARD', 'DIGITAL_WALLET', 'UPI'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        throw new ValidationError(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`);
      }

      // Validate payment amount
      if (amount !== order.total && !splitDetails) {
        throw new ValidationError(`Payment amount ${amount} does not match order total ${order.total}`);
      }

      // Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tenantId, order.outletId);

      // Update order with payment information
      const updatedOrder = await this.orderModel.updateById(tenantId, orderId, {
        paymentStatus: 'PAID',
        paymentMethod,
        paymentAmount: amount,
        paymentReference,
        invoiceNumber,
        paidAt: new Date(),
        updatedAt: new Date(),
      });

      // Create payment record (in a real system, this would be a separate payments table)
      const payment = {
        orderId,
        invoiceNumber,
        paymentMethod,
        amount,
        paymentReference,
        splitDetails,
        processedAt: new Date(),
      };

      return createApiResponse(
        {
          order: updatedOrder,
          payment,
        },
        'Payment processed successfully'
      );
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to process payment', error.message);
    }
  }

  /**
   * Generate Kitchen Order Ticket (KOT)
   */
  async generateKOT(tenantId, orderId) {
    try {
      const order = await this.orderModel.findById(tenantId, orderId);
      if (!order) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      // Get order items
      const items = await this.getOrderItems(tenantId, orderId);

      // Use KOTService to generate KOT
      const kotData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        orderType: order.orderType,
        items: items,
        priority: 'NORMAL',
      };

      return await this.kotService.generateKOT(tenantId, kotData);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to generate KOT', error.message);
    }
  }

  /**
   * Split bill
   */
  async splitBill(tenantId, orderId, splitData) {
    const { splitType, splits } = splitData;

    try {
      const order = await this.orderModel.findById(tenantId, orderId);
      if (!order) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      if (order.paymentStatus === 'PAID') {
        throw new ValidationError('Cannot split a bill that has already been paid');
      }

      let splitBills = [];

      if (splitType === 'EQUAL') {
        // Split equally among number of people
        const numberOfSplits = splits.numberOfPeople;
        const amountPerPerson = Math.round((order.total / numberOfSplits) * 100) / 100;
        
        for (let i = 0; i < numberOfSplits; i++) {
          splitBills.push({
            splitNumber: i + 1,
            amount: i === numberOfSplits - 1 
              ? order.total - (amountPerPerson * (numberOfSplits - 1)) // Last split gets remainder
              : amountPerPerson,
            items: 'Equal split of all items',
          });
        }
      } else if (splitType === 'BY_ITEMS') {
        // Split by specific items
        const items = await this.getOrderItems(tenantId, orderId);
        
        splits.itemSplits.forEach((split, index) => {
          let splitAmount = 0;
          const splitItems = [];
          
          split.itemIds.forEach(itemId => {
            const item = items.find(i => i.id === itemId);
            if (item) {
              splitAmount += item.totalPrice;
              splitItems.push({
                name: item.menuItemName,
                quantity: item.quantity,
                price: item.totalPrice,
              });
            }
          });

          // Add proportional tax
          const taxProportion = splitAmount / order.subtotal;
          const splitTax = Math.round(order.tax * taxProportion * 100) / 100;
          
          splitBills.push({
            splitNumber: index + 1,
            amount: splitAmount + splitTax,
            items: splitItems,
            tax: splitTax,
          });
        });
      } else if (splitType === 'BY_AMOUNT') {
        // Split by specific amounts
        splits.amountSplits.forEach((split, index) => {
          splitBills.push({
            splitNumber: index + 1,
            amount: split.amount,
            description: split.description || `Split ${index + 1}`,
          });
        });
      }

      // Validate that split amounts equal original total
      const totalSplitAmount = splitBills.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplitAmount - order.total) > 0.01) {
        throw new ValidationError(`Split amounts (${totalSplitAmount}) do not equal order total (${order.total})`);
      }

      const splitBillResult = {
        originalOrderId: orderId,
        originalTotal: order.total,
        splitType,
        splits: splitBills,
        totalSplits: splitBills.length,
        createdAt: new Date(),
      };

      return createApiResponse(splitBillResult, `Bill split into ${splitBills.length} parts`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to split bill', error.message);
    }
  }

  /**
   * Merge tables
   */
  async mergeTables(tenantId, tableIds) {
    try {
      if (!tableIds || tableIds.length < 2) {
        throw new ValidationError('At least 2 tables are required for merging');
      }

      // Get all orders for the tables
      const orders = [];
      for (const tableId of tableIds) {
        const tableOrders = await this.getOrdersByTable(tenantId, tableId);
        orders.push(...tableOrders.filter(order => order.paymentStatus === 'PENDING'));
      }

      if (orders.length === 0) {
        throw new ValidationError('No pending orders found for the specified tables');
      }

      // Create merged order
      const primaryTable = tableIds[0];
      const mergedOrderNumber = await this.generateOrderNumber(tenantId, orders[0].outletId);
      
      // Calculate combined totals
      const combinedSubtotal = orders.reduce((sum, order) => sum + order.subtotal, 0);
      const combinedTax = orders.reduce((sum, order) => sum + order.tax, 0);
      const combinedTotal = orders.reduce((sum, order) => sum + order.total, 0);

      // Get all items from all orders
      const allItems = [];
      for (const order of orders) {
        const items = await this.getOrderItems(tenantId, order.id);
        allItems.push(...items);
      }

      // Create new merged order
      const mergedOrder = await this.orderModel.create(tenantId, {
        outletId: orders[0].outletId,
        orderNumber: mergedOrderNumber,
        tableId: primaryTable,
        orderType: 'DINE_IN',
        subtotal: combinedSubtotal,
        tax: combinedTax,
        total: combinedTotal,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        notes: `Merged from tables: ${tableIds.join(', ')}`,
      });

      // Add all items to merged order
      const mergedItems = [];
      for (const item of allItems) {
        const mergedItem = await this.addOrderItem(tenantId, mergedOrder.id, {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          specialInstructions: item.specialInstructions,
        });
        mergedItems.push(mergedItem);
      }

      // Cancel original orders
      for (const order of orders) {
        await this.orderModel.updateById(tenantId, order.id, {
          status: 'MERGED',
          paymentStatus: 'CANCELLED',
          updatedAt: new Date(),
        });
      }

      const result = {
        mergedOrder: {
          ...mergedOrder,
          items: mergedItems,
        },
        originalOrders: orders.map(order => order.id),
        mergedTables: tableIds,
        primaryTable,
      };

      return createApiResponse(result, `Successfully merged ${tableIds.length} tables`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to merge tables', error.message);
    }
  }

  /**
   * Calculate order totals
   */
  calculateOrderTotals(items) {
    let subtotal = 0;
    
    items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
    });

    // Round subtotal to handle floating-point precision issues
    subtotal = Math.round(subtotal * 100) / 100;

    // Calculate tax (assuming 18% GST)
    const taxRate = 0.18;
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return { subtotal, tax, total };
  }

  /**
   * Generate unique order number
   */
  async generateOrderNumber(tenantId, outletId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-6);
    return `ORD-${outletId.slice(-4)}-${dateStr}-${timeStr}`;
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
   * Add item to order
   */
  async addOrderItem(tenantId, orderId, itemData) {
    const { menuItemId, menuItemName, quantity, unitPrice, specialInstructions } = itemData;
    
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    
    // In a real system, this would insert into order_items table
    // For now, we'll return the item data
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      menuItemId,
      menuItemName,
      quantity,
      unitPrice,
      totalPrice,
      specialInstructions,
      status: 'PENDING',
    };
  }

  /**
   * Get order items
   */
  async getOrderItems(tenantId, orderId) {
    // In a real system, this would query the order_items table
    // For now, we'll return mock data
    return [
      {
        id: `item-${orderId}-1`,
        orderId,
        menuItemId: 'menu-item-1',
        menuItemName: 'Sample Item',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
        specialInstructions: null,
        status: 'PENDING',
      },
    ];
  }

  /**
   * Get orders by table
   */
  async getOrdersByTable(tenantId, tableId) {
    // In a real system, this would query orders by table_id
    // For now, we'll return mock data
    return [];
  }
}

module.exports = POSService;
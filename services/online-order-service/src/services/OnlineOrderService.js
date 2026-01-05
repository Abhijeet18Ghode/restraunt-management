const { 
  OrderModel,
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Online Order Management service for processing online orders
 */
class OnlineOrderService {
  constructor(dbManager) {
    this.db = dbManager;
    this.orderModel = new OrderModel(dbManager);
    this.orderQueue = new Map(); // In-memory queue for demo, use Redis in production
    this.maxQueueSize = parseInt(process.env.MAX_QUEUE_SIZE) || 100;
  }

  /**
   * Create a new online order
   */
  async createOnlineOrder(tenantId, orderData) {
    const { 
      outletId, 
      customerId, 
      customerInfo,
      deliveryAddress,
      orderType = 'DELIVERY',
      items,
      notes,
      scheduledTime,
      promotionCode
    } = orderData;

    try {
      if (!items || items.length === 0) {
        throw new ValidationError('Order must contain at least one item');
      }

      // Validate order type for online orders
      const validOrderTypes = ['DELIVERY', 'PICKUP'];
      if (!validOrderTypes.includes(orderType)) {
        throw new ValidationError(`Invalid order type for online orders. Must be one of: ${validOrderTypes.join(', ')}`);
      }

      // Validate delivery address for delivery orders
      if (orderType === 'DELIVERY' && !deliveryAddress) {
        throw new ValidationError('Delivery address is required for delivery orders');
      }

      // Generate unique order number
      const orderNumber = await this.generateOnlineOrderNumber(tenantId, outletId);

      // Calculate totals
      const { subtotal, tax, total, discount } = await this.calculateOnlineOrderTotals(tenantId, items, promotionCode);

      // Create order with online-specific fields
      const order = await this.orderModel.create(tenantId, {
        outletId,
        orderNumber,
        customerId,
        customerInfo,
        deliveryAddress,
        orderType,
        subtotal,
        tax,
        discount,
        total,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        orderSource: 'ONLINE',
        scheduledTime,
        promotionCode,
        notes,
      });

      // Add order items
      const orderItems = [];
      for (const item of items) {
        const orderItem = await this.addOrderItem(tenantId, order.id, item);
        orderItems.push(orderItem);
      }

      // Add to processing queue
      await this.addToQueue(tenantId, order.id);

      const completeOrder = {
        ...order,
        items: orderItems,
        queuePosition: await this.getQueuePosition(tenantId, order.id),
        estimatedTime: await this.calculateEstimatedTime(tenantId, order.id),
      };

      return createApiResponse(completeOrder, 'Online order created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create online order', error.message);
    }
  }

  /**
   * Get online order by ID with queue information
   */
  async getOnlineOrder(tenantId, orderId) {
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
        queuePosition: await this.getQueuePosition(tenantId, orderId),
        estimatedTime: await this.calculateEstimatedTime(tenantId, orderId),
        trackingInfo: await this.getTrackingInfo(tenantId, orderId),
      };

      return createApiResponse(completeOrder, 'Online order retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get online order', error.message);
    }
  }

  /**
   * Update online order status
   */
  async updateOrderStatus(tenantId, orderId, status, statusDetails = {}) {
    try {
      const validStatuses = [
        'PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 
        'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
      ];
      
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const updateData = {
        status,
        updatedAt: new Date(),
        ...statusDetails,
      };

      // Add status-specific fields
      if (status === 'CONFIRMED') {
        updateData.confirmedAt = new Date();
      } else if (status === 'OUT_FOR_DELIVERY') {
        updateData.dispatchedAt = new Date();
        updateData.deliveryPartnerId = statusDetails.deliveryPartnerId;
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      } else if (status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = statusDetails.reason;
      }

      const updatedOrder = await this.orderModel.updateById(tenantId, orderId, updateData);

      if (!updatedOrder) {
        throw new ResourceNotFoundError('Order', orderId);
      }

      // Update queue position if needed
      if (status === 'CONFIRMED') {
        await this.moveToProcessing(tenantId, orderId);
      } else if (['DELIVERED', 'CANCELLED'].includes(status)) {
        await this.removeFromQueue(tenantId, orderId);
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
   * Get order queue for outlet
   */
  async getOrderQueue(tenantId, outletId, status = 'all') {
    try {
      const queueKey = `${tenantId}:${outletId}`;
      const queue = this.orderQueue.get(queueKey) || [];
      
      let filteredQueue = queue;
      if (status !== 'all') {
        filteredQueue = queue.filter(item => item.status === status);
      }

      // Get full order details for each item in queue
      const queueWithDetails = [];
      for (const queueItem of filteredQueue) {
        const order = await this.orderModel.findById(tenantId, queueItem.orderId);
        if (order) {
          queueWithDetails.push({
            ...order,
            queuePosition: queueItem.position,
            estimatedTime: queueItem.estimatedTime,
            addedToQueueAt: queueItem.addedAt,
          });
        }
      }

      return createApiResponse({
        queue: queueWithDetails,
        totalItems: filteredQueue.length,
        maxCapacity: this.maxQueueSize,
      }, 'Order queue retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get order queue', error.message);
    }
  }

  /**
   * Process next order in queue
   */
  async processNextOrder(tenantId, outletId) {
    try {
      const queueKey = `${tenantId}:${outletId}`;
      const queue = this.orderQueue.get(queueKey) || [];
      
      if (queue.length === 0) {
        return createApiResponse(null, 'No orders in queue');
      }

      // Get the next order to process
      const nextOrder = queue.find(item => item.status === 'PENDING');
      if (!nextOrder) {
        return createApiResponse(null, 'No pending orders in queue');
      }

      // Update order status to preparing
      await this.updateOrderStatus(tenantId, nextOrder.orderId, 'PREPARING');

      // Update queue item status
      nextOrder.status = 'PREPARING';
      nextOrder.startedAt = new Date();

      return createApiResponse({
        orderId: nextOrder.orderId,
        position: nextOrder.position,
      }, 'Order processing started');
    } catch (error) {
      throw new DatabaseError('Failed to process next order', error.message);
    }
  }

  /**
   * Calculate online order totals with promotions
   */
  async calculateOnlineOrderTotals(tenantId, items, promotionCode = null) {
    let subtotal = 0;
    
    items.forEach(item => {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
    });

    // Round subtotal to handle floating-point precision
    subtotal = Math.round(subtotal * 100) / 100;

    // Apply promotion discount if applicable
    let discount = 0;
    if (promotionCode) {
      discount = await this.calculatePromotionDiscount(tenantId, subtotal, promotionCode);
    }

    const discountedSubtotal = subtotal - discount;

    // Calculate tax (assuming 18% GST)
    const taxRate = 0.18;
    const tax = Math.round(discountedSubtotal * taxRate * 100) / 100;
    const total = Math.round((discountedSubtotal + tax) * 100) / 100;

    return { subtotal, tax, total, discount };
  }

  /**
   * Calculate promotion discount
   */
  async calculatePromotionDiscount(tenantId, subtotal, promotionCode) {
    // In a real system, this would query a promotions table
    // For now, we'll implement some basic promotion logic
    const promotions = {
      'WELCOME10': { type: 'percentage', value: 10, minOrder: 100 },
      'FLAT50': { type: 'fixed', value: 50, minOrder: 200 },
      'FIRSTORDER': { type: 'percentage', value: 15, minOrder: 0 },
    };

    const promotion = promotions[promotionCode];
    if (!promotion) {
      return 0;
    }

    if (subtotal < promotion.minOrder) {
      return 0;
    }

    let discount = 0;
    if (promotion.type === 'percentage') {
      discount = (subtotal * promotion.value) / 100;
    } else if (promotion.type === 'fixed') {
      discount = promotion.value;
    }

    // Ensure discount doesn't exceed subtotal
    return Math.min(discount, subtotal);
  }

  /**
   * Add order to processing queue
   */
  async addToQueue(tenantId, orderId) {
    const order = await this.orderModel.findById(tenantId, orderId);
    if (!order) {
      throw new ResourceNotFoundError('Order', orderId);
    }

    const queueKey = `${tenantId}:${order.outletId}`;
    let queue = this.orderQueue.get(queueKey) || [];

    // Check queue capacity
    if (queue.length >= this.maxQueueSize) {
      throw new ValidationError('Order queue is full. Please try again later.');
    }

    const queueItem = {
      orderId,
      position: queue.length + 1,
      status: 'PENDING',
      addedAt: new Date(),
      estimatedTime: this.calculateBaseEstimatedTime() + (queue.length * 5), // 5 min per order ahead
    };

    queue.push(queueItem);
    this.orderQueue.set(queueKey, queue);

    return queueItem.position;
  }

  /**
   * Get queue position for order
   */
  async getQueuePosition(tenantId, orderId) {
    const order = await this.orderModel.findById(tenantId, orderId);
    if (!order) return null;

    const queueKey = `${tenantId}:${order.outletId}`;
    const queue = this.orderQueue.get(queueKey) || [];
    
    const queueItem = queue.find(item => item.orderId === orderId);
    return queueItem ? queueItem.position : null;
  }

  /**
   * Calculate estimated preparation time
   */
  async calculateEstimatedTime(tenantId, orderId) {
    const position = await this.getQueuePosition(tenantId, orderId);
    if (!position) return null;

    const baseTime = this.calculateBaseEstimatedTime();
    const queueTime = (position - 1) * 5; // 5 minutes per order ahead
    
    return baseTime + queueTime;
  }

  /**
   * Calculate base estimated time based on current load
   */
  calculateBaseEstimatedTime() {
    // Base preparation time in minutes
    return 20;
  }

  /**
   * Move order to processing status in queue
   */
  async moveToProcessing(tenantId, orderId) {
    const order = await this.orderModel.findById(tenantId, orderId);
    if (!order) return;

    const queueKey = `${tenantId}:${order.outletId}`;
    const queue = this.orderQueue.get(queueKey) || [];
    
    const queueItem = queue.find(item => item.orderId === orderId);
    if (queueItem) {
      queueItem.status = 'PROCESSING';
      queueItem.startedAt = new Date();
    }
  }

  /**
   * Remove order from queue
   */
  async removeFromQueue(tenantId, orderId) {
    const order = await this.orderModel.findById(tenantId, orderId);
    if (!order) return;

    const queueKey = `${tenantId}:${order.outletId}`;
    let queue = this.orderQueue.get(queueKey) || [];
    
    queue = queue.filter(item => item.orderId !== orderId);
    
    // Reposition remaining items
    queue.forEach((item, index) => {
      item.position = index + 1;
    });
    
    this.orderQueue.set(queueKey, queue);
  }

  /**
   * Get tracking information for order
   */
  async getTrackingInfo(tenantId, orderId) {
    const order = await this.orderModel.findById(tenantId, orderId);
    if (!order) return null;

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      deliveryPartnerId: order.deliveryPartnerId,
      trackingUrl: order.trackingUrl,
      lastUpdated: order.updatedAt,
    };
  }

  /**
   * Generate unique online order number
   */
  async generateOnlineOrderNumber(tenantId, outletId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = Date.now().toString().slice(-6);
    return `ONL-${outletId.slice(-4)}-${dateStr}-${timeStr}`;
  }

  /**
   * Add item to order
   */
  async addOrderItem(tenantId, orderId, itemData) {
    const { menuItemId, menuItemName, quantity, unitPrice, specialInstructions, customizations } = itemData;
    
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
    
    // In a real system, this would insert into order_items table
    return {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      menuItemId,
      menuItemName,
      quantity,
      unitPrice,
      totalPrice,
      specialInstructions,
      customizations,
      status: 'PENDING',
    };
  }

  /**
   * Get order items
   */
  async getOrderItems(tenantId, orderId) {
    // In a real system, this would query the order_items table
    return [
      {
        id: `item-${orderId}-1`,
        orderId,
        menuItemId: 'menu-item-1',
        menuItemName: 'Sample Online Item',
        quantity: 1,
        unitPrice: 150,
        totalPrice: 150,
        specialInstructions: null,
        customizations: [],
        status: 'PENDING',
      },
    ];
  }
}

module.exports = OnlineOrderService;
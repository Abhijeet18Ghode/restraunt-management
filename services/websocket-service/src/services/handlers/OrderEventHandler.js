const logger = require('../../utils/logger');

class OrderEventHandler {
  constructor(io) {
    this.io = io;
  }

  async handleOrderCreate(socket, data) {
    try {
      const { user } = socket;
      const { order } = data;

      // Validate order data
      if (!order || !order.outletId) {
        socket.emit('error', { message: 'Invalid order data' });
        return;
      }

      // Ensure user can create orders for this outlet
      if (user.outletId !== order.outletId && user.role !== 'admin') {
        socket.emit('error', { message: 'Access denied for this outlet' });
        return;
      }

      // Broadcast new order to outlet staff
      this.io.to(`outlet:${order.outletId}`).emit('order:new', {
        order,
        createdBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast to kitchen display
      this.io.to(`kitchen:${order.outletId}`).emit('kitchen:new_order', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        items: order.items,
        specialInstructions: order.specialInstructions,
        priority: order.priority || 'normal',
        timestamp: new Date().toISOString(),
      });

      // Broadcast to analytics subscribers
      this.io.to(`analytics:${user.tenantId}`).emit('analytics:order_created', {
        outletId: order.outletId,
        orderValue: order.total,
        itemCount: order.items.length,
        timestamp: new Date().toISOString(),
      });

      socket.emit('order:created', {
        orderId: order.id,
        message: 'Order created successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Order created via WebSocket', {
        orderId: order.id,
        outletId: order.outletId,
        userId: user.id,
        total: order.total,
      });

    } catch (error) {
      logger.error('Error handling order creation', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to create order' });
    }
  }

  async handleOrderUpdate(socket, data) {
    try {
      const { user } = socket;
      const { orderId, updates } = data;

      if (!orderId || !updates) {
        socket.emit('error', { message: 'Invalid update data' });
        return;
      }

      // Broadcast order update to relevant parties
      this.io.to(`outlet:${user.outletId}`).emit('order:updated', {
        orderId,
        updates,
        updatedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // If items were updated, notify kitchen
      if (updates.items) {
        this.io.to(`kitchen:${user.outletId}`).emit('kitchen:order_modified', {
          orderId,
          newItems: updates.items,
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit('order:update_confirmed', {
        orderId,
        message: 'Order updated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Order updated via WebSocket', {
        orderId,
        userId: user.id,
        updates: Object.keys(updates),
      });

    } catch (error) {
      logger.error('Error handling order update', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to update order' });
    }
  }

  async handleOrderStatusChange(socket, data) {
    try {
      const { user } = socket;
      const { orderId, status, previousStatus } = data;

      if (!orderId || !status) {
        socket.emit('error', { message: 'Invalid status change data' });
        return;
      }

      // Broadcast status change to outlet
      this.io.to(`outlet:${user.outletId}`).emit('order:status_changed', {
        orderId,
        status,
        previousStatus,
        changedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Special handling for different status changes
      switch (status) {
        case 'confirmed':
          this.io.to(`kitchen:${user.outletId}`).emit('kitchen:order_confirmed', {
            orderId,
            timestamp: new Date().toISOString(),
          });
          break;

        case 'preparing':
          this.io.to(`outlet:${user.outletId}`).emit('order:preparation_started', {
            orderId,
            timestamp: new Date().toISOString(),
          });
          break;

        case 'ready':
          this.io.to(`outlet:${user.outletId}`).emit('order:ready_for_pickup', {
            orderId,
            timestamp: new Date().toISOString(),
          });
          break;

        case 'completed':
          this.io.to(`analytics:${user.tenantId}`).emit('analytics:order_completed', {
            orderId,
            outletId: user.outletId,
            completionTime: new Date().toISOString(),
          });
          break;

        case 'cancelled':
          this.io.to(`kitchen:${user.outletId}`).emit('kitchen:order_cancelled', {
            orderId,
            timestamp: new Date().toISOString(),
          });
          break;
      }

      socket.emit('order:status_change_confirmed', {
        orderId,
        status,
        message: 'Status updated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Order status changed via WebSocket', {
        orderId,
        status,
        previousStatus,
        userId: user.id,
      });

    } catch (error) {
      logger.error('Error handling order status change', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to update order status' });
    }
  }

  async handleOrderPayment(socket, data) {
    try {
      const { user } = socket;
      const { orderId, paymentData } = data;

      if (!orderId || !paymentData) {
        socket.emit('error', { message: 'Invalid payment data' });
        return;
      }

      // Broadcast payment completion to outlet
      this.io.to(`outlet:${user.outletId}`).emit('order:payment_completed', {
        orderId,
        paymentMethod: paymentData.method,
        amount: paymentData.amount,
        processedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Update analytics
      this.io.to(`analytics:${user.tenantId}`).emit('analytics:payment_processed', {
        orderId,
        outletId: user.outletId,
        amount: paymentData.amount,
        method: paymentData.method,
        timestamp: new Date().toISOString(),
      });

      socket.emit('order:payment_confirmed', {
        orderId,
        message: 'Payment processed successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Order payment processed via WebSocket', {
        orderId,
        amount: paymentData.amount,
        method: paymentData.method,
        userId: user.id,
      });

    } catch (error) {
      logger.error('Error handling order payment', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to process payment' });
    }
  }
}

module.exports = OrderEventHandler;
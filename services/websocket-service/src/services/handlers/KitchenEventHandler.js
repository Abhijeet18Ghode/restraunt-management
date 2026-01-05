const logger = require('../../utils/logger');

class KitchenEventHandler {
  constructor(io) {
    this.io = io;
  }

  async handleKOTUpdate(socket, data) {
    try {
      const { user } = socket;
      const { kotId, status, estimatedTime } = data;

      if (!kotId || !status) {
        socket.emit('error', { message: 'Invalid KOT update data' });
        return;
      }

      // Broadcast KOT status update to kitchen displays
      this.io.to(`kitchen:${user.outletId}`).emit('kitchen:kot_status_updated', {
        kotId,
        status,
        estimatedTime,
        updatedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast to POS systems for order tracking
      this.io.to(`outlet:${user.outletId}`).emit('order:kitchen_update', {
        kotId,
        status,
        estimatedTime,
        timestamp: new Date().toISOString(),
      });

      // Send status-specific notifications
      switch (status) {
        case 'preparing':
          this.io.to(`outlet:${user.outletId}`).emit('notification', {
            type: 'info',
            title: 'Order in Preparation',
            message: `KOT #${kotId} is now being prepared`,
            timestamp: new Date().toISOString(),
          });
          break;

        case 'ready':
          this.io.to(`outlet:${user.outletId}`).emit('notification', {
            type: 'success',
            title: 'Order Ready',
            message: `KOT #${kotId} is ready for pickup`,
            priority: 'high',
            timestamp: new Date().toISOString(),
          });
          break;

        case 'delayed':
          this.io.to(`outlet:${user.outletId}`).emit('notification', {
            type: 'warning',
            title: 'Order Delayed',
            message: `KOT #${kotId} is experiencing delays`,
            estimatedTime,
            timestamp: new Date().toISOString(),
          });
          break;
      }

      socket.emit('kitchen:kot_update_confirmed', {
        kotId,
        status,
        message: 'KOT status updated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('KOT status updated via WebSocket', {
        kotId,
        status,
        estimatedTime,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling KOT update', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to update KOT status' });
    }
  }

  async handleOrderReady(socket, data) {
    try {
      const { user } = socket;
      const { orderId, kotId, tableNumber } = data;

      if (!orderId) {
        socket.emit('error', { message: 'Invalid order ready data' });
        return;
      }

      // Broadcast order ready notification
      this.io.to(`outlet:${user.outletId}`).emit('order:ready_notification', {
        orderId,
        kotId,
        tableNumber,
        preparedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Send high-priority notification to service staff
      this.io.to(`outlet:${user.outletId}`).emit('notification', {
        type: 'success',
        title: 'Order Ready for Service',
        message: `Table ${tableNumber} - Order #${orderId} is ready`,
        priority: 'high',
        sound: true,
        actions: [
          {
            label: 'Mark Served',
            action: 'mark_served',
            orderId,
          }
        ],
        timestamp: new Date().toISOString(),
      });

      // Update kitchen display
      this.io.to(`kitchen:${user.outletId}`).emit('kitchen:order_completed', {
        orderId,
        kotId,
        completedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      socket.emit('kitchen:order_ready_confirmed', {
        orderId,
        message: 'Order marked as ready',
        timestamp: new Date().toISOString(),
      });

      logger.info('Order marked ready via WebSocket', {
        orderId,
        kotId,
        tableNumber,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling order ready', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to mark order as ready' });
    }
  }

  async handleJoinDisplay(socket, data) {
    try {
      const { user } = socket;
      const { displayType = 'main' } = data;

      // Join kitchen display room
      const kitchenRoom = `kitchen:${user.outletId}:${displayType}`;
      socket.join(kitchenRoom);

      // Send current kitchen state to the new display
      socket.emit('kitchen:display_joined', {
        displayType,
        room: kitchenRoom,
        message: 'Connected to kitchen display',
        timestamp: new Date().toISOString(),
      });

      // Notify other kitchen displays about new connection
      socket.to(kitchenRoom).emit('kitchen:display_connected', {
        displayId: socket.id,
        displayType,
        connectedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      logger.info('Kitchen display connected via WebSocket', {
        socketId: socket.id,
        displayType,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling kitchen display join', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to join kitchen display' });
    }
  }

  // Method to broadcast kitchen alerts
  broadcastKitchenAlert(outletId, alert) {
    this.io.to(`kitchen:${outletId}`).emit('kitchen:alert', {
      ...alert,
      timestamp: new Date().toISOString(),
    });

    // Also send to outlet management
    this.io.to(`outlet:${outletId}`).emit('notification', {
      type: alert.type || 'warning',
      title: alert.title,
      message: alert.message,
      priority: alert.priority || 'medium',
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast preparation time updates
  broadcastPreparationTimeUpdate(outletId, data) {
    this.io.to(`kitchen:${outletId}`).emit('kitchen:preparation_time_update', {
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.io.to(`outlet:${outletId}`).emit('order:preparation_time_update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast kitchen performance metrics
  broadcastKitchenMetrics(outletId, metrics) {
    this.io.to(`kitchen:${outletId}`).emit('kitchen:metrics_update', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = KitchenEventHandler;
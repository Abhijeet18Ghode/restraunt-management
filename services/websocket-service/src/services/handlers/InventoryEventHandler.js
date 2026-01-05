const logger = require('../../utils/logger');

class InventoryEventHandler {
  constructor(io) {
    this.io = io;
  }

  async handleStockUpdate(socket, data) {
    try {
      const { user } = socket;
      const { itemId, newQuantity, previousQuantity, reason } = data;

      if (!itemId || newQuantity === undefined) {
        socket.emit('error', { message: 'Invalid stock update data' });
        return;
      }

      // Broadcast stock update to outlet
      this.io.to(`outlet:${user.outletId}`).emit('inventory:stock_updated', {
        itemId,
        newQuantity,
        previousQuantity,
        reason,
        updatedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast to tenant for multi-outlet visibility
      this.io.to(`tenant:${user.tenantId}`).emit('inventory:stock_change', {
        outletId: user.outletId,
        itemId,
        newQuantity,
        previousQuantity,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Check for low stock and send alerts if necessary
      if (newQuantity <= (data.lowStockThreshold || 10)) {
        this.broadcastLowStockAlert(user.outletId, user.tenantId, {
          itemId,
          itemName: data.itemName,
          currentQuantity: newQuantity,
          threshold: data.lowStockThreshold || 10,
          severity: newQuantity === 0 ? 'critical' : 'warning',
        });
      }

      // Update menu availability if item is out of stock
      if (newQuantity === 0) {
        this.io.to(`outlet:${user.outletId}`).emit('menu:item_unavailable', {
          itemId,
          reason: 'out_of_stock',
          timestamp: new Date().toISOString(),
        });
      } else if (previousQuantity === 0 && newQuantity > 0) {
        this.io.to(`outlet:${user.outletId}`).emit('menu:item_available', {
          itemId,
          timestamp: new Date().toISOString(),
        });
      }

      socket.emit('inventory:stock_update_confirmed', {
        itemId,
        newQuantity,
        message: 'Stock updated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Stock updated via WebSocket', {
        itemId,
        newQuantity,
        previousQuantity,
        reason,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling stock update', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to update stock' });
    }
  }

  async handleLowStockAlert(socket, data) {
    try {
      const { user } = socket;
      const { itemId, itemName, currentQuantity, threshold } = data;

      if (!itemId || !itemName) {
        socket.emit('error', { message: 'Invalid low stock alert data' });
        return;
      }

      this.broadcastLowStockAlert(user.outletId, user.tenantId, {
        itemId,
        itemName,
        currentQuantity,
        threshold,
        severity: currentQuantity === 0 ? 'critical' : 'warning',
        reportedBy: {
          id: user.id,
          name: user.name,
        },
      });

      socket.emit('inventory:alert_sent', {
        itemId,
        message: 'Low stock alert sent',
        timestamp: new Date().toISOString(),
      });

      logger.info('Low stock alert sent via WebSocket', {
        itemId,
        itemName,
        currentQuantity,
        threshold,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling low stock alert', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to send low stock alert' });
    }
  }

  async handleAvailabilityChange(socket, data) {
    try {
      const { user } = socket;
      const { itemId, available, reason } = data;

      if (!itemId || available === undefined) {
        socket.emit('error', { message: 'Invalid availability change data' });
        return;
      }

      // Broadcast availability change to outlet
      this.io.to(`outlet:${user.outletId}`).emit('menu:availability_changed', {
        itemId,
        available,
        reason,
        changedBy: {
          id: user.id,
          name: user.name,
        },
        timestamp: new Date().toISOString(),
      });

      // Broadcast to kitchen displays
      this.io.to(`kitchen:${user.outletId}`).emit('kitchen:item_availability_changed', {
        itemId,
        available,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Send notification to staff
      const notificationType = available ? 'success' : 'warning';
      const notificationMessage = available 
        ? `Item is now available` 
        : `Item is now unavailable${reason ? ` (${reason})` : ''}`;

      this.io.to(`outlet:${user.outletId}`).emit('notification', {
        type: notificationType,
        title: 'Menu Item Availability Changed',
        message: notificationMessage,
        itemId,
        timestamp: new Date().toISOString(),
      });

      socket.emit('inventory:availability_change_confirmed', {
        itemId,
        available,
        message: 'Availability updated successfully',
        timestamp: new Date().toISOString(),
      });

      logger.info('Item availability changed via WebSocket', {
        itemId,
        available,
        reason,
        userId: user.id,
        outletId: user.outletId,
      });

    } catch (error) {
      logger.error('Error handling availability change', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to update availability' });
    }
  }

  // Helper method to broadcast low stock alerts
  broadcastLowStockAlert(outletId, tenantId, alertData) {
    const alert = {
      type: alertData.severity === 'critical' ? 'error' : 'warning',
      title: alertData.severity === 'critical' ? 'Item Out of Stock' : 'Low Stock Alert',
      message: `${alertData.itemName}: ${alertData.currentQuantity} remaining (threshold: ${alertData.threshold})`,
      priority: alertData.severity === 'critical' ? 'high' : 'medium',
      category: 'inventory',
      ...alertData,
      timestamp: new Date().toISOString(),
    };

    // Send to outlet
    this.io.to(`outlet:${outletId}`).emit('notification', alert);

    // Send to tenant management
    this.io.to(`tenant:${tenantId}`).emit('inventory:low_stock_alert', alert);

    // Send to inventory management systems
    this.io.to(`inventory:${tenantId}`).emit('inventory:alert', alert);
  }

  // Method to broadcast inventory transfers
  broadcastInventoryTransfer(fromOutletId, toOutletId, tenantId, transferData) {
    const transfer = {
      ...transferData,
      timestamp: new Date().toISOString(),
    };

    // Notify source outlet
    this.io.to(`outlet:${fromOutletId}`).emit('inventory:transfer_sent', transfer);

    // Notify destination outlet
    this.io.to(`outlet:${toOutletId}`).emit('inventory:transfer_received', transfer);

    // Notify tenant management
    this.io.to(`tenant:${tenantId}`).emit('inventory:transfer_completed', transfer);
  }

  // Method to broadcast supplier updates
  broadcastSupplierUpdate(tenantId, supplierData) {
    this.io.to(`tenant:${tenantId}`).emit('inventory:supplier_update', {
      ...supplierData,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast inventory reports
  broadcastInventoryReport(outletId, tenantId, reportData) {
    this.io.to(`outlet:${outletId}`).emit('inventory:report_generated', {
      ...reportData,
      timestamp: new Date().toISOString(),
    });

    this.io.to(`tenant:${tenantId}`).emit('inventory:report_available', {
      outletId,
      ...reportData,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = InventoryEventHandler;
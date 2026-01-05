const logger = require('../../utils/logger');

class AnalyticsEventHandler {
  constructor(io) {
    this.io = io;
    this.subscribers = new Map(); // Track analytics subscriptions
  }

  async handleSubscribe(socket, data) {
    try {
      const { user } = socket;
      const { metrics, interval = 30000 } = data; // Default 30 second updates

      if (!metrics || !Array.isArray(metrics)) {
        socket.emit('error', { message: 'Invalid subscription data' });
        return;
      }

      // Validate user permissions for analytics
      if (!this.canAccessAnalytics(user)) {
        socket.emit('error', { message: 'Access denied to analytics' });
        return;
      }

      // Join analytics room
      const analyticsRoom = `analytics:${user.tenantId}`;
      socket.join(analyticsRoom);

      // Store subscription info
      const subscriptionId = `${socket.id}_${Date.now()}`;
      this.subscribers.set(subscriptionId, {
        socketId: socket.id,
        userId: user.id,
        tenantId: user.tenantId,
        outletId: user.outletId,
        metrics,
        interval,
        lastUpdate: new Date(),
      });

      // Start sending analytics updates
      this.startAnalyticsUpdates(subscriptionId);

      socket.emit('analytics:subscribed', {
        subscriptionId,
        metrics,
        interval,
        message: 'Analytics subscription active',
        timestamp: new Date().toISOString(),
      });

      logger.info('Analytics subscription created', {
        subscriptionId,
        userId: user.id,
        tenantId: user.tenantId,
        metrics,
        interval,
      });

    } catch (error) {
      logger.error('Error handling analytics subscription', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
      socket.emit('error', { message: 'Failed to subscribe to analytics' });
    }
  }

  async handleUnsubscribe(socket, data) {
    try {
      const { subscriptionId } = data;

      if (subscriptionId && this.subscribers.has(subscriptionId)) {
        this.subscribers.delete(subscriptionId);
        
        socket.emit('analytics:unsubscribed', {
          subscriptionId,
          message: 'Analytics subscription cancelled',
          timestamp: new Date().toISOString(),
        });

        logger.info('Analytics subscription cancelled', {
          subscriptionId,
          userId: socket.user.id,
        });
      }

    } catch (error) {
      logger.error('Error handling analytics unsubscription', {
        error: error.message,
        userId: socket.user.id,
        data,
      });
    }
  }

  startAnalyticsUpdates(subscriptionId) {
    const subscription = this.subscribers.get(subscriptionId);
    if (!subscription) return;

    const updateInterval = setInterval(async () => {
      try {
        const currentSubscription = this.subscribers.get(subscriptionId);
        if (!currentSubscription) {
          clearInterval(updateInterval);
          return;
        }

        // Generate analytics data for subscribed metrics
        const analyticsData = await this.generateAnalyticsData(currentSubscription);
        
        // Send update to subscriber
        this.io.to(currentSubscription.socketId).emit('analytics:update', {
          subscriptionId,
          data: analyticsData,
          timestamp: new Date().toISOString(),
        });

        // Update last update time
        currentSubscription.lastUpdate = new Date();

      } catch (error) {
        logger.error('Error sending analytics update', {
          error: error.message,
          subscriptionId,
        });
      }
    }, subscription.interval);

    // Store interval reference for cleanup
    subscription.intervalRef = updateInterval;
  }

  async generateAnalyticsData(subscription) {
    const { metrics, tenantId, outletId } = subscription;
    const data = {};

    for (const metric of metrics) {
      switch (metric) {
        case 'realtime_sales':
          data.realtimeSales = await this.getRealtimeSales(outletId);
          break;

        case 'order_count':
          data.orderCount = await this.getOrderCount(outletId);
          break;

        case 'revenue':
          data.revenue = await this.getRevenue(outletId);
          break;

        case 'kitchen_performance':
          data.kitchenPerformance = await this.getKitchenPerformance(outletId);
          break;

        case 'table_occupancy':
          data.tableOccupancy = await this.getTableOccupancy(outletId);
          break;

        case 'popular_items':
          data.popularItems = await this.getPopularItems(outletId);
          break;

        case 'staff_performance':
          data.staffPerformance = await this.getStaffPerformance(outletId);
          break;

        case 'customer_satisfaction':
          data.customerSatisfaction = await this.getCustomerSatisfaction(outletId);
          break;

        default:
          logger.warn('Unknown analytics metric requested', { metric });
      }
    }

    return data;
  }

  // Mock analytics data generators (in real implementation, these would query actual data)
  async getRealtimeSales(outletId) {
    return {
      current: Math.floor(Math.random() * 1000) + 500,
      trend: Math.random() > 0.5 ? 'up' : 'down',
      change: (Math.random() * 20 - 10).toFixed(1),
    };
  }

  async getOrderCount(outletId) {
    return {
      today: Math.floor(Math.random() * 100) + 50,
      pending: Math.floor(Math.random() * 10),
      completed: Math.floor(Math.random() * 90) + 40,
    };
  }

  async getRevenue(outletId) {
    return {
      today: (Math.random() * 5000 + 2000).toFixed(2),
      thisWeek: (Math.random() * 30000 + 15000).toFixed(2),
      thisMonth: (Math.random() * 120000 + 60000).toFixed(2),
    };
  }

  async getKitchenPerformance(outletId) {
    return {
      averagePreparationTime: Math.floor(Math.random() * 20) + 10,
      ordersInProgress: Math.floor(Math.random() * 15),
      efficiency: (Math.random() * 30 + 70).toFixed(1),
    };
  }

  async getTableOccupancy(outletId) {
    const totalTables = 20;
    const occupiedTables = Math.floor(Math.random() * totalTables);
    return {
      total: totalTables,
      occupied: occupiedTables,
      available: totalTables - occupiedTables,
      occupancyRate: ((occupiedTables / totalTables) * 100).toFixed(1),
    };
  }

  async getPopularItems(outletId) {
    const items = ['Burger', 'Pizza', 'Pasta', 'Salad', 'Sandwich'];
    return items.map(item => ({
      name: item,
      orders: Math.floor(Math.random() * 50) + 10,
      revenue: (Math.random() * 500 + 100).toFixed(2),
    })).sort((a, b) => b.orders - a.orders);
  }

  async getStaffPerformance(outletId) {
    return {
      activeStaff: Math.floor(Math.random() * 10) + 5,
      averageOrdersPerStaff: Math.floor(Math.random() * 20) + 10,
      customerRating: (Math.random() * 2 + 3).toFixed(1),
    };
  }

  async getCustomerSatisfaction(outletId) {
    return {
      averageRating: (Math.random() * 2 + 3).toFixed(1),
      totalReviews: Math.floor(Math.random() * 100) + 50,
      positivePercentage: (Math.random() * 30 + 70).toFixed(1),
    };
  }

  canAccessAnalytics(user) {
    return user.role === 'admin' || 
           user.role === 'manager' || 
           user.permissions.includes('analytics.view');
  }

  // Cleanup method for disconnected clients
  cleanupSubscriptions(socketId) {
    const subscriptionsToRemove = [];
    
    for (const [subscriptionId, subscription] of this.subscribers.entries()) {
      if (subscription.socketId === socketId) {
        if (subscription.intervalRef) {
          clearInterval(subscription.intervalRef);
        }
        subscriptionsToRemove.push(subscriptionId);
      }
    }

    subscriptionsToRemove.forEach(id => this.subscribers.delete(id));
  }

  // Method to broadcast analytics events
  broadcastAnalyticsEvent(tenantId, event, data) {
    this.io.to(`analytics:${tenantId}`).emit('analytics:event', {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  // Method to broadcast performance alerts
  broadcastPerformanceAlert(outletId, tenantId, alert) {
    this.io.to(`outlet:${outletId}`).emit('notification', {
      type: alert.severity || 'warning',
      title: 'Performance Alert',
      message: alert.message,
      category: 'performance',
      ...alert,
      timestamp: new Date().toISOString(),
    });

    this.io.to(`analytics:${tenantId}`).emit('analytics:performance_alert', {
      outletId,
      ...alert,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = AnalyticsEventHandler;
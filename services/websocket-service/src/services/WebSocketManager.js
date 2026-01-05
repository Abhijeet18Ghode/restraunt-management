const logger = require('../utils/logger');
const OrderEventHandler = require('./handlers/OrderEventHandler');
const KitchenEventHandler = require('./handlers/KitchenEventHandler');
const InventoryEventHandler = require('./handlers/InventoryEventHandler');
const AnalyticsEventHandler = require('./handlers/AnalyticsEventHandler');

class WebSocketManager {
  constructor(io) {
    this.io = io;
    this.connectedClients = new Map();
    
    // Initialize event handlers
    this.orderHandler = new OrderEventHandler(io);
    this.kitchenHandler = new KitchenEventHandler(io);
    this.inventoryHandler = new InventoryEventHandler(io);
    this.analyticsHandler = new AnalyticsEventHandler(io);
  }

  handleConnection(socket) {
    const { user } = socket;
    
    // Store client connection info
    this.connectedClients.set(socket.id, {
      socket,
      user,
      connectedAt: new Date(),
      lastActivity: new Date(),
    });

    // Join tenant and outlet rooms for targeted messaging
    socket.join(`tenant:${user.tenantId}`);
    if (user.outletId) {
      socket.join(`outlet:${user.outletId}`);
    }
    socket.join(`user:${user.id}`);

    // Setup event handlers
    this.setupEventHandlers(socket);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'WebSocket connection established',
      timestamp: new Date().toISOString(),
      rooms: Array.from(socket.rooms),
    });

    // Broadcast user online status to tenant
    socket.to(`tenant:${user.tenantId}`).emit('user:online', {
      userId: user.id,
      outletId: user.outletId,
      timestamp: new Date().toISOString(),
    });

    logger.info('Client setup completed', {
      socketId: socket.id,
      userId: user.id,
      tenantId: user.tenantId,
      outletId: user.outletId,
      rooms: Array.from(socket.rooms),
    });
  }

  handleDisconnection(socket) {
    const clientInfo = this.connectedClients.get(socket.id);
    
    if (clientInfo) {
      const { user } = clientInfo;
      
      // Broadcast user offline status to tenant
      socket.to(`tenant:${user.tenantId}`).emit('user:offline', {
        userId: user.id,
        outletId: user.outletId,
        timestamp: new Date().toISOString(),
      });

      // Remove from connected clients
      this.connectedClients.delete(socket.id);
    }
  }

  setupEventHandlers(socket) {
    // Update last activity on any event
    socket.onAny(() => {
      const clientInfo = this.connectedClients.get(socket.id);
      if (clientInfo) {
        clientInfo.lastActivity = new Date();
      }
    });

    // Order events
    socket.on('order:create', (data) => this.orderHandler.handleOrderCreate(socket, data));
    socket.on('order:update', (data) => this.orderHandler.handleOrderUpdate(socket, data));
    socket.on('order:status_change', (data) => this.orderHandler.handleOrderStatusChange(socket, data));
    socket.on('order:payment', (data) => this.orderHandler.handleOrderPayment(socket, data));

    // Kitchen events
    socket.on('kitchen:kot_update', (data) => this.kitchenHandler.handleKOTUpdate(socket, data));
    socket.on('kitchen:order_ready', (data) => this.kitchenHandler.handleOrderReady(socket, data));
    socket.on('kitchen:join_display', (data) => this.kitchenHandler.handleJoinDisplay(socket, data));

    // Inventory events
    socket.on('inventory:stock_update', (data) => this.inventoryHandler.handleStockUpdate(socket, data));
    socket.on('inventory:low_stock_alert', (data) => this.inventoryHandler.handleLowStockAlert(socket, data));
    socket.on('inventory:availability_change', (data) => this.inventoryHandler.handleAvailabilityChange(socket, data));

    // Analytics events
    socket.on('analytics:subscribe', (data) => this.analyticsHandler.handleSubscribe(socket, data));
    socket.on('analytics:unsubscribe', (data) => this.analyticsHandler.handleUnsubscribe(socket, data));

    // General events
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('join_room', (data) => {
      this.handleJoinRoom(socket, data);
    });

    socket.on('leave_room', (data) => {
      this.handleLeaveRoom(socket, data);
    });
  }

  handleJoinRoom(socket, data) {
    const { room } = data;
    const { user } = socket;

    // Validate room access based on user permissions
    if (this.canJoinRoom(user, room)) {
      socket.join(room);
      socket.emit('room:joined', { room, timestamp: new Date().toISOString() });
      
      logger.info('Client joined room', {
        socketId: socket.id,
        userId: user.id,
        room,
      });
    } else {
      socket.emit('error', {
        message: 'Access denied to room',
        room,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleLeaveRoom(socket, data) {
    const { room } = data;
    
    socket.leave(room);
    socket.emit('room:left', { room, timestamp: new Date().toISOString() });
    
    logger.info('Client left room', {
      socketId: socket.id,
      userId: socket.user.id,
      room,
    });
  }

  canJoinRoom(user, room) {
    // Basic room access validation
    if (room.startsWith(`tenant:${user.tenantId}`)) return true;
    if (room.startsWith(`outlet:${user.outletId}`)) return true;
    if (room.startsWith(`user:${user.id}`)) return true;
    
    // Role-based room access
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && room.startsWith('kitchen:')) return true;
    
    return false;
  }

  // Broadcast methods for external services
  broadcastToTenant(tenantId, event, data) {
    this.io.to(`tenant:${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToOutlet(outletId, event, data) {
    this.io.to(`outlet:${outletId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  // Get connection statistics
  getStats() {
    const now = new Date();
    const activeConnections = Array.from(this.connectedClients.values())
      .filter(client => (now - client.lastActivity) < 300000); // Active in last 5 minutes

    return {
      totalConnections: this.connectedClients.size,
      activeConnections: activeConnections.length,
      tenants: [...new Set(Array.from(this.connectedClients.values()).map(c => c.user.tenantId))],
      outlets: [...new Set(Array.from(this.connectedClients.values()).map(c => c.user.outletId).filter(Boolean))],
    };
  }
}

module.exports = WebSocketManager;
const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const jwt = require('jsonwebtoken');
const WebSocketManager = require('../src/services/WebSocketManager');

describe('WebSocketManager', () => {
  let httpServer;
  let io;
  let wsManager;
  let clientSocket;
  let serverSocket;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    wsManager = new WebSocketManager(io);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Create test token
      const token = jwt.sign(
        {
          id: 'user-1',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          role: 'staff',
          permissions: ['pos.use'],
        },
        process.env.JWT_SECRET || 'test-secret'
      );

      clientSocket = new Client(`http://localhost:${port}`, {
        auth: { token },
      });

      io.on('connection', (socket) => {
        socket.user = {
          id: 'user-1',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          role: 'staff',
          permissions: ['pos.use'],
        };
        serverSocket = socket;
        wsManager.handleConnection(socket);
      });

      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    httpServer.close();
  });

  afterEach(() => {
    clientSocket.removeAllListeners();
    if (serverSocket) {
      serverSocket.removeAllListeners();
    }
  });

  describe('Connection Management', () => {
    it('should handle client connection', (done) => {
      clientSocket.on('connected', (data) => {
        expect(data.message).toBe('WebSocket connection established');
        expect(data.rooms).toContain('tenant:tenant-1');
        expect(data.rooms).toContain('outlet:outlet-1');
        expect(data.rooms).toContain('user:user-1');
        done();
      });
    });

    it('should track connected clients', () => {
      expect(wsManager.connectedClients.size).toBeGreaterThan(0);
      const clientInfo = Array.from(wsManager.connectedClients.values())[0];
      expect(clientInfo.user.id).toBe('user-1');
      expect(clientInfo.user.tenantId).toBe('tenant-1');
    });

    it('should provide connection statistics', () => {
      const stats = wsManager.getStats();
      expect(stats.totalConnections).toBeGreaterThan(0);
      expect(stats.tenants).toContain('tenant-1');
      expect(stats.outlets).toContain('outlet-1');
    });
  });

  describe('Room Management', () => {
    it('should allow joining valid rooms', (done) => {
      clientSocket.emit('join_room', { room: 'kitchen:outlet-1' });
      
      clientSocket.on('room:joined', (data) => {
        expect(data.room).toBe('kitchen:outlet-1');
        done();
      });
    });

    it('should deny access to invalid rooms', (done) => {
      clientSocket.emit('join_room', { room: 'tenant:other-tenant' });
      
      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Access denied to room');
        done();
      });
    });

    it('should allow leaving rooms', (done) => {
      clientSocket.emit('leave_room', { room: 'kitchen:outlet-1' });
      
      clientSocket.on('room:left', (data) => {
        expect(data.room).toBe('kitchen:outlet-1');
        done();
      });
    });
  });

  describe('Event Handling', () => {
    it('should handle ping/pong', (done) => {
      clientSocket.emit('ping');
      
      clientSocket.on('pong', (data) => {
        expect(data.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle order creation events', (done) => {
      const orderData = {
        order: {
          id: 'order-1',
          outletId: 'outlet-1',
          items: [{ id: 'item-1', name: 'Test Item', quantity: 1, price: 10.99 }],
          total: 12.09,
          tableNumber: 5,
        },
      };

      // Listen for the broadcast
      clientSocket.on('order:new', (data) => {
        expect(data.order.id).toBe('order-1');
        expect(data.createdBy.id).toBe('user-1');
        done();
      });

      clientSocket.emit('order:create', orderData);
    });

    it('should handle kitchen events', (done) => {
      const kotData = {
        kotId: 'kot-1',
        status: 'preparing',
        estimatedTime: 15,
      };

      clientSocket.on('kitchen:kot_status_updated', (data) => {
        expect(data.kotId).toBe('kot-1');
        expect(data.status).toBe('preparing');
        done();
      });

      clientSocket.emit('kitchen:kot_update', kotData);
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast to tenant', (done) => {
      const testData = { message: 'Test broadcast' };
      
      clientSocket.on('test:event', (data) => {
        expect(data.message).toBe('Test broadcast');
        expect(data.timestamp).toBeDefined();
        done();
      });

      wsManager.broadcastToTenant('tenant-1', 'test:event', testData);
    });

    it('should broadcast to outlet', (done) => {
      const testData = { message: 'Outlet broadcast' };
      
      clientSocket.on('test:outlet', (data) => {
        expect(data.message).toBe('Outlet broadcast');
        done();
      });

      wsManager.broadcastToOutlet('outlet-1', 'test:outlet', testData);
    });

    it('should broadcast to specific user', (done) => {
      const testData = { message: 'User broadcast' };
      
      clientSocket.on('test:user', (data) => {
        expect(data.message).toBe('User broadcast');
        done();
      });

      wsManager.broadcastToUser('user-1', 'test:user', testData);
    });
  });

  describe('Permission Validation', () => {
    it('should validate room access based on user permissions', () => {
      const user = {
        id: 'user-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        role: 'staff',
      };

      expect(wsManager.canJoinRoom(user, 'tenant:tenant-1')).toBe(true);
      expect(wsManager.canJoinRoom(user, 'outlet:outlet-1')).toBe(true);
      expect(wsManager.canJoinRoom(user, 'user:user-1')).toBe(true);
      expect(wsManager.canJoinRoom(user, 'tenant:other-tenant')).toBe(false);
    });

    it('should allow admin access to all rooms', () => {
      const adminUser = {
        id: 'admin-1',
        tenantId: 'tenant-1',
        outletId: 'outlet-1',
        role: 'admin',
      };

      expect(wsManager.canJoinRoom(adminUser, 'tenant:other-tenant')).toBe(true);
      expect(wsManager.canJoinRoom(adminUser, 'kitchen:any-outlet')).toBe(true);
    });
  });
});
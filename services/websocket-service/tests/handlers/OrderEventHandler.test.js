const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const OrderEventHandler = require('../../src/services/handlers/OrderEventHandler');

describe('OrderEventHandler', () => {
  let httpServer;
  let io;
  let orderHandler;
  let clientSocket;
  let serverSocket;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    orderHandler = new OrderEventHandler(io);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);

      io.on('connection', (socket) => {
        socket.user = {
          id: 'user-1',
          name: 'Test User',
          tenantId: 'tenant-1',
          outletId: 'outlet-1',
          role: 'staff',
        };
        serverSocket = socket;
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

  describe('Order Creation', () => {
    it('should handle valid order creation', async () => {
      const orderData = {
        order: {
          id: 'order-1',
          orderNumber: 'ORD-001',
          outletId: 'outlet-1',
          tableNumber: 5,
          items: [
            { id: 'item-1', name: 'Burger', quantity: 2, price: 12.99 },
            { id: 'item-2', name: 'Fries', quantity: 1, price: 4.99 },
          ],
          total: 30.97,
          specialInstructions: 'No onions',
        },
      };

      const orderCreatedPromise = new Promise((resolve) => {
        clientSocket.on('order:created', resolve);
      });

      const newOrderPromise = new Promise((resolve) => {
        clientSocket.on('order:new', resolve);
      });

      const kitchenOrderPromise = new Promise((resolve) => {
        clientSocket.on('kitchen:new_order', resolve);
      });

      await orderHandler.handleOrderCreate(serverSocket, orderData);

      const [orderCreated, newOrder, kitchenOrder] = await Promise.all([
        orderCreatedPromise,
        newOrderPromise,
        kitchenOrderPromise,
      ]);

      expect(orderCreated.orderId).toBe('order-1');
      expect(newOrder.order.id).toBe('order-1');
      expect(newOrder.createdBy.id).toBe('user-1');
      expect(kitchenOrder.orderId).toBe('order-1');
      expect(kitchenOrder.items).toHaveLength(2);
    });

    it('should reject invalid order data', async () => {
      const invalidOrderData = {
        order: null,
      };

      const errorPromise = new Promise((resolve) => {
        serverSocket.on('error', resolve);
      });

      await orderHandler.handleOrderCreate(serverSocket, invalidOrderData);

      const error = await errorPromise;
      expect(error.message).toBe('Invalid order data');
    });

    it('should reject orders for unauthorized outlets', async () => {
      const orderData = {
        order: {
          id: 'order-1',
          outletId: 'other-outlet',
          items: [],
          total: 0,
        },
      };

      const errorPromise = new Promise((resolve) => {
        serverSocket.on('error', resolve);
      });

      await orderHandler.handleOrderCreate(serverSocket, orderData);

      const error = await errorPromise;
      expect(error.message).toBe('Access denied for this outlet');
    });
  });

  describe('Order Updates', () => {
    it('should handle order updates', async () => {
      const updateData = {
        orderId: 'order-1',
        updates: {
          items: [
            { id: 'item-1', name: 'Burger', quantity: 3, price: 12.99 },
          ],
          total: 38.97,
        },
      };

      const updateConfirmedPromise = new Promise((resolve) => {
        serverSocket.on('order:update_confirmed', resolve);
      });

      const orderUpdatedPromise = new Promise((resolve) => {
        clientSocket.on('order:updated', resolve);
      });

      const kitchenModifiedPromise = new Promise((resolve) => {
        clientSocket.on('kitchen:order_modified', resolve);
      });

      await orderHandler.handleOrderUpdate(serverSocket, updateData);

      const [updateConfirmed, orderUpdated, kitchenModified] = await Promise.all([
        updateConfirmedPromise,
        orderUpdatedPromise,
        kitchenModifiedPromise,
      ]);

      expect(updateConfirmed.orderId).toBe('order-1');
      expect(orderUpdated.orderId).toBe('order-1');
      expect(orderUpdated.updatedBy.id).toBe('user-1');
      expect(kitchenModified.orderId).toBe('order-1');
    });

    it('should reject invalid update data', async () => {
      const invalidUpdateData = {
        orderId: null,
        updates: {},
      };

      const errorPromise = new Promise((resolve) => {
        serverSocket.on('error', resolve);
      });

      await orderHandler.handleOrderUpdate(serverSocket, invalidUpdateData);

      const error = await errorPromise;
      expect(error.message).toBe('Invalid update data');
    });
  });

  describe('Status Changes', () => {
    it('should handle order status changes', async () => {
      const statusData = {
        orderId: 'order-1',
        status: 'preparing',
        previousStatus: 'confirmed',
      };

      const statusConfirmedPromise = new Promise((resolve) => {
        serverSocket.on('order:status_change_confirmed', resolve);
      });

      const statusChangedPromise = new Promise((resolve) => {
        clientSocket.on('order:status_changed', resolve);
      });

      const preparationStartedPromise = new Promise((resolve) => {
        clientSocket.on('order:preparation_started', resolve);
      });

      await orderHandler.handleOrderStatusChange(serverSocket, statusData);

      const [statusConfirmed, statusChanged, preparationStarted] = await Promise.all([
        statusConfirmedPromise,
        statusChangedPromise,
        preparationStartedPromise,
      ]);

      expect(statusConfirmed.orderId).toBe('order-1');
      expect(statusConfirmed.status).toBe('preparing');
      expect(statusChanged.status).toBe('preparing');
      expect(statusChanged.changedBy.id).toBe('user-1');
      expect(preparationStarted.orderId).toBe('order-1');
    });

    it('should handle order completion', async () => {
      const statusData = {
        orderId: 'order-1',
        status: 'completed',
        previousStatus: 'ready',
      };

      const analyticsPromise = new Promise((resolve) => {
        clientSocket.on('analytics:order_completed', resolve);
      });

      await orderHandler.handleOrderStatusChange(serverSocket, statusData);

      const analytics = await analyticsPromise;
      expect(analytics.orderId).toBe('order-1');
      expect(analytics.outletId).toBe('outlet-1');
    });

    it('should handle order cancellation', async () => {
      const statusData = {
        orderId: 'order-1',
        status: 'cancelled',
        previousStatus: 'confirmed',
      };

      const kitchenCancelledPromise = new Promise((resolve) => {
        clientSocket.on('kitchen:order_cancelled', resolve);
      });

      await orderHandler.handleOrderStatusChange(serverSocket, statusData);

      const kitchenCancelled = await kitchenCancelledPromise;
      expect(kitchenCancelled.orderId).toBe('order-1');
    });
  });

  describe('Payment Processing', () => {
    it('should handle payment completion', async () => {
      const paymentData = {
        orderId: 'order-1',
        paymentData: {
          method: 'card',
          amount: 30.97,
          transactionId: 'txn-123',
        },
      };

      const paymentConfirmedPromise = new Promise((resolve) => {
        serverSocket.on('order:payment_confirmed', resolve);
      });

      const paymentCompletedPromise = new Promise((resolve) => {
        clientSocket.on('order:payment_completed', resolve);
      });

      const analyticsPromise = new Promise((resolve) => {
        clientSocket.on('analytics:payment_processed', resolve);
      });

      await orderHandler.handleOrderPayment(serverSocket, paymentData);

      const [paymentConfirmed, paymentCompleted, analytics] = await Promise.all([
        paymentConfirmedPromise,
        paymentCompletedPromise,
        analyticsPromise,
      ]);

      expect(paymentConfirmed.orderId).toBe('order-1');
      expect(paymentCompleted.orderId).toBe('order-1');
      expect(paymentCompleted.paymentMethod).toBe('card');
      expect(paymentCompleted.amount).toBe(30.97);
      expect(analytics.orderId).toBe('order-1');
      expect(analytics.method).toBe('card');
    });

    it('should reject invalid payment data', async () => {
      const invalidPaymentData = {
        orderId: null,
        paymentData: null,
      };

      const errorPromise = new Promise((resolve) => {
        serverSocket.on('error', resolve);
      });

      await orderHandler.handleOrderPayment(serverSocket, invalidPaymentData);

      const error = await errorPromise;
      expect(error.message).toBe('Invalid payment data');
    });
  });
});
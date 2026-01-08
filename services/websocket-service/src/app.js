const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('./utils/logger');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const WebSocketManager = require('./services/WebSocketManager');
const RedisAdapter = require('./services/RedisAdapter');

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',  // API Gateway
    'http://localhost:3001',  // Tenant Service
    'http://localhost:3002',  // POS Interface
    'http://localhost:3011'   // Admin Dashboard
  ],
  credentials: true,
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'websocket-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize Redis adapter for scaling
const redisAdapter = new RedisAdapter();
redisAdapter.setupAdapter(io);

// Initialize WebSocket manager
const wsManager = new WebSocketManager(io);

// Authentication middleware for Socket.IO
io.use(authMiddleware);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`, {
    userId: socket.user?.id,
    tenantId: socket.user?.tenantId,
    outletId: socket.user?.outletId,
  });

  wsManager.handleConnection(socket);

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}`, {
      reason,
      userId: socket.user?.id,
    });
    wsManager.handleDisconnection(socket);
  });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3010;

server.listen(PORT, () => {
  logger.info(`WebSocket service running on port ${PORT}`);
});

module.exports = { app, server, io };
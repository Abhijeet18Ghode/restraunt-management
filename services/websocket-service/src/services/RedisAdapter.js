const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const logger = require('../utils/logger');

class RedisAdapter {
  constructor() {
    this.pubClient = null;
    this.subClient = null;
  }

  async setupAdapter(io) {
    try {
      // Create Redis clients
      this.pubClient = createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.subClient = this.pubClient.duplicate();

      // Connect clients
      await Promise.all([
        this.pubClient.connect(),
        this.subClient.connect(),
      ]);

      // Setup Socket.IO Redis adapter
      io.adapter(createAdapter(this.pubClient, this.subClient));

      logger.info('Redis adapter configured successfully');

      // Handle Redis connection events
      this.pubClient.on('error', (err) => {
        logger.error('Redis pub client error', { error: err.message });
      });

      this.subClient.on('error', (err) => {
        logger.error('Redis sub client error', { error: err.message });
      });

      this.pubClient.on('connect', () => {
        logger.info('Redis pub client connected');
      });

      this.subClient.on('connect', () => {
        logger.info('Redis sub client connected');
      });

    } catch (error) {
      logger.error('Failed to setup Redis adapter', { error: error.message });
      // Continue without Redis adapter for development
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Continuing without Redis adapter in development mode');
      } else {
        throw error;
      }
    }
  }

  async disconnect() {
    try {
      if (this.pubClient) {
        await this.pubClient.disconnect();
      }
      if (this.subClient) {
        await this.subClient.disconnect();
      }
      logger.info('Redis clients disconnected');
    } catch (error) {
      logger.error('Error disconnecting Redis clients', { error: error.message });
    }
  }

  // Utility methods for direct Redis operations
  async set(key, value, expiration = null) {
    try {
      if (this.pubClient) {
        if (expiration) {
          await this.pubClient.setEx(key, expiration, JSON.stringify(value));
        } else {
          await this.pubClient.set(key, JSON.stringify(value));
        }
      }
    } catch (error) {
      logger.error('Redis SET error', { key, error: error.message });
    }
  }

  async get(key) {
    try {
      if (this.pubClient) {
        const value = await this.pubClient.get(key);
        return value ? JSON.parse(value) : null;
      }
      return null;
    } catch (error) {
      logger.error('Redis GET error', { key, error: error.message });
      return null;
    }
  }

  async del(key) {
    try {
      if (this.pubClient) {
        await this.pubClient.del(key);
      }
    } catch (error) {
      logger.error('Redis DEL error', { key, error: error.message });
    }
  }
}

module.exports = RedisAdapter;
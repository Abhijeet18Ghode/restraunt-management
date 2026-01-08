const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const ServiceDiscovery = require('./ServiceDiscovery');

class ServiceOrchestrator {
  constructor() {
    this.services = new Map();
    this.serviceDiscovery = new ServiceDiscovery();
    this.startupOrder = [
      'tenant-service',
      'menu-service',
      'inventory-service',
      'pos-service',
      'online-order-service',
      'staff-service',
      'customer-service',
      'analytics-service',
      'payment-service',
      'websocket-service'
    ];
    
    this.serviceConfigs = {
      'tenant-service': { port: 3001, path: 'services/tenant-service' },
      'menu-service': { port: 3002, path: 'services/menu-service' },
      'inventory-service': { port: 3003, path: 'services/inventory-service' },
      'pos-service': { port: 3004, path: 'services/pos-service' },
      'online-order-service': { port: 3005, path: 'services/online-order-service' },
      'staff-service': { port: 3006, path: 'services/staff-service' },
      'customer-service': { port: 3007, path: 'services/customer-service' },
      'analytics-service': { port: 3008, path: 'services/analytics-service' },
      'payment-service': { port: 3009, path: 'services/payment-service' },
      'websocket-service': { port: 3010, path: 'services/websocket-service' }
    };
  }

  async startService(serviceName) {
    if (this.services.has(serviceName)) {
      logger.warn(`Service ${serviceName} is already running`);
      return;
    }

    const config = this.serviceConfigs[serviceName];
    if (!config) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    try {
      // Check if service directory exists
      const servicePath = path.resolve(process.cwd(), config.path);
      await fs.access(servicePath);

      logger.info(`Starting service: ${serviceName}`);

      // Set environment variables for the service
      const env = {
        ...process.env,
        PORT: config.port,
        NODE_ENV: process.env.NODE_ENV || 'development',
        SERVICE_NAME: serviceName,
        API_GATEWAY_URL: 'http://localhost:3000'
      };

      // Start the service process
      const serviceProcess = spawn('node', ['src/app.js'], {
        cwd: servicePath,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle service output
      serviceProcess.stdout.on('data', (data) => {
        logger.info(`[${serviceName}] ${data.toString().trim()}`);
      });

      serviceProcess.stderr.on('data', (data) => {
        logger.error(`[${serviceName}] ${data.toString().trim()}`);
      });

      serviceProcess.on('close', (code) => {
        logger.warn(`Service ${serviceName} exited with code ${code}`);
        this.services.delete(serviceName);
      });

      serviceProcess.on('error', (error) => {
        logger.error(`Failed to start service ${serviceName}:`, error);
        this.services.delete(serviceName);
      });

      // Store service process
      this.services.set(serviceName, {
        process: serviceProcess,
        config,
        startTime: new Date(),
        status: 'starting'
      });

      // Wait for service to be ready
      await this.waitForServiceReady(serviceName, config.port);

      // Register service with discovery
      await this.serviceDiscovery.registerService(serviceName, {
        host: 'localhost',
        port: config.port,
        tags: [serviceName, 'microservice']
      });

      this.services.get(serviceName).status = 'running';
      logger.info(`Service ${serviceName} started successfully on port ${config.port}`);

    } catch (error) {
      logger.error(`Failed to start service ${serviceName}:`, error);
      throw error;
    }
  }

  async stopService(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      logger.warn(`Service ${serviceName} is not running`);
      return;
    }

    logger.info(`Stopping service: ${serviceName}`);

    try {
      // Deregister from service discovery
      await this.serviceDiscovery.deregisterService(
        serviceName, 
        `${serviceName}-${service.config.port}`
      );

      // Gracefully terminate the process
      service.process.kill('SIGTERM');

      // Wait for graceful shutdown, then force kill if needed
      setTimeout(() => {
        if (this.services.has(serviceName)) {
          logger.warn(`Force killing service: ${serviceName}`);
          service.process.kill('SIGKILL');
        }
      }, 10000); // 10 second timeout

      this.services.delete(serviceName);
      logger.info(`Service ${serviceName} stopped`);

    } catch (error) {
      logger.error(`Error stopping service ${serviceName}:`, error);
    }
  }

  async startAllServices() {
    logger.info('Starting all services in order...');

    for (const serviceName of this.startupOrder) {
      try {
        await this.startService(serviceName);
        // Wait a bit between service starts to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`Failed to start ${serviceName}, continuing with other services:`, error);
      }
    }

    logger.info('All services startup completed');
  }

  async stopAllServices() {
    logger.info('Stopping all services...');

    // Stop services in reverse order
    const stopOrder = [...this.startupOrder].reverse();
    
    for (const serviceName of stopOrder) {
      try {
        await this.stopService(serviceName);
      } catch (error) {
        logger.error(`Error stopping ${serviceName}:`, error);
      }
    }

    logger.info('All services stopped');
  }

  async waitForServiceReady(serviceName, port, timeout = 30000) {
    const startTime = Date.now();
    const checkInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          logger.info(`Service ${serviceName} is ready`);
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Service ${serviceName} did not become ready within ${timeout}ms`);
  }

  getServiceStatus(serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      return { status: 'stopped' };
    }

    return {
      status: service.status,
      startTime: service.startTime,
      uptime: Date.now() - service.startTime.getTime(),
      port: service.config.port,
      pid: service.process.pid
    };
  }

  getAllServicesStatus() {
    const status = {};
    
    for (const serviceName of this.startupOrder) {
      status[serviceName] = this.getServiceStatus(serviceName);
    }

    return status;
  }

  async restartService(serviceName) {
    logger.info(`Restarting service: ${serviceName}`);
    
    await this.stopService(serviceName);
    
    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await this.startService(serviceName);
  }

  async healthCheck() {
    const results = {};
    
    for (const [serviceName, config] of Object.entries(this.serviceConfigs)) {
      try {
        const response = await fetch(`http://localhost:${config.port}/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          const healthData = await response.json();
          results[serviceName] = {
            status: 'healthy',
            ...healthData
          };
        } else {
          results[serviceName] = {
            status: 'unhealthy',
            error: `HTTP ${response.status}`
          };
        }
      } catch (error) {
        results[serviceName] = {
          status: 'unreachable',
          error: error.message
        };
      }
    }

    return results;
  }

  // Graceful shutdown handler
  async gracefulShutdown() {
    logger.info('Initiating graceful shutdown...');
    
    try {
      await this.stopAllServices();
      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
    }
  }
}

module.exports = ServiceOrchestrator;
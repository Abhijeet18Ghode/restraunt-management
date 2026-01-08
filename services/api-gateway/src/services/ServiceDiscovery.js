const logger = require('../utils/logger');

class ServiceDiscovery {
  constructor() {
    // Only try to connect to consul if explicitly enabled
    this.useConsul = process.env.USE_CONSUL === 'true';
    
    if (this.useConsul) {
      const consul = require('consul');
      this.consul = consul({
        host: process.env.CONSUL_HOST || 'localhost',
        port: process.env.CONSUL_PORT || 8500
      });
    }
    
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    
    // Initialize with fallback URLs
    this.initializeFallbackUrls();
  }

  initializeFallbackUrls() {
    const fallbackUrls = {
      'tenant-service': 'http://localhost:3001',
      'menu-service': 'http://localhost:3002',
      'inventory-service': 'http://localhost:3003',
      'pos-service': 'http://localhost:3004',
      'online-order-service': 'http://localhost:3005',
      'staff-service': 'http://localhost:3006',
      'customer-service': 'http://localhost:3007',
      'analytics-service': 'http://localhost:3008',
      'payment-service': 'http://localhost:3009'
    };

    Object.entries(fallbackUrls).forEach(([serviceName, url]) => {
      this.services.set(serviceName, url);
    });
  }

  async registerService(serviceName, serviceConfig) {
    if (!this.useConsul) {
      logger.info(`Service registration skipped (consul disabled): ${serviceName}`);
      return;
    }

    try {
      const registration = {
        name: serviceName,
        id: `${serviceName}-${serviceConfig.port}`,
        address: serviceConfig.host,
        port: serviceConfig.port,
        check: {
          http: `http://${serviceConfig.host}:${serviceConfig.port}/health`,
          interval: '10s'
        },
        tags: serviceConfig.tags || []
      };

      await this.consul.agent.service.register(registration);
      logger.info(`Service registered: ${serviceName}`, registration);
    } catch (error) {
      logger.error(`Failed to register service ${serviceName}:`, error);
    }
  }

  async discoverService(serviceName) {
    // If consul is disabled, just return the fallback URL
    if (!this.useConsul) {
      const fallbackUrl = this.services.get(serviceName);
      if (fallbackUrl) {
        logger.debug(`Using fallback URL for ${serviceName}: ${fallbackUrl}`);
        return fallbackUrl;
      }
      throw new Error(`No fallback URL configured for ${serviceName}`);
    }

    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true
      });

      if (!services || services.length === 0) {
        throw new Error(`No healthy instances of ${serviceName} found`);
      }

      // Simple round-robin load balancing
      const service = services[Math.floor(Math.random() * services.length)];
      const serviceUrl = `http://${service.Service.Address}:${service.Service.Port}`;
      
      this.services.set(serviceName, serviceUrl);
      return serviceUrl;
    } catch (error) {
      logger.error(`Failed to discover service ${serviceName}:`, error);
      
      // Fallback to hardcoded service URLs
      const fallbackUrl = this.services.get(serviceName);
      if (fallbackUrl) {
        logger.warn(`Using fallback URL for ${serviceName}: ${fallbackUrl}`);
        return fallbackUrl;
      }

      throw error;
    }
  }

  async getServiceUrl(serviceName) {
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName);
    }

    return await this.discoverService(serviceName);
  }

  async deregisterService(serviceName, serviceId) {
    if (!this.useConsul) {
      logger.info(`Service deregistration skipped (consul disabled): ${serviceName}`);
      return;
    }

    try {
      await this.consul.agent.service.deregister(serviceId);
      logger.info(`Service deregistered: ${serviceName}`);
    } catch (error) {
      logger.error(`Failed to deregister service ${serviceName}:`, error);
    }
  }

  startHealthCheck() {
    if (!this.useConsul) {
      logger.info('Health check skipped (consul disabled)');
      return;
    }

    setInterval(async () => {
      try {
        // Refresh service discovery cache
        for (const serviceName of this.services.keys()) {
          await this.discoverService(serviceName);
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, this.healthCheckInterval);
  }
}

module.exports = ServiceDiscovery;
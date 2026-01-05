const consul = require('consul');
const logger = require('../utils/logger');

class ServiceDiscovery {
  constructor() {
    this.consul = consul({
      host: process.env.CONSUL_HOST || 'localhost',
      port: process.env.CONSUL_PORT || 8500
    });
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
  }

  async registerService(serviceName, serviceConfig) {
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
    try {
      const services = await this.consul.health.service({
        service: serviceName,
        passing: true
      });

      if (services.length === 0) {
        throw new Error(`No healthy instances of ${serviceName} found`);
      }

      // Simple round-robin load balancing
      const service = services[Math.floor(Math.random() * services.length)];
      const serviceUrl = `http://${service.Service.Address}:${service.Service.Port}`;
      
      this.services.set(serviceName, serviceUrl);
      return serviceUrl;
    } catch (error) {
      logger.error(`Failed to discover service ${serviceName}:`, error);
      
      // Fallback to hardcoded service URLs for development
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

      const fallbackUrl = fallbackUrls[serviceName];
      if (fallbackUrl) {
        logger.warn(`Using fallback URL for ${serviceName}: ${fallbackUrl}`);
        this.services.set(serviceName, fallbackUrl);
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
    try {
      await this.consul.agent.service.deregister(serviceId);
      logger.info(`Service deregistered: ${serviceName}`);
    } catch (error) {
      logger.error(`Failed to deregister service ${serviceName}:`, error);
    }
  }

  startHealthCheck() {
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
const logger = require('../utils/logger');

class LoadBalancer {
  constructor() {
    this.serviceInstances = new Map();
    this.currentIndex = new Map();
  }

  addServiceInstance(serviceName, instances) {
    this.serviceInstances.set(serviceName, instances);
    this.currentIndex.set(serviceName, 0);
  }

  // Round-robin load balancing
  getNextInstance(serviceName) {
    const instances = this.serviceInstances.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`No instances available for service: ${serviceName}`);
    }

    const currentIdx = this.currentIndex.get(serviceName) || 0;
    const instance = instances[currentIdx];
    
    // Update index for next request
    const nextIndex = (currentIdx + 1) % instances.length;
    this.currentIndex.set(serviceName, nextIndex);

    logger.debug(`Load balancer selected instance for ${serviceName}:`, {
      instance: instance.url,
      currentIndex: currentIdx,
      totalInstances: instances.length
    });

    return instance;
  }

  // Weighted round-robin (for future enhancement)
  getWeightedInstance(serviceName) {
    const instances = this.serviceInstances.get(serviceName);
    if (!instances || instances.length === 0) {
      throw new Error(`No instances available for service: ${serviceName}`);
    }

    // For now, just use round-robin
    // TODO: Implement weighted selection based on instance capacity/health
    return this.getNextInstance(serviceName);
  }

  // Health check and remove unhealthy instances
  markInstanceUnhealthy(serviceName, instanceUrl) {
    const instances = this.serviceInstances.get(serviceName);
    if (instances) {
      const healthyInstances = instances.filter(instance => instance.url !== instanceUrl);
      this.serviceInstances.set(serviceName, healthyInstances);
      
      logger.warn(`Marked instance as unhealthy: ${instanceUrl}`, {
        serviceName,
        remainingInstances: healthyInstances.length
      });
    }
  }

  // Get service statistics
  getServiceStats(serviceName) {
    const instances = this.serviceInstances.get(serviceName);
    return {
      serviceName,
      totalInstances: instances ? instances.length : 0,
      currentIndex: this.currentIndex.get(serviceName) || 0,
      instances: instances || []
    };
  }

  // Get all services statistics
  getAllStats() {
    const stats = {};
    for (const serviceName of this.serviceInstances.keys()) {
      stats[serviceName] = this.getServiceStats(serviceName);
    }
    return stats;
  }
}

module.exports = LoadBalancer;
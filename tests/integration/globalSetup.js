const SystemManager = require('../../scripts/start-system');

module.exports = async () => {
  console.log('🚀 Starting global setup for integration tests...');
  
  // Check if system is already running
  try {
    const response = await fetch('http://localhost:3000/health');
    if (response.ok) {
      console.log('✅ System is already running');
      return;
    }
  } catch (error) {
    // System is not running, we need to start it
  }
  
  console.log('🔧 Starting Restaurant Management System...');
  
  // Start the system
  const systemManager = new SystemManager();
  
  try {
    await systemManager.startAllServices();
    console.log('✅ All services started successfully');
    
    // Wait for services to be fully ready
    console.log('⏳ Waiting for services to be fully ready...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verify all services are responding
    const healthCheck = await systemManager.healthCheck();
    const healthyServices = Object.entries(healthCheck)
      .filter(([name, health]) => health.status === 'healthy')
      .map(([name]) => name);
    
    console.log(`✅ ${healthyServices.length} services are healthy`);
    
    // Store system manager globally for cleanup
    global.__SYSTEM_MANAGER__ = systemManager;
    
  } catch (error) {
    console.error('❌ Failed to start system:', error);
    throw error;
  }
};
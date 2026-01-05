module.exports = async () => {
  console.log('🧹 Starting global teardown for integration tests...');
  
  // Get the system manager from global setup
  const systemManager = global.__SYSTEM_MANAGER__;
  
  if (systemManager) {
    try {
      console.log('🛑 Stopping all services...');
      await systemManager.stopAllServices();
      console.log('✅ All services stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping services:', error);
    }
  } else {
    console.log('ℹ️  No system manager found, services may have been started externally');
  }
  
  console.log('✅ Global teardown completed');
};
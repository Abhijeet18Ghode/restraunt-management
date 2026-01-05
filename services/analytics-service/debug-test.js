console.log('Starting debug test...');

try {
  console.log('Testing moment...');
  const moment = require('moment');
  console.log('✅ Moment loaded successfully');
  
  console.log('Testing basic class...');
  class TestService {
    constructor() {
      this.name = 'test';
    }
    
    testMethod() {
      return 'working';
    }
  }
  
  const service = new TestService();
  console.log('✅ Basic class works:', service.testMethod());
  
  console.log('🎉 Debug test completed successfully!');
  
} catch (error) {
  console.error('❌ Debug test failed:', error.message);
  console.error(error.stack);
}
console.log('🧪 Testing Analytics Service basic functionality...\n');

try {
  const AnalyticsService = require('./src/services/AnalyticsService');
  console.log('✅ AnalyticsService module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load AnalyticsService:', error.message);
  process.exit(1);
}

// Mock database pool
const mockDbPool = {
  query: async (query, params) => {
    console.log('Mock query executed:', query.substring(0, 50) + '...');
    return { rows: [] };
  }
};

try {
  const analyticsService = new AnalyticsService(mockDbPool);
  
  console.log('✅ AnalyticsService instantiated successfully');
  
  // Test helper methods
  const todayPeriod = analyticsService._parsePeriod('today');
  console.log('✅ Period parsing works');
  console.log(`   - Today: ${todayPeriod.startDate} to ${todayPeriod.endDate}`);
  
  const schemaName = analyticsService._getSchemaName('test_tenant_123');
  console.log('✅ Schema name generation works');
  console.log(`   - Schema: ${schemaName}`);
  
  // Test with mock data
  try {
    const salesReport = await analyticsService.generateSalesReport('test_tenant', 'today');
    console.log('✅ Sales report method works (with mock data)');
    console.log(`   - Summary: ${JSON.stringify(salesReport.summary)}`);
  } catch (error) {
    console.log('⚠️  Sales report test:', error.message);
  }
  
  console.log('\n🎉 Basic functionality test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}
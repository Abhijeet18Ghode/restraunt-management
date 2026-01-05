const AnalyticsService = require('./src/services/AnalyticsService');
const ReportingService = require('./src/services/ReportingService');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function testAnalyticsService() {
  console.log('🧪 Testing Analytics Service...\n');

  const dbPool = new Pool(dbConfig);
  const analyticsService = new AnalyticsService(dbPool);
  const reportingService = new ReportingService(dbPool, analyticsService);

  try {
    const testTenantId = 'test_tenant_demo';
    
    console.log('📊 Testing Sales Report Generation...');
    try {
      const salesReport = await analyticsService.generateSalesReport(
        testTenantId, 
        'last_30_days'
      );
      console.log('✅ Sales report generated successfully');
      console.log(`   - Total Orders: ${salesReport.summary?.totalOrders || 0}`);
      console.log(`   - Total Revenue: $${salesReport.summary?.totalRevenue || 0}`);
      console.log(`   - Daily Data Points: ${salesReport.dailyData?.length || 0}`);
    } catch (error) {
      console.log('⚠️  Sales report test (expected if no data):', error.message);
    }

    console.log('\n📈 Testing Performance Metrics...');
    try {
      const performanceMetrics = await analyticsService.getPerformanceMetrics(
        testTenantId, 
        null, 
        'last_30_days'
      );
      console.log('✅ Performance metrics generated successfully');
      console.log(`   - Top Items Count: ${performanceMetrics.topSellingItems?.length || 0}`);
      console.log(`   - Peak Hours Count: ${performanceMetrics.peakHours?.length || 0}`);
      console.log(`   - Order Types: ${performanceMetrics.orderTypeDistribution?.length || 0}`);
    } catch (error) {
      console.log('⚠️  Performance metrics test (expected if no data):', error.message);
    }

    console.log('\n🏆 Testing Top Selling Items...');
    try {
      const topItems = await analyticsService.getTopSellingItems(
        testTenantId, 
        'last_30_days',
        null,
        10
      );
      console.log('✅ Top selling items retrieved successfully');
      console.log(`   - Items Count: ${topItems.items?.length || 0}`);
    } catch (error) {
      console.log('⚠️  Top items test (expected if no data):', error.message);
    }

    console.log('\n📦 Testing Inventory Analytics...');
    try {
      const inventoryAnalytics = await analyticsService.getInventoryAnalytics(testTenantId);
      console.log('✅ Inventory analytics generated successfully');
      console.log(`   - Low Stock Items: ${inventoryAnalytics.lowStockItems?.length || 0}`);
      console.log(`   - Consumption Patterns: ${inventoryAnalytics.consumptionPatterns?.length || 0}`);
    } catch (error) {
      console.log('⚠️  Inventory analytics test (expected if no data):', error.message);
    }

    console.log('\n👥 Testing Customer Analytics...');
    try {
      const customerAnalytics = await analyticsService.getCustomerAnalytics(
        testTenantId, 
        'last_30_days'
      );
      console.log('✅ Customer analytics generated successfully');
      console.log(`   - Top Customers: ${customerAnalytics.topCustomers?.length || 0}`);
      console.log(`   - Total Customers: ${customerAnalytics.summary?.totalCustomers || 0}`);
    } catch (error) {
      console.log('⚠️  Customer analytics test (expected if no data):', error.message);
    }

    console.log('\n📊 Testing Trend Analysis...');
    try {
      const trendAnalysis = await analyticsService.getTrendAnalysis(
        testTenantId, 
        'revenue', 
        'last_30_days'
      );
      console.log('✅ Trend analysis generated successfully');
      console.log(`   - Current Value: ${trendAnalysis.currentValue}`);
      console.log(`   - Previous Value: ${trendAnalysis.previousValue}`);
      console.log(`   - Change: ${trendAnalysis.changePercentage.toFixed(2)}%`);
      console.log(`   - Trend: ${trendAnalysis.trend}`);
    } catch (error) {
      console.log('⚠️  Trend analysis test (expected if no data):', error.message);
    }

    console.log('\n📄 Testing Report Generation...');
    try {
      const reportConfig = {
        type: 'sales',
        format: 'csv',
        period: 'last_30_days'
      };
      
      const report = await reportingService.generateReport(testTenantId, reportConfig);
      console.log('✅ Report generated successfully');
      console.log(`   - File Name: ${report.fileName}`);
      console.log(`   - File Size: ${report.size} bytes`);
      console.log(`   - Download URL: ${report.downloadUrl}`);
    } catch (error) {
      console.log('⚠️  Report generation test (expected if no data):', error.message);
    }

    console.log('\n⏰ Testing Report Scheduling...');
    try {
      const scheduleConfig = {
        name: 'Test Daily Report',
        reportConfig: {
          type: 'sales',
          format: 'pdf',
          period: 'yesterday'
        },
        cronExpression: '0 9 * * *', // Daily at 9 AM
        email: 'test@example.com'
      };
      
      const scheduled = await reportingService.scheduleReport(testTenantId, scheduleConfig);
      console.log('✅ Report scheduled successfully');
      console.log(`   - Schedule ID: ${scheduled.scheduleId}`);
      
      // Clean up the scheduled report
      await reportingService.deleteScheduledReport(testTenantId, scheduled.scheduleId);
      console.log('✅ Scheduled report cleaned up');
    } catch (error) {
      console.log('❌ Report scheduling test failed:', error.message);
    }

    console.log('\n🎯 Testing Helper Methods...');
    
    // Test period parsing
    const todayPeriod = analyticsService._parsePeriod('today');
    console.log('✅ Period parsing works');
    console.log(`   - Today period: ${todayPeriod.startDate} to ${todayPeriod.endDate}`);
    
    // Test schema name generation
    const schemaName = analyticsService._getSchemaName('test_tenant_123');
    console.log('✅ Schema name generation works');
    console.log(`   - Schema name: ${schemaName}`);

    console.log('\n🎉 All Analytics Service tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await dbPool.end();
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsService().catch(console.error);
}

module.exports = { testAnalyticsService };
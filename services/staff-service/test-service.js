// Set environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '24h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '10';

const StaffService = require('./src/services/StaffService');
const AttendanceService = require('./src/services/AttendanceService');
const PerformanceService = require('./src/services/PerformanceService');
const { DatabaseManager } = require('@rms/shared');

async function testStaffService() {
  console.log('🧪 Testing Staff Management Service...\n');

  const dbManager = new DatabaseManager();
  const staffService = new StaffService(dbManager);
  const attendanceService = new AttendanceService(dbManager);
  const performanceService = new PerformanceService(dbManager);

  try {
    // Test 1: Register Staff Member
    console.log('1️⃣ Testing Staff Registration...');
    const staffData = {
      email: 'john.doe@restaurant.com',
      password: 'securePassword123',
      firstName: 'John',
      lastName: 'Doe',
      role: 'WAITER',
      phone: '+1234567890',
      outletId: 'outlet-123',
      department: 'Service',
      position: 'Senior Waiter',
      salary: 45000,
      hireDate: '2024-01-01',
      emergencyContact: {
        name: 'Jane Doe',
        phone: '+1234567891',
        relationship: 'Spouse',
      },
    };

    const registrationResult = await staffService.registerStaff('tenant-1', staffData, 'admin-1');
    console.log('✅ Staff registered successfully:', registrationResult.data.firstName, registrationResult.data.lastName);
    console.log('   Role:', registrationResult.data.role);
    console.log('   Permissions:', registrationResult.data.permissions.slice(0, 3).join(', '), '...');

    const staffId = registrationResult.data.id;

    // Test 2: Authenticate Staff
    console.log('\n2️⃣ Testing Staff Authentication...');
    const authResult = await staffService.authenticateStaff('tenant-1', staffData.email, staffData.password);
    console.log('✅ Authentication successful');
    console.log('   Access token generated:', authResult.data.accessToken ? 'Yes' : 'No');
    console.log('   Refresh token generated:', authResult.data.refreshToken ? 'Yes' : 'No');

    // Test 3: Clock In
    console.log('\n3️⃣ Testing Attendance - Clock In...');
    const clockInResult = await attendanceService.clockIn('tenant-1', staffId, {
      location: 'Main Restaurant',
      notes: 'Starting morning shift',
    });
    console.log('✅ Clocked in successfully');
    console.log('   Clock in time:', clockInResult.data.clockInTime.toLocaleTimeString());
    console.log('   Status:', clockInResult.data.status);

    // Test 4: Start Break
    console.log('\n4️⃣ Testing Break Management...');
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    const breakResult = await attendanceService.startBreak('tenant-1', staffId, {
      type: 'LUNCH',
      notes: 'Lunch break',
    });
    console.log('✅ Break started successfully');
    console.log('   Break type:', breakResult.data.breakType);

    // End Break
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    const endBreakResult = await attendanceService.endBreak('tenant-1', staffId);
    console.log('✅ Break ended successfully');
    console.log('   Total break time:', endBreakResult.data.totalBreakMinutes, 'minutes');

    // Test 5: Record Performance Metrics
    console.log('\n5️⃣ Testing Performance Metrics...');
    const metricsData = {
      staffId: staffId,
      date: new Date().toISOString().split('T')[0],
      ordersProcessed: 45,
      hoursWorked: 8,
      customerRating: 4.5,
      customerFeedbackCount: 12,
      tasksCompleted: 18,
      tasksAssigned: 20,
      salesAmount: 1250.75,
      errors: 1,
      notes: 'Good performance today',
      recordedBy: 'manager-1',
    };

    const metricsResult = await performanceService.recordPerformanceMetrics('tenant-1', staffId, metricsData);
    console.log('✅ Performance metrics recorded');
    console.log('   Orders per hour:', metricsResult.data.ordersPerHour);
    console.log('   Task completion rate:', metricsResult.data.taskCompletionRate + '%');
    console.log('   Error rate:', metricsResult.data.errorRate + '%');

    // Test 6: Create Performance Review
    console.log('\n6️⃣ Testing Performance Review...');
    const reviewData = {
      staffId: staffId,
      reviewerId: 'manager-1',
      reviewPeriodStart: '2024-01-01',
      reviewPeriodEnd: '2024-01-31',
      overallRating: 4.2,
      strengths: ['Excellent customer service', 'Reliable attendance', 'Team player'],
      areasForImprovement: ['Speed of service during peak hours', 'Menu knowledge'],
      goals: ['Increase orders per hour to 7', 'Complete advanced menu training'],
      comments: 'John has shown consistent improvement and is a valuable team member.',
      reviewType: 'REGULAR',
    };

    const reviewResult = await performanceService.createPerformanceReview('tenant-1', reviewData);
    console.log('✅ Performance review created');
    console.log('   Overall rating:', reviewResult.data.overallRating + '/5');
    console.log('   Status:', reviewResult.data.status);

    // Test 7: Generate Performance Dashboard
    console.log('\n7️⃣ Testing Performance Dashboard...');
    const dashboardResult = await performanceService.generatePerformanceDashboard('tenant-1', staffId, '30d');
    console.log('✅ Performance dashboard generated');
    console.log('   Performance score:', dashboardResult.data.summary.performanceScore + '/100');
    console.log('   Recommendations:', dashboardResult.data.recommendations.length);

    // Test 8: Clock Out
    console.log('\n8️⃣ Testing Clock Out...');
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    const clockOutResult = await attendanceService.clockOut('tenant-1', staffId, {
      location: 'Main Restaurant',
      notes: 'End of shift',
    });
    console.log('✅ Clocked out successfully');
    console.log('   Total work time:', Math.round(clockOutResult.data.totalWorkMinutes / 60 * 100) / 100, 'hours');
    console.log('   Status:', clockOutResult.data.status);

    // Test 9: Get Staff Information
    console.log('\n9️⃣ Testing Staff Information Retrieval...');
    const staffInfo = await staffService.getStaffById('tenant-1', staffId);
    console.log('✅ Staff information retrieved');
    console.log('   Name:', staffInfo.data.firstName, staffInfo.data.lastName);
    console.log('   Department:', staffInfo.data.department);
    console.log('   Active:', staffInfo.data.isActive ? 'Yes' : 'No');

    // Test 10: Get All Staff
    console.log('\n🔟 Testing Staff List Retrieval...');
    const allStaff = await staffService.getAllStaff('tenant-1', { role: 'WAITER' });
    console.log('✅ Staff list retrieved');
    console.log('   Total waiters:', allStaff.data.total);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Staff Management Service Summary:');
    console.log('   ✅ Staff registration and authentication');
    console.log('   ✅ Role-based permissions system');
    console.log('   ✅ Attendance tracking (clock in/out, breaks)');
    console.log('   ✅ Performance metrics recording');
    console.log('   ✅ Performance reviews and evaluations');
    console.log('   ✅ Performance dashboard and analytics');
    console.log('   ✅ Staff information management');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testStaffService().catch(console.error);
}

module.exports = testStaffService;
const AttendanceService = require('../../src/services/AttendanceService');
const { DatabaseManager } = require('@rms/shared');

describe('AttendanceService', () => {
  let attendanceService;
  let mockDbManager;

  beforeEach(() => {
    mockDbManager = new DatabaseManager();
    attendanceService = new AttendanceService(mockDbManager);
  });

  afterEach(() => {
    // Clear in-memory data
    attendanceService.attendanceData.clear();
  });

  describe('clockIn', () => {
    test('should clock in staff member successfully', async () => {
      const result = await attendanceService.clockIn('tenant-1', 'staff-1', {
        location: 'Main Outlet',
        notes: 'Starting shift',
      });

      expect(result.success).toBe(true);
      expect(result.data.tenantId).toBe('tenant-1');
      expect(result.data.staffId).toBe('staff-1');
      expect(result.data.clockInTime).toBeInstanceOf(Date);
      expect(result.data.clockOutTime).toBeNull();
      expect(result.data.status).toBe('CLOCKED_IN');
      expect(result.data.location).toBe('Main Outlet');
      expect(result.data.notes).toBe('Starting shift');
    });

    test('should throw error if already clocked in', async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');

      await expect(
        attendanceService.clockIn('tenant-1', 'staff-1')
      ).rejects.toThrow('Already clocked in for today');
    });

    test('should allow clock in after clock out', async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.clockOut('tenant-1', 'staff-1');

      // Should be able to clock in again (next day scenario)
      const result = await attendanceService.clockIn('tenant-1', 'staff-1');
      expect(result.success).toBe(true);
    });
  });

  describe('clockOut', () => {
    beforeEach(async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');
    });

    test('should clock out staff member successfully', async () => {
      const result = await attendanceService.clockOut('tenant-1', 'staff-1', {
        location: 'Main Outlet',
        notes: 'End of shift',
      });

      expect(result.success).toBe(true);
      expect(result.data.clockOutTime).toBeInstanceOf(Date);
      expect(result.data.status).toBe('CLOCKED_OUT');
      expect(result.data.totalWorkMinutes).toBeGreaterThan(0);
      expect(result.data.clockOutLocation).toBe('Main Outlet');
      expect(result.data.clockOutNotes).toBe('End of shift');
    });

    test('should calculate overtime correctly', async () => {
      // Mock a long work day (10 hours)
      const clockInTime = new Date();
      clockInTime.setHours(clockInTime.getHours() - 10);
      
      const attendanceKey = `tenant-1:staff-1:${new Date().toISOString().split('T')[0]}`;
      const attendance = attendanceService.attendanceData.get(attendanceKey);
      attendance.clockInTime = clockInTime;
      attendanceService.attendanceData.set(attendanceKey, attendance);

      const result = await attendanceService.clockOut('tenant-1', 'staff-1');

      expect(result.data.overtimeMinutes).toBeGreaterThan(0);
      expect(result.data.totalWorkMinutes).toBeGreaterThan(480); // More than 8 hours
    });

    test('should throw error if not clocked in', async () => {
      await expect(
        attendanceService.clockOut('tenant-1', 'staff-2')
      ).rejects.toThrow('No clock-in record found for today');
    });

    test('should throw error if already clocked out', async () => {
      await attendanceService.clockOut('tenant-1', 'staff-1');

      await expect(
        attendanceService.clockOut('tenant-1', 'staff-1')
      ).rejects.toThrow('Already clocked out for today');
    });
  });

  describe('break management', () => {
    beforeEach(async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');
    });

    test('should start break successfully', async () => {
      const result = await attendanceService.startBreak('tenant-1', 'staff-1', {
        type: 'LUNCH',
        notes: 'Lunch break',
      });

      expect(result.success).toBe(true);
      expect(result.data.breakStartTime).toBeInstanceOf(Date);
      expect(result.data.breakType).toBe('LUNCH');
      expect(result.data.breakNotes).toBe('Lunch break');
      expect(result.data.status).toBe('ON_BREAK');
    });

    test('should end break successfully', async () => {
      await attendanceService.startBreak('tenant-1', 'staff-1');
      
      // Wait a moment to ensure break duration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await attendanceService.endBreak('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.breakEndTime).toBeInstanceOf(Date);
      expect(result.data.totalBreakMinutes).toBeGreaterThan(0);
      expect(result.data.status).toBe('CLOCKED_IN');
    });

    test('should throw error if starting break without clock in', async () => {
      await expect(
        attendanceService.startBreak('tenant-1', 'staff-2')
      ).rejects.toThrow('No clock-in record found for today');
    });

    test('should throw error if starting break after clock out', async () => {
      await attendanceService.clockOut('tenant-1', 'staff-1');

      await expect(
        attendanceService.startBreak('tenant-1', 'staff-1')
      ).rejects.toThrow('Cannot start break after clocking out');
    });

    test('should throw error if break already in progress', async () => {
      await attendanceService.startBreak('tenant-1', 'staff-1');

      await expect(
        attendanceService.startBreak('tenant-1', 'staff-1')
      ).rejects.toThrow('Break already in progress');
    });

    test('should throw error if ending break without starting', async () => {
      await expect(
        attendanceService.endBreak('tenant-1', 'staff-1')
      ).rejects.toThrow('No break in progress');
    });
  });

  describe('getCurrentStatus', () => {
    test('should return not clocked in status', async () => {
      const result = await attendanceService.getCurrentStatus('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('NOT_CLOCKED_IN');
    });

    test('should return clocked in status', async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');

      const result = await attendanceService.getCurrentStatus('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CLOCKED_IN');
      expect(result.data.clockInTime).toBeInstanceOf(Date);
      expect(result.data.workingHours).toBeGreaterThan(0);
      expect(result.data.isOnBreak).toBe(false);
    });

    test('should return on break status', async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.startBreak('tenant-1', 'staff-1');

      const result = await attendanceService.getCurrentStatus('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('ON_BREAK');
      expect(result.data.isOnBreak).toBe(true);
      expect(result.data.breakStartTime).toBeInstanceOf(Date);
    });

    test('should return clocked out status', async () => {
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.clockOut('tenant-1', 'staff-1');

      const result = await attendanceService.getCurrentStatus('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CLOCKED_OUT');
      expect(result.data.clockOutTime).toBeInstanceOf(Date);
    });
  });

  describe('getAttendanceHistory', () => {
    beforeEach(async () => {
      // Create attendance records for multiple days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(today);
      dayBefore.setDate(dayBefore.getDate() - 2);

      // Today's attendance
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.clockOut('tenant-1', 'staff-1');

      // Yesterday's attendance (manually create)
      const yesterdayKey = `tenant-1:staff-1:${yesterday.toISOString().split('T')[0]}`;
      attendanceService.attendanceData.set(yesterdayKey, {
        id: 'attendance-yesterday',
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        date: yesterday.toISOString().split('T')[0],
        clockInTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        clockOutTime: new Date(yesterday.getTime() + 17 * 60 * 60 * 1000), // 5 PM
        totalWorkMinutes: 480, // 8 hours
        overtimeMinutes: 0,
        status: 'CLOCKED_OUT',
      });
    });

    test('should get attendance history for date range', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await attendanceService.getAttendanceHistory(
        'tenant-1',
        'staff-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.success).toBe(true);
      expect(result.data.attendance.length).toBeGreaterThanOrEqual(2);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.totalDays).toBeGreaterThanOrEqual(2);
      expect(result.data.summary.presentDays).toBeGreaterThanOrEqual(2);
      expect(result.data.summary.attendanceRate).toBeGreaterThan(0);
    });

    test('should calculate summary statistics correctly', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await attendanceService.getAttendanceHistory(
        'tenant-1',
        'staff-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      const summary = result.data.summary;
      expect(summary.totalWorkHours).toBeGreaterThan(0);
      expect(summary.attendanceRate).toBe(100); // All days present
      expect(summary.averageWorkHoursPerDay).toBeGreaterThan(0);
    });
  });

  describe('getTeamAttendance', () => {
    beforeEach(async () => {
      // Create attendance for multiple staff members
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.clockIn('tenant-1', 'staff-2');
      await attendanceService.clockIn('tenant-1', 'staff-3');
      
      // Clock out one staff member
      await attendanceService.clockOut('tenant-1', 'staff-1');
      
      // Put one on break
      await attendanceService.startBreak('tenant-1', 'staff-2');
    });

    test('should get team attendance for date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const result = await attendanceService.getTeamAttendance('tenant-1', today);

      expect(result.success).toBe(true);
      expect(result.data.attendance).toHaveLength(3);
      expect(result.data.stats.totalStaff).toBe(3);
      expect(result.data.stats.presentStaff).toBe(3);
      expect(result.data.stats.onBreak).toBe(1);
      expect(result.data.stats.clockedOut).toBe(1);
    });
  });

  describe('generateAttendanceReport', () => {
    beforeEach(async () => {
      // Create attendance data for multiple staff and days
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Staff 1 - Today
      await attendanceService.clockIn('tenant-1', 'staff-1');
      await attendanceService.clockOut('tenant-1', 'staff-1');

      // Staff 1 - Yesterday
      const yesterdayKey1 = `tenant-1:staff-1:${yesterday.toISOString().split('T')[0]}`;
      attendanceService.attendanceData.set(yesterdayKey1, {
        id: 'attendance-staff1-yesterday',
        tenantId: 'tenant-1',
        staffId: 'staff-1',
        date: yesterday.toISOString().split('T')[0],
        clockInTime: new Date(yesterday.getTime() + 8 * 60 * 60 * 1000),
        clockOutTime: new Date(yesterday.getTime() + 17 * 60 * 60 * 1000),
        totalWorkMinutes: 480,
        overtimeMinutes: 0,
        status: 'CLOCKED_OUT',
      });

      // Staff 2 - Today only
      await attendanceService.clockIn('tenant-1', 'staff-2');
      await attendanceService.clockOut('tenant-1', 'staff-2');
    });

    test('should generate attendance report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await attendanceService.generateAttendanceReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.success).toBe(true);
      expect(result.data.reportData).toHaveLength(2); // 2 staff members
      expect(result.data.overallStats).toBeDefined();
      expect(result.data.overallStats.totalStaffMembers).toBe(2);
      expect(result.data.overallStats.totalWorkHours).toBeGreaterThan(0);
    });

    test('should filter report by staff ID', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await attendanceService.generateAttendanceReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        { staffId: 'staff-1' }
      );

      expect(result.success).toBe(true);
      expect(result.data.reportData).toHaveLength(1);
      expect(result.data.reportData[0].staffId).toBe('staff-1');
    });
  });

  describe('calculateAttendanceSummary', () => {
    test('should calculate summary for empty attendance', () => {
      const summary = attendanceService.calculateAttendanceSummary([]);

      expect(summary.totalDays).toBe(0);
      expect(summary.presentDays).toBe(0);
      expect(summary.attendanceRate).toBe(0);
      expect(summary.totalWorkHours).toBe(0);
      expect(summary.averageWorkHoursPerDay).toBe(0);
    });

    test('should calculate summary correctly', () => {
      const attendance = [
        {
          clockInTime: new Date(),
          totalWorkMinutes: 480, // 8 hours
          overtimeMinutes: 0,
          totalBreakMinutes: 60,
        },
        {
          clockInTime: new Date(),
          totalWorkMinutes: 540, // 9 hours
          overtimeMinutes: 60, // 1 hour overtime
          totalBreakMinutes: 30,
        },
      ];

      const summary = attendanceService.calculateAttendanceSummary(attendance);

      expect(summary.totalDays).toBe(2);
      expect(summary.presentDays).toBe(2);
      expect(summary.attendanceRate).toBe(100);
      expect(summary.totalWorkHours).toBe(17); // 8 + 9 hours
      expect(summary.totalOvertimeHours).toBe(1);
      expect(summary.totalBreakHours).toBe(1.5); // 60 + 30 minutes
      expect(summary.averageWorkHoursPerDay).toBe(8.5);
    });
  });
});
const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Attendance Management service for tracking staff attendance and performance
 */
class AttendanceService {
  constructor(dbManager) {
    this.db = dbManager;
    this.attendanceData = new Map(); // In-memory storage for demo
    this.workHoursPerDay = parseInt(process.env.WORK_HOURS_PER_DAY) || 8;
    this.overtimeThreshold = parseInt(process.env.OVERTIME_THRESHOLD) || 8;
    this.breakDurationMinutes = parseInt(process.env.BREAK_DURATION_MINUTES) || 60;
  }

  /**
   * Clock in staff member
   */
  async clockIn(tenantId, staffId, clockInData = {}) {
    const { location, notes } = clockInData;

    try {
      // Check if already clocked in today
      const todayAttendance = await this.getTodayAttendance(tenantId, staffId);
      if (todayAttendance && todayAttendance.clockInTime && !todayAttendance.clockOutTime) {
        throw new ValidationError('Already clocked in for today');
      }

      const attendanceId = `attendance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const clockInTime = new Date();

      const attendance = {
        id: attendanceId,
        tenantId,
        staffId,
        date: clockInTime.toISOString().split('T')[0], // YYYY-MM-DD
        clockInTime,
        clockOutTime: null,
        breakStartTime: null,
        breakEndTime: null,
        totalBreakMinutes: 0,
        totalWorkMinutes: 0,
        overtimeMinutes: 0,
        location,
        notes,
        status: 'CLOCKED_IN',
        createdAt: new Date(),
      };

      const attendanceKey = `${tenantId}:${staffId}:${attendance.date}`;
      this.attendanceData.set(attendanceKey, attendance);

      return createApiResponse(attendance, 'Clocked in successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to clock in', error.message);
    }
  }

  /**
   * Clock out staff member
   */
  async clockOut(tenantId, staffId, clockOutData = {}) {
    const { location, notes } = clockOutData;

    try {
      const todayAttendance = await this.getTodayAttendance(tenantId, staffId);
      if (!todayAttendance) {
        throw new ValidationError('No clock-in record found for today');
      }

      if (todayAttendance.clockOutTime) {
        throw new ValidationError('Already clocked out for today');
      }

      const clockOutTime = new Date();
      
      // Calculate total work time
      const workStartTime = todayAttendance.clockInTime;
      const totalMinutes = Math.floor((clockOutTime - workStartTime) / (1000 * 60));
      const workMinutes = totalMinutes - todayAttendance.totalBreakMinutes;
      
      // Calculate overtime
      const regularMinutes = this.workHoursPerDay * 60;
      const overtimeMinutes = Math.max(0, workMinutes - regularMinutes);

      // Update attendance record
      todayAttendance.clockOutTime = clockOutTime;
      todayAttendance.totalWorkMinutes = workMinutes;
      todayAttendance.overtimeMinutes = overtimeMinutes;
      todayAttendance.status = 'CLOCKED_OUT';
      todayAttendance.updatedAt = new Date();

      if (location) todayAttendance.clockOutLocation = location;
      if (notes) todayAttendance.clockOutNotes = notes;

      const attendanceKey = `${tenantId}:${staffId}:${todayAttendance.date}`;
      this.attendanceData.set(attendanceKey, todayAttendance);

      return createApiResponse(todayAttendance, 'Clocked out successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to clock out', error.message);
    }
  }

  /**
   * Start break
   */
  async startBreak(tenantId, staffId, breakData = {}) {
    const { type = 'REGULAR', notes } = breakData;

    try {
      const todayAttendance = await this.getTodayAttendance(tenantId, staffId);
      if (!todayAttendance) {
        throw new ValidationError('No clock-in record found for today');
      }

      if (todayAttendance.clockOutTime) {
        throw new ValidationError('Cannot start break after clocking out');
      }

      if (todayAttendance.breakStartTime && !todayAttendance.breakEndTime) {
        throw new ValidationError('Break already in progress');
      }

      todayAttendance.breakStartTime = new Date();
      todayAttendance.breakType = type;
      todayAttendance.breakNotes = notes;
      todayAttendance.status = 'ON_BREAK';
      todayAttendance.updatedAt = new Date();

      const attendanceKey = `${tenantId}:${staffId}:${todayAttendance.date}`;
      this.attendanceData.set(attendanceKey, todayAttendance);

      return createApiResponse(todayAttendance, 'Break started successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to start break', error.message);
    }
  }

  /**
   * End break
   */
  async endBreak(tenantId, staffId) {
    try {
      const todayAttendance = await this.getTodayAttendance(tenantId, staffId);
      if (!todayAttendance) {
        throw new ValidationError('No clock-in record found for today');
      }

      if (!todayAttendance.breakStartTime) {
        throw new ValidationError('No break in progress');
      }

      if (todayAttendance.breakEndTime) {
        throw new ValidationError('Break already ended');
      }

      const breakEndTime = new Date();
      const breakDuration = Math.floor((breakEndTime - todayAttendance.breakStartTime) / (1000 * 60));

      todayAttendance.breakEndTime = breakEndTime;
      todayAttendance.totalBreakMinutes += breakDuration;
      todayAttendance.status = 'CLOCKED_IN';
      todayAttendance.updatedAt = new Date();

      const attendanceKey = `${tenantId}:${staffId}:${todayAttendance.date}`;
      this.attendanceData.set(attendanceKey, todayAttendance);

      return createApiResponse(todayAttendance, 'Break ended successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to end break', error.message);
    }
  }

  /**
   * Get attendance for specific date
   */
  async getAttendance(tenantId, staffId, date) {
    try {
      const attendanceKey = `${tenantId}:${staffId}:${date}`;
      const attendance = this.attendanceData.get(attendanceKey);

      if (!attendance) {
        throw new ResourceNotFoundError('Attendance record', `${staffId} on ${date}`);
      }

      return createApiResponse(attendance, 'Attendance record retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get attendance record', error.message);
    }
  }

  /**
   * Get attendance history for staff member
   */
  async getAttendanceHistory(tenantId, staffId, startDate, endDate) {
    try {
      const attendanceHistory = [];
      
      for (const [key, attendance] of this.attendanceData.entries()) {
        if (key.startsWith(`${tenantId}:${staffId}:`)) {
          const attendanceDate = new Date(attendance.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (attendanceDate >= start && attendanceDate <= end) {
            attendanceHistory.push(attendance);
          }
        }
      }

      // Sort by date (newest first)
      attendanceHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate summary statistics
      const summary = this.calculateAttendanceSummary(attendanceHistory);

      return createApiResponse({
        attendance: attendanceHistory,
        summary,
        period: { startDate, endDate },
      }, 'Attendance history retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get attendance history', error.message);
    }
  }

  /**
   * Get team attendance for date
   */
  async getTeamAttendance(tenantId, date, outletId = null) {
    try {
      const teamAttendance = [];
      
      for (const [key, attendance] of this.attendanceData.entries()) {
        if (key.startsWith(`${tenantId}:`) && attendance.date === date) {
          // Filter by outlet if specified
          if (outletId) {
            // In a real system, we'd join with staff data to get outlet
            // For now, we'll include all records
          }
          teamAttendance.push(attendance);
        }
      }

      // Calculate team statistics
      const stats = {
        totalStaff: teamAttendance.length,
        presentStaff: teamAttendance.filter(a => a.clockInTime).length,
        onBreak: teamAttendance.filter(a => a.status === 'ON_BREAK').length,
        clockedOut: teamAttendance.filter(a => a.clockOutTime).length,
        totalWorkHours: teamAttendance.reduce((sum, a) => sum + (a.totalWorkMinutes / 60), 0),
        totalOvertimeHours: teamAttendance.reduce((sum, a) => sum + (a.overtimeMinutes / 60), 0),
      };

      return createApiResponse({
        attendance: teamAttendance,
        stats,
        date,
      }, 'Team attendance retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get team attendance', error.message);
    }
  }

  /**
   * Get current status of staff member
   */
  async getCurrentStatus(tenantId, staffId) {
    try {
      const todayAttendance = await this.getTodayAttendance(tenantId, staffId);
      
      if (!todayAttendance) {
        return createApiResponse({
          status: 'NOT_CLOCKED_IN',
          message: 'Not clocked in today',
        }, 'Current status retrieved successfully');
      }

      const currentTime = new Date();
      let status = todayAttendance.status;
      let workingHours = 0;
      let breakTime = 0;

      if (todayAttendance.clockInTime) {
        const workStart = todayAttendance.clockInTime;
        const workEnd = todayAttendance.clockOutTime || currentTime;
        workingHours = (workEnd - workStart) / (1000 * 60 * 60); // in hours
        breakTime = todayAttendance.totalBreakMinutes / 60; // in hours
      }

      return createApiResponse({
        status,
        clockInTime: todayAttendance.clockInTime,
        clockOutTime: todayAttendance.clockOutTime,
        workingHours: Math.round(workingHours * 100) / 100,
        breakTime: Math.round(breakTime * 100) / 100,
        isOnBreak: status === 'ON_BREAK',
        breakStartTime: todayAttendance.breakStartTime,
      }, 'Current status retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get current status', error.message);
    }
  }

  /**
   * Get today's attendance record
   */
  async getTodayAttendance(tenantId, staffId) {
    const today = new Date().toISOString().split('T')[0];
    const attendanceKey = `${tenantId}:${staffId}:${today}`;
    return this.attendanceData.get(attendanceKey);
  }

  /**
   * Calculate attendance summary statistics
   */
  calculateAttendanceSummary(attendanceHistory) {
    const totalDays = attendanceHistory.length;
    const presentDays = attendanceHistory.filter(a => a.clockInTime).length;
    const totalWorkMinutes = attendanceHistory.reduce((sum, a) => sum + a.totalWorkMinutes, 0);
    const totalOvertimeMinutes = attendanceHistory.reduce((sum, a) => sum + a.overtimeMinutes, 0);
    const totalBreakMinutes = attendanceHistory.reduce((sum, a) => sum + a.totalBreakMinutes, 0);

    return {
      totalDays,
      presentDays,
      absentDays: totalDays - presentDays,
      attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0,
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
      totalBreakHours: Math.round((totalBreakMinutes / 60) * 100) / 100,
      averageWorkHoursPerDay: presentDays > 0 ? Math.round((totalWorkMinutes / 60 / presentDays) * 100) / 100 : 0,
    };
  }

  /**
   * Generate attendance report
   */
  async generateAttendanceReport(tenantId, startDate, endDate, filters = {}) {
    try {
      const allAttendance = [];
      
      for (const [key, attendance] of this.attendanceData.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          const attendanceDate = new Date(attendance.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (attendanceDate >= start && attendanceDate <= end) {
            // Apply filters
            let includeRecord = true;
            
            if (filters.staffId && attendance.staffId !== filters.staffId) {
              includeRecord = false;
            }
            
            if (filters.outletId) {
              // In a real system, we'd join with staff data
              // For now, we'll include all records
            }

            if (includeRecord) {
              allAttendance.push(attendance);
            }
          }
        }
      }

      // Group by staff
      const staffAttendance = {};
      allAttendance.forEach(attendance => {
        if (!staffAttendance[attendance.staffId]) {
          staffAttendance[attendance.staffId] = [];
        }
        staffAttendance[attendance.staffId].push(attendance);
      });

      // Calculate summary for each staff member
      const reportData = Object.keys(staffAttendance).map(staffId => {
        const attendance = staffAttendance[staffId];
        const summary = this.calculateAttendanceSummary(attendance);
        
        return {
          staffId,
          attendance,
          summary,
        };
      });

      // Calculate overall statistics
      const overallStats = {
        totalStaffMembers: reportData.length,
        totalWorkHours: reportData.reduce((sum, staff) => sum + staff.summary.totalWorkHours, 0),
        totalOvertimeHours: reportData.reduce((sum, staff) => sum + staff.summary.totalOvertimeHours, 0),
        averageAttendanceRate: reportData.length > 0 
          ? Math.round(reportData.reduce((sum, staff) => sum + staff.summary.attendanceRate, 0) / reportData.length)
          : 0,
      };

      return createApiResponse({
        reportData,
        overallStats,
        period: { startDate, endDate },
        filters,
        generatedAt: new Date(),
      }, 'Attendance report generated successfully');
    } catch (error) {
      throw new DatabaseError('Failed to generate attendance report', error.message);
    }
  }
}

module.exports = AttendanceService;
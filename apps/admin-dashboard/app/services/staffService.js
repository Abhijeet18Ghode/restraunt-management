import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class StaffService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/staff`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined' ? 
        document.cookie.split('; ').find(row => row.startsWith('auth_token='))?.split('=')[1] : 
        null;
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Staff Management
  async getStaffMembers(outletId = null, role = null, status = null) {
    try {
      const params = {};
      if (outletId) params.outletId = outletId;
      if (role) params.role = role;
      if (status) params.status = status;
      
      const response = await this.api.get('/members', { params });
      return response.data;
    } catch (error) {
      console.warn('Staff service not available, returning empty data');
      return [];
    }
  }

  async getStaffMember(staffId) {
    const response = await this.api.get(`/members/${staffId}`);
    return response.data;
  }

  async createStaffMember(staffData) {
    const response = await this.api.post('/members', staffData);
    return response.data;
  }

  async updateStaffMember(staffId, staffData) {
    const response = await this.api.put(`/members/${staffId}`, staffData);
    return response.data;
  }

  async deleteStaffMember(staffId) {
    const response = await this.api.delete(`/members/${staffId}`);
    return response.data;
  }

  async activateStaffMember(staffId) {
    const response = await this.api.post(`/members/${staffId}/activate`);
    return response.data;
  }

  async deactivateStaffMember(staffId) {
    const response = await this.api.post(`/members/${staffId}/deactivate`);
    return response.data;
  }

  // Role Management
  async getAvailableRoles() {
    const response = await this.api.get('/roles');
    return response.data;
  }

  async createRole(roleData) {
    const response = await this.api.post('/roles', roleData);
    return response.data;
  }

  async updateRole(roleId, roleData) {
    const response = await this.api.put(`/roles/${roleId}`, roleData);
    return response.data;
  }

  async deleteRole(roleId) {
    const response = await this.api.delete(`/roles/${roleId}`);
    return response.data;
  }

  async assignRole(staffId, roleId, outletId = null) {
    const response = await this.api.post(`/members/${staffId}/assign-role`, {
      roleId,
      outletId
    });
    return response.data;
  }

  // Attendance Management
  async getAttendanceRecords(staffId = null, outletId = null, dateRange = null) {
    const params = {};
    if (staffId) params.staffId = staffId;
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/attendance', { params });
    return response.data;
  }

  async clockIn(staffId, outletId, location = null) {
    const response = await this.api.post('/attendance/clock-in', {
      staffId,
      outletId,
      location,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  async clockOut(staffId, outletId, location = null) {
    const response = await this.api.post('/attendance/clock-out', {
      staffId,
      outletId,
      location,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  async addBreak(staffId, breakType, duration) {
    const response = await this.api.post('/attendance/break', {
      staffId,
      breakType,
      duration,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  async updateAttendance(attendanceId, attendanceData) {
    const response = await this.api.put(`/attendance/${attendanceId}`, attendanceData);
    return response.data;
  }

  // Performance Management
  async getPerformanceMetrics(staffId, dateRange = null) {
    const params = {};
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get(`/performance/${staffId}`, { params });
    return response.data;
  }

  async addPerformanceReview(staffId, reviewData) {
    const response = await this.api.post(`/performance/${staffId}/reviews`, reviewData);
    return response.data;
  }

  async getPerformanceReviews(staffId) {
    const response = await this.api.get(`/performance/${staffId}/reviews`);
    return response.data;
  }

  // Schedule Management
  async getSchedules(outletId = null, staffId = null, dateRange = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (staffId) params.staffId = staffId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/schedules', { params });
    return response.data;
  }

  async createSchedule(scheduleData) {
    const response = await this.api.post('/schedules', scheduleData);
    return response.data;
  }

  async updateSchedule(scheduleId, scheduleData) {
    const response = await this.api.put(`/schedules/${scheduleId}`, scheduleData);
    return response.data;
  }

  async deleteSchedule(scheduleId) {
    const response = await this.api.delete(`/schedules/${scheduleId}`);
    return response.data;
  }

  // Payroll Management
  async getPayrollRecords(outletId = null, payPeriod = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (payPeriod) {
      params.startDate = payPeriod.startDate;
      params.endDate = payPeriod.endDate;
    }
    
    const response = await this.api.get('/payroll', { params });
    return response.data;
  }

  async calculatePayroll(staffId, payPeriod) {
    const response = await this.api.post('/payroll/calculate', {
      staffId,
      startDate: payPeriod.startDate,
      endDate: payPeriod.endDate
    });
    return response.data;
  }

  async processPayroll(payrollData) {
    const response = await this.api.post('/payroll/process', payrollData);
    return response.data;
  }

  // Reports and Analytics
  async getStaffAnalytics(outletId = null, dateRange = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/analytics', { params });
    return response.data;
  }

  async exportStaffReport(reportType, params = {}) {
    const response = await this.api.get(`/reports/export/${reportType}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  // Real-time Updates
  subscribeToStaffUpdates(callback) {
    if (typeof window !== 'undefined' && window.staffSocket) {
      window.staffSocket.on('staff_updated', callback);
      window.staffSocket.on('attendance_updated', callback);
      window.staffSocket.on('schedule_updated', callback);
    }
  }

  unsubscribeFromStaffUpdates(callback) {
    if (typeof window !== 'undefined' && window.staffSocket) {
      window.staffSocket.off('staff_updated', callback);
      window.staffSocket.off('attendance_updated', callback);
      window.staffSocket.off('schedule_updated', callback);
    }
  }
}

export const staffService = new StaffService();
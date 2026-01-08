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
  async getStaff(outletId, page = 1, limit = 20, role = null, status = 'active') {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      status,
      ...(role && { role })
    });
    const response = await this.api.get(`/?${params}`);
    return response.data;
  }

  async getStaffMember(staffId) {
    const response = await this.api.get(`/${staffId}`);
    return response.data;
  }

  async createStaffMember(staffData) {
    const response = await this.api.post('/', staffData);
    return response.data;
  }

  async updateStaffMember(staffId, data) {
    const response = await this.api.put(`/${staffId}`, data);
    return response.data;
  }

  async deactivateStaffMember(staffId, reason) {
    const response = await this.api.patch(`/${staffId}/deactivate`, { reason });
    return response.data;
  }

  async reactivateStaffMember(staffId) {
    const response = await this.api.patch(`/${staffId}/reactivate`);
    return response.data;
  }

  async deleteStaffMember(staffId) {
    const response = await this.api.delete(`/${staffId}`);
    return response.data;
  }

  async searchStaff(outletId, query) {
    const response = await this.api.get(`/search?outletId=${outletId}&q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Role and Permission Management
  async getRoles(outletId) {
    const response = await this.api.get(`/roles?outletId=${outletId}`);
    return response.data;
  }

  async createRole(roleData) {
    const response = await this.api.post('/roles', roleData);
    return response.data;
  }

  async updateRole(roleId, data) {
    const response = await this.api.put(`/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(roleId) {
    const response = await this.api.delete(`/roles/${roleId}`);
    return response.data;
  }

  async getPermissions() {
    const response = await this.api.get('/permissions');
    return response.data;
  }

  async updateStaffRole(staffId, roleId) {
    const response = await this.api.patch(`/${staffId}/role`, { roleId });
    return response.data;
  }

  // Attendance Management
  async getAttendance(outletId, date = null, staffId = null, page = 1, limit = 20) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(date && { date }),
      ...(staffId && { staffId })
    });
    const response = await this.api.get(`/attendance?${params}`);
    return response.data;
  }

  async clockIn(staffId, outletId, location = null) {
    const response = await this.api.post('/attendance/clock-in', {
      staffId,
      outletId,
      location
    });
    return response.data;
  }

  async clockOut(staffId, outletId, location = null) {
    const response = await this.api.post('/attendance/clock-out', {
      staffId,
      outletId,
      location
    });
    return response.data;
  }

  async startBreak(staffId, breakType = 'regular') {
    const response = await this.api.post('/attendance/break-start', {
      staffId,
      breakType
    });
    return response.data;
  }

  async endBreak(staffId) {
    const response = await this.api.post('/attendance/break-end', {
      staffId
    });
    return response.data;
  }

  async getAttendanceReport(outletId, startDate, endDate, staffId = null) {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      ...(staffId && { staffId })
    });
    const response = await this.api.get(`/attendance/report?${params}`);
    return response.data;
  }

  async updateAttendance(attendanceId, data) {
    const response = await this.api.put(`/attendance/${attendanceId}`, data);
    return response.data;
  }

  // Performance Management
  async getPerformanceMetrics(staffId, period = '30d') {
    const response = await this.api.get(`/${staffId}/performance?period=${period}`);
    return response.data;
  }

  async getPerformanceReviews(staffId, page = 1, limit = 10) {
    const response = await this.api.get(`/${staffId}/performance/reviews?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createPerformanceReview(reviewData) {
    const response = await this.api.post('/performance/reviews', reviewData);
    return response.data;
  }

  async updatePerformanceReview(reviewId, data) {
    const response = await this.api.put(`/performance/reviews/${reviewId}`, data);
    return response.data;
  }

  async getPerformanceGoals(staffId) {
    const response = await this.api.get(`/${staffId}/performance/goals`);
    return response.data;
  }

  async setPerformanceGoals(staffId, goals) {
    const response = await this.api.post(`/${staffId}/performance/goals`, { goals });
    return response.data;
  }

  async updatePerformanceGoal(goalId, data) {
    const response = await this.api.put(`/performance/goals/${goalId}`, data);
    return response.data;
  }

  async getPerformanceDashboard(outletId, period = '30d') {
    const response = await this.api.get(`/performance/dashboard?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Schedule Management
  async getSchedules(outletId, startDate, endDate, staffId = null) {
    const params = new URLSearchParams({
      outletId,
      startDate,
      endDate,
      ...(staffId && { staffId })
    });
    const response = await this.api.get(`/schedules?${params}`);
    return response.data;
  }

  async createSchedule(scheduleData) {
    const response = await this.api.post('/schedules', scheduleData);
    return response.data;
  }

  async updateSchedule(scheduleId, data) {
    const response = await this.api.put(`/schedules/${scheduleId}`, data);
    return response.data;
  }

  async deleteSchedule(scheduleId) {
    const response = await this.api.delete(`/schedules/${scheduleId}`);
    return response.data;
  }

  async getScheduleTemplates(outletId) {
    const response = await this.api.get(`/schedules/templates?outletId=${outletId}`);
    return response.data;
  }

  async createScheduleTemplate(templateData) {
    const response = await this.api.post('/schedules/templates', templateData);
    return response.data;
  }

  async applyScheduleTemplate(templateId, startDate, endDate) {
    const response = await this.api.post(`/schedules/templates/${templateId}/apply`, {
      startDate,
      endDate
    });
    return response.data;
  }

  // Training Management
  async getTrainingPrograms(outletId) {
    const response = await this.api.get(`/training/programs?outletId=${outletId}`);
    return response.data;
  }

  async createTrainingProgram(programData) {
    const response = await this.api.post('/training/programs', programData);
    return response.data;
  }

  async updateTrainingProgram(programId, data) {
    const response = await this.api.put(`/training/programs/${programId}`, data);
    return response.data;
  }

  async assignTraining(staffId, programId, dueDate) {
    const response = await this.api.post('/training/assignments', {
      staffId,
      programId,
      dueDate
    });
    return response.data;
  }

  async getStaffTraining(staffId) {
    const response = await this.api.get(`/${staffId}/training`);
    return response.data;
  }

  async completeTraining(assignmentId, completionData) {
    const response = await this.api.post(`/training/assignments/${assignmentId}/complete`, completionData);
    return response.data;
  }

  // Payroll Management
  async getPayroll(outletId, payPeriod, staffId = null) {
    const params = new URLSearchParams({
      outletId,
      payPeriod,
      ...(staffId && { staffId })
    });
    const response = await this.api.get(`/payroll?${params}`);
    return response.data;
  }

  async calculatePayroll(outletId, payPeriod) {
    const response = await this.api.post('/payroll/calculate', {
      outletId,
      payPeriod
    });
    return response.data;
  }

  async approvePayroll(payrollId) {
    const response = await this.api.patch(`/payroll/${payrollId}/approve`);
    return response.data;
  }

  async getPayrollReport(outletId, startDate, endDate) {
    const response = await this.api.get(`/payroll/report?outletId=${outletId}&startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  }

  // Staff Analytics
  async getStaffAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getTurnoverAnalysis(outletId, period = '12m') {
    const response = await this.api.get(`/analytics/turnover?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getProductivityMetrics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/productivity?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Bulk Operations
  async importStaff(outletId, csvData) {
    const formData = new FormData();
    formData.append('file', csvData);
    formData.append('outletId', outletId);
    
    const response = await this.api.post('/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async exportStaff(outletId, format = 'csv') {
    const response = await this.api.get(`/export?outletId=${outletId}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async bulkUpdateStaff(updates) {
    const response = await this.api.post('/bulk-update', { updates });
    return response.data;
  }
}

export default StaffService;
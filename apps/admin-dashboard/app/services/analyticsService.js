import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class AnalyticsService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/analytics`,
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

  async getSalesData(outletId, period = '7d') {
    const response = await this.api.get(`/sales?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getRevenueData(outletId, period = '7d') {
    const response = await this.api.get(`/revenue?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getTopItems(outletId, period = '7d', limit = 10) {
    const response = await this.api.get(`/top-items?outletId=${outletId}&period=${period}&limit=${limit}`);
    return response.data;
  }

  async getCustomerAnalytics(outletId, period = '7d') {
    const response = await this.api.get(`/customers?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getPerformanceMetrics(outletId, period = '7d') {
    const response = await this.api.get(`/performance?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getInventoryAnalytics(outletId) {
    const response = await this.api.get(`/inventory?outletId=${outletId}`);
    return response.data;
  }

  async getStaffPerformance(outletId, period = '7d') {
    const response = await this.api.get(`/staff-performance?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getDashboardSummary(outletId, period = '7d') {
    try {
      const response = await this.api.get(`/dashboard?outletId=${outletId}&period=${period}`);
      return response.data;
    } catch (error) {
      console.warn('Analytics service not available, using fallback data');
      // Return fallback data structure
      return {
        revenue: { total: 0, change: 0 },
        orders: { today: 0, change: 0 },
        customers: { active: 0, change: 0 },
        averageOrderValue: 0,
        averageOrderValueChange: 0,
        salesChart: null,
        topItemsChart: null,
        recentOrders: [],
        lowStockItems: [],
        topStaff: []
      };
    }
  }

  async getTrendAnalysis(outletId, metric, period = '30d') {
    const response = await this.api.get(`/trends?outletId=${outletId}&metric=${metric}&period=${period}`);
    return response.data;
  }

  async getComparativeAnalysis(outletIds, period = '7d') {
    const response = await this.api.post('/comparative', {
      outletIds,
      period,
    });
    return response.data;
  }

  // Report Generation and Export Methods
  async generateReport(reportConfig) {
    const response = await this.api.post('/reports/generate', reportConfig);
    return response.data;
  }

  async getExports(outletId) {
    const response = await this.api.get(`/exports?outletId=${outletId}`);
    return response.data;
  }

  async downloadExport(exportId) {
    const response = await this.api.get(`/exports/${exportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async deleteExport(exportId) {
    const response = await this.api.delete(`/exports/${exportId}`);
    return response.data;
  }

  async retryExport(exportId) {
    const response = await this.api.post(`/exports/${exportId}/retry`);
    return response.data;
  }

  async getExportStatus(exportId) {
    const response = await this.api.get(`/exports/${exportId}/status`);
    return response.data;
  }

  // Advanced Analytics Methods
  async getMultiOutletConsolidation(outletIds, metrics, period = '30d') {
    const response = await this.api.post('/multi-outlet/consolidation', {
      outletIds,
      metrics,
      period,
    });
    return response.data;
  }

  async getPerformanceBenchmarks(outletId, industry = 'restaurant') {
    const response = await this.api.get(`/benchmarks?outletId=${outletId}&industry=${industry}`);
    return response.data;
  }

  async getCustomReport(outletId, reportDefinition) {
    const response = await this.api.post('/reports/custom', {
      outletId,
      ...reportDefinition,
    });
    return response.data;
  }

  async scheduleReport(reportConfig, schedule) {
    const response = await this.api.post('/reports/schedule', {
      ...reportConfig,
      schedule,
    });
    return response.data;
  }

  async getScheduledReports(outletId) {
    const response = await this.api.get(`/reports/scheduled?outletId=${outletId}`);
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
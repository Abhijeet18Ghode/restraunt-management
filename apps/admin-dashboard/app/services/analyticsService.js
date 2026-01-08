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
    const response = await this.api.get(`/dashboard-summary?outletId=${outletId}&period=${period}`);
    return response.data;
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
}

export const analyticsService = new AnalyticsService();
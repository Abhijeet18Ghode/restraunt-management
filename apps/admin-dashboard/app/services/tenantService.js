import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class TenantService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/tenant`,
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

  async getTenant(tenantId) {
    const response = await this.api.get(`/${tenantId}`);
    return response.data;
  }

  async updateTenant(tenantId, data) {
    const response = await this.api.put(`/${tenantId}`, data);
    return response.data;
  }

  async getOutlets(tenantId) {
    const response = await this.api.get(`/${tenantId}/outlets`);
    return response.data;
  }

  async createOutlet(tenantId, outletData) {
    const response = await this.api.post(`/${tenantId}/outlets`, outletData);
    return response.data;
  }

  async updateOutlet(tenantId, outletId, data) {
    const response = await this.api.put(`/${tenantId}/outlets/${outletId}`, data);
    return response.data;
  }

  async deleteOutlet(tenantId, outletId) {
    const response = await this.api.delete(`/${tenantId}/outlets/${outletId}`);
    return response.data;
  }

  async getTenantSettings(tenantId) {
    const response = await this.api.get(`/${tenantId}/settings`);
    return response.data;
  }

  async updateTenantSettings(tenantId, settings) {
    const response = await this.api.put(`/${tenantId}/settings`, settings);
    return response.data;
  }
}

export const tenantService = new TenantService();
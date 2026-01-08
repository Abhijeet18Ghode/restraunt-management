import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class SystemTenantService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/tenants`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createTenant(tenantData) {
    const response = await this.api.post('/', tenantData);
    return response.data;
  }

  async getTenants(page = 1, limit = 20, isActive = null) {
    const params = { page, limit };
    if (isActive !== null) {
      params.isActive = isActive;
    }
    
    const response = await this.api.get('/', { params });
    return response.data;
  }

  async getTenant(tenantId) {
    const response = await this.api.get(`/${tenantId}`);
    return response.data;
  }

  async updateTenant(tenantId, updateData) {
    const response = await this.api.put(`/${tenantId}`, updateData);
    return response.data;
  }

  async deleteTenant(tenantId) {
    const response = await this.api.delete(`/${tenantId}`);
    return response.data;
  }

  async getTenantConfig(tenantId) {
    const response = await this.api.get(`/${tenantId}/config`);
    return response.data;
  }

  // System admin specific methods
  async getSystemStats() {
    try {
      const response = await this.getTenants(1, 1000); // Get all tenants for stats
      const tenants = response.data || [];
      
      const stats = {
        totalTenants: tenants.length,
        activeTenants: tenants.filter(t => t.isActive).length,
        inactiveTenants: tenants.filter(t => !t.isActive).length,
        subscriptionBreakdown: {
          BASIC: tenants.filter(t => t.subscriptionPlan === 'BASIC').length,
          PREMIUM: tenants.filter(t => t.subscriptionPlan === 'PREMIUM').length,
          ENTERPRISE: tenants.filter(t => t.subscriptionPlan === 'ENTERPRISE').length,
        },
        recentTenants: tenants
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      };

      return { success: true, data: stats };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return { success: false, error: error.message };
    }
  }
}

export const systemTenantService = new SystemTenantService();
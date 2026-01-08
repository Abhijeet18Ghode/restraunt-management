import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class InventoryService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/inventory`,
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

  // Get inventory levels for all items
  async getInventoryLevels(outletId = null) {
    const params = outletId ? { outletId } : {};
    const response = await this.api.get('/levels', { params });
    return response.data;
  }

  // Get inventory status for specific menu items
  async getMenuItemsInventoryStatus(menuItemIds, outletId = null) {
    const response = await this.api.post('/menu-items/status', {
      menuItemIds,
      outletId
    });
    return response.data;
  }

  // Get low stock items
  async getLowStockItems(outletId = null) {
    const params = outletId ? { outletId } : {};
    const response = await this.api.get('/low-stock', { params });
    return response.data;
  }

  // Update inventory level
  async updateInventoryLevel(itemId, quantity, reason = 'manual_adjustment', outletId = null) {
    const response = await this.api.post('/update', {
      itemId,
      quantity,
      reason,
      outletId
    });
    return response.data;
  }

  // Get inventory analytics
  async getInventoryAnalytics(outletId = null, dateRange = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/analytics', { params });
    return response.data;
  }

  // Get consumption patterns
  async getConsumptionPatterns(itemId, outletId = null, days = 30) {
    const params = { days };
    if (outletId) params.outletId = outletId;
    
    const response = await this.api.get(`/consumption/${itemId}`, { params });
    return response.data;
  }

  // Subscribe to real-time inventory updates
  subscribeToInventoryUpdates(callback) {
    // This will be implemented with WebSocket service
    if (typeof window !== 'undefined' && window.inventorySocket) {
      window.inventorySocket.on('inventory_updated', callback);
      window.inventorySocket.on('low_stock_alert', callback);
    }
  }

  // Unsubscribe from real-time updates
  unsubscribeFromInventoryUpdates(callback) {
    if (typeof window !== 'undefined' && window.inventorySocket) {
      window.inventorySocket.off('inventory_updated', callback);
      window.inventorySocket.off('low_stock_alert', callback);
    }
  }
}

export const inventoryService = new InventoryService();
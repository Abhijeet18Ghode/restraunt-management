import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class MenuService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
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

  // Categories
  async getCategories(outletId) {
    const response = await this.api.get(`/categories?outletId=${outletId}`);
    return response.data.data; // Extract the data array from the API response
  }

  async createCategory(categoryData) {
    const response = await this.api.post('/categories', categoryData);
    return response.data.data; // Extract the data from the API response
  }

  async updateCategory(categoryId, data) {
    const response = await this.api.put(`/categories/${categoryId}`, data);
    return response.data.data; // Extract the data from the API response
  }

  async deleteCategory(categoryId) {
    const response = await this.api.delete(`/categories/${categoryId}`);
    return response.data.data; // Extract the data from the API response
  }

  // Menu Items
  async getMenuItems(outletId, categoryId = null) {
    let url = `/menu/items?outletId=${outletId}`;
    if (categoryId) {
      url += `&categoryId=${categoryId}`;
    }
    const response = await this.api.get(url);
    return response.data.data; // Extract the data array from the API response
  }

  async createMenuItem(itemData) {
    const response = await this.api.post('/menu/items', itemData);
    return response.data.data; // Extract the data from the API response
  }

  async updateMenuItem(itemId, data) {
    const response = await this.api.put(`/menu/items/${itemId}`, data);
    return response.data.data; // Extract the data from the API response
  }

  async deleteMenuItem(itemId) {
    const response = await this.api.delete(`/menu/items/${itemId}`);
    return response.data.data; // Extract the data from the API response
  }

  async updateItemAvailability(itemId, available) {
    const response = await this.api.patch(`/menu/items/${itemId}/availability`, { available });
    return response.data;
  }

  // Pricing
  async updateItemPrice(itemId, price) {
    const response = await this.api.patch(`/menu/items/${itemId}/price`, { price });
    return response.data;
  }

  async bulkUpdatePrices(updates) {
    const response = await this.api.post('/menu/pricing/bulk-update', { updates });
    return response.data;
  }

  async bulkUpdateAvailability(itemIds, available) {
    const response = await this.api.patch('/menu/items/availability', { 
      itemIds, 
      isAvailable: available 
    });
    return response.data;
  }

  async bulkUpdateCategory(itemIds, categoryId) {
    const response = await this.api.post('/items/bulk-category', { 
      itemIds, 
      categoryId 
    });
    return response.data;
  }

  async copyItemsToOutlet(itemIds, sourceOutletId, targetOutletId, options = {}) {
    const response = await this.api.post('/items/copy-to-outlet', {
      itemIds,
      sourceOutletId,
      targetOutletId,
      options
    });
    return response.data;
  }

  async syncMenuBetweenOutlets(sourceOutletId, targetOutletIds, syncOptions = {}) {
    const response = await this.api.post('/menu/sync-outlets', {
      sourceOutletId,
      targetOutletIds,
      syncOptions
    });
    return response.data;
  }

  // Pricing management
  async getPriceHistory(itemId) {
    const response = await this.api.get(`/items/${itemId}/price-history`);
    return response.data;
  }

  async applyPricingRule(ruleId, itemIds) {
    const response = await this.api.post('/pricing/apply-rule', {
      ruleId,
      itemIds
    });
    return response.data;
  }

  async getPricingRules(outletId) {
    const response = await this.api.get(`/pricing/rules?outletId=${outletId}`);
    return response.data;
  }

  // Menu Management
  async getFullMenu(outletId) {
    const response = await this.api.get(`/full-menu?outletId=${outletId}`);
    return response.data;
  }

  async reorderCategories(outletId, categoryOrder) {
    const response = await this.api.post('/categories/reorder', {
      outletId,
      categoryOrder,
    });
    return response.data;
  }

  async reorderMenuItems(categoryId, itemOrder) {
    const response = await this.api.post('/items/reorder', {
      categoryId,
      itemOrder,
    });
    return response.data;
  }
}

export const menuService = new MenuService();
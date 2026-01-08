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

  // Inventory Items Management
  async getInventoryItems(outletId, page = 1, limit = 20, category = null, search = '') {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(category && { category }),
      ...(search && { search })
    });
    const response = await this.api.get(`/?${params}`);
    return response.data;
  }

  async getInventoryItem(itemId) {
    const response = await this.api.get(`/${itemId}`);
    return response.data;
  }

  async createInventoryItem(itemData) {
    const response = await this.api.post('/', itemData);
    return response.data;
  }

  async updateInventoryItem(itemId, data) {
    const response = await this.api.put(`/${itemId}`, data);
    return response.data;
  }

  async deleteInventoryItem(itemId) {
    const response = await this.api.delete(`/${itemId}`);
    return response.data;
  }

  async getInventoryCategories(outletId) {
    const response = await this.api.get(`/categories?outletId=${outletId}`);
    return response.data;
  }

  // Stock Management
  async getStockLevels(outletId, lowStockOnly = false) {
    const params = new URLSearchParams({
      outletId,
      ...(lowStockOnly && { lowStockOnly: 'true' })
    });
    const response = await this.api.get(`/stock?${params}`);
    return response.data;
  }

  async updateStockLevel(itemId, quantity, reason, notes = '') {
    const response = await this.api.post(`/${itemId}/stock`, {
      quantity,
      reason,
      notes
    });
    return response.data;
  }

  async getStockHistory(itemId, page = 1, limit = 20) {
    const response = await this.api.get(`/${itemId}/stock/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  async performStockAudit(outletId, auditData) {
    const response = await this.api.post(`/stock/audit`, {
      outletId,
      ...auditData
    });
    return response.data;
  }

  async getStockAudits(outletId, page = 1, limit = 10) {
    const response = await this.api.get(`/stock/audits?outletId=${outletId}&page=${page}&limit=${limit}`);
    return response.data;
  }

  // Alerts Management
  async getAlerts(outletId, type = null, status = 'active') {
    const params = new URLSearchParams({
      outletId,
      status,
      ...(type && { type })
    });
    const response = await this.api.get(`/alerts?${params}`);
    return response.data;
  }

  async createAlert(alertData) {
    const response = await this.api.post('/alerts', alertData);
    return response.data;
  }

  async updateAlert(alertId, data) {
    const response = await this.api.put(`/alerts/${alertId}`, data);
    return response.data;
  }

  async dismissAlert(alertId) {
    const response = await this.api.patch(`/alerts/${alertId}/dismiss`);
    return response.data;
  }

  async getAlertSettings(outletId) {
    const response = await this.api.get(`/alerts/settings?outletId=${outletId}`);
    return response.data;
  }

  async updateAlertSettings(outletId, settings) {
    const response = await this.api.put(`/alerts/settings`, {
      outletId,
      ...settings
    });
    return response.data;
  }

  // Supplier Management
  async getSuppliers(outletId, page = 1, limit = 20) {
    const response = await this.api.get(`/suppliers?outletId=${outletId}&page=${page}&limit=${limit}`);
    return response.data;
  }

  async getSupplier(supplierId) {
    const response = await this.api.get(`/suppliers/${supplierId}`);
    return response.data;
  }

  async createSupplier(supplierData) {
    const response = await this.api.post('/suppliers', supplierData);
    return response.data;
  }

  async updateSupplier(supplierId, data) {
    const response = await this.api.put(`/suppliers/${supplierId}`, data);
    return response.data;
  }

  async deleteSupplier(supplierId) {
    const response = await this.api.delete(`/suppliers/${supplierId}`);
    return response.data;
  }

  async getSupplierItems(supplierId, page = 1, limit = 20) {
    const response = await this.api.get(`/suppliers/${supplierId}/items?page=${page}&limit=${limit}`);
    return response.data;
  }

  async addSupplierItem(supplierId, itemData) {
    const response = await this.api.post(`/suppliers/${supplierId}/items`, itemData);
    return response.data;
  }

  async updateSupplierItem(supplierId, itemId, data) {
    const response = await this.api.put(`/suppliers/${supplierId}/items/${itemId}`, data);
    return response.data;
  }

  // Purchase Orders
  async getPurchaseOrders(outletId, status = null, page = 1, limit = 20) {
    const params = new URLSearchParams({
      outletId,
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status })
    });
    const response = await this.api.get(`/purchase-orders?${params}`);
    return response.data;
  }

  async getPurchaseOrder(orderId) {
    const response = await this.api.get(`/purchase-orders/${orderId}`);
    return response.data;
  }

  async createPurchaseOrder(orderData) {
    const response = await this.api.post('/purchase-orders', orderData);
    return response.data;
  }

  async updatePurchaseOrder(orderId, data) {
    const response = await this.api.put(`/purchase-orders/${orderId}`, data);
    return response.data;
  }

  async approvePurchaseOrder(orderId) {
    const response = await this.api.patch(`/purchase-orders/${orderId}/approve`);
    return response.data;
  }

  async receivePurchaseOrder(orderId, receivedItems) {
    const response = await this.api.post(`/purchase-orders/${orderId}/receive`, {
      receivedItems
    });
    return response.data;
  }

  async cancelPurchaseOrder(orderId, reason) {
    const response = await this.api.patch(`/purchase-orders/${orderId}/cancel`, {
      reason
    });
    return response.data;
  }

  // Recipe Management
  async getRecipes(outletId, page = 1, limit = 20) {
    const response = await this.api.get(`/recipes?outletId=${outletId}&page=${page}&limit=${limit}`);
    return response.data;
  }

  async getRecipe(recipeId) {
    const response = await this.api.get(`/recipes/${recipeId}`);
    return response.data;
  }

  async createRecipe(recipeData) {
    const response = await this.api.post('/recipes', recipeData);
    return response.data;
  }

  async updateRecipe(recipeId, data) {
    const response = await this.api.put(`/recipes/${recipeId}`, data);
    return response.data;
  }

  async deleteRecipe(recipeId) {
    const response = await this.api.delete(`/recipes/${recipeId}`);
    return response.data;
  }

  async calculateRecipeCost(recipeId) {
    const response = await this.api.get(`/recipes/${recipeId}/cost`);
    return response.data;
  }

  // Inventory Analytics
  async getInventoryAnalytics(outletId, period = '30d') {
    const response = await this.api.get(`/analytics?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getInventoryTurnover(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/turnover?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getWasteAnalysis(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/waste?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  async getCostAnalysis(outletId, period = '30d') {
    const response = await this.api.get(`/analytics/cost?outletId=${outletId}&period=${period}`);
    return response.data;
  }

  // Bulk Operations
  async importInventory(outletId, csvData) {
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

  async exportInventory(outletId, format = 'csv') {
    const response = await this.api.get(`/export?outletId=${outletId}&format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  async bulkUpdateStock(outletId, updates) {
    const response = await this.api.post('/stock/bulk-update', {
      outletId,
      updates
    });
    return response.data;
  }
}

export default InventoryService;
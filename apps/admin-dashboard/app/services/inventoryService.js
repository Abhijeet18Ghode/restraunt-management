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

  // Supplier Management
  async getSuppliers() {
    const response = await this.api.get('/suppliers');
    return response.data;
  }

  async createSupplier(supplierData) {
    const response = await this.api.post('/suppliers', supplierData);
    return response.data;
  }

  async updateSupplier(supplierId, supplierData) {
    const response = await this.api.put(`/suppliers/${supplierId}`, supplierData);
    return response.data;
  }

  async deleteSupplier(supplierId) {
    const response = await this.api.delete(`/suppliers/${supplierId}`);
    return response.data;
  }

  // Purchase Order Management
  async getPurchaseOrders(status = null, outletId = null) {
    const params = {};
    if (status) params.status = status;
    if (outletId) params.outletId = outletId;
    
    const response = await this.api.get('/purchase-orders', { params });
    return response.data;
  }

  async createPurchaseOrder(orderData) {
    const response = await this.api.post('/purchase-orders', orderData);
    return response.data;
  }

  async updatePurchaseOrder(orderId, orderData) {
    const response = await this.api.put(`/purchase-orders/${orderId}`, orderData);
    return response.data;
  }

  async approvePurchaseOrder(orderId) {
    const response = await this.api.post(`/purchase-orders/${orderId}/approve`);
    return response.data;
  }

  async receivePurchaseOrder(orderId, receivedItems) {
    const response = await this.api.post(`/purchase-orders/${orderId}/receive`, {
      receivedItems
    });
    return response.data;
  }

  // Inventory Items Management
  async getInventoryItems(outletId = null, category = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (category) params.category = category;
    
    const response = await this.api.get('/items', { params });
    return response.data;
  }

  async createInventoryItem(itemData) {
    const response = await this.api.post('/items', itemData);
    return response.data;
  }

  async updateInventoryItem(itemId, itemData) {
    const response = await this.api.put(`/items/${itemId}`, itemData);
    return response.data;
  }

  async deleteInventoryItem(itemId) {
    const response = await this.api.delete(`/items/${itemId}`);
    return response.data;
  }

  // Stock Adjustments
  async createStockAdjustment(adjustmentData) {
    const response = await this.api.post('/adjustments', adjustmentData);
    return response.data;
  }

  async getStockAdjustments(outletId = null, dateRange = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/adjustments', { params });
    return response.data;
  }

  // Reporting and Analytics
  async getConsumptionTrends(outletId = null, dateRange = null, itemIds = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    if (itemIds) params.itemIds = itemIds.join(',');
    
    const response = await this.api.get('/reports/consumption-trends', { params });
    return response.data;
  }

  async getWasteAnalysis(outletId = null, dateRange = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/reports/waste-analysis', { params });
    return response.data;
  }

  async getCostBreakdown(outletId = null, dateRange = null, category = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (category) params.category = category;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/reports/cost-breakdown', { params });
    return response.data;
  }

  async getInventoryValuation(outletId = null, asOfDate = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (asOfDate) params.asOfDate = asOfDate;
    
    const response = await this.api.get('/reports/valuation', { params });
    return response.data;
  }

  async getStockMovementReport(outletId = null, dateRange = null, itemId = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (itemId) params.itemId = itemId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/reports/stock-movement', { params });
    return response.data;
  }

  async getSupplierPerformance(supplierId = null, dateRange = null) {
    const params = {};
    if (supplierId) params.supplierId = supplierId;
    if (dateRange) {
      params.startDate = dateRange.startDate;
      params.endDate = dateRange.endDate;
    }
    
    const response = await this.api.get('/reports/supplier-performance', { params });
    return response.data;
  }

  // Stock Transfer Management
  async getStockTransfers(outletId = null, status = null) {
    const params = {};
    if (outletId) params.outletId = outletId;
    if (status) params.status = status;
    
    const response = await this.api.get('/transfers', { params });
    return response.data;
  }

  async createStockTransfer(transferData) {
    const response = await this.api.post('/transfers', transferData);
    return response.data;
  }

  async updateStockTransfer(transferId, transferData) {
    const response = await this.api.put(`/transfers/${transferId}`, transferData);
    return response.data;
  }

  async approveStockTransfer(transferId) {
    const response = await this.api.post(`/transfers/${transferId}/approve`);
    return response.data;
  }

  async receiveStockTransfer(transferId, receivedItems) {
    const response = await this.api.post(`/transfers/${transferId}/receive`, {
      receivedItems
    });
    return response.data;
  }

  // Export Functions
  async exportInventoryReport(reportType, params = {}) {
    const response = await this.api.get(`/reports/export/${reportType}`, {
      params,
      responseType: 'blob'
    });
    return response.data;
  }

  async exportStockMovement(outletId = null, dateRange = null) {
    return this.exportInventoryReport('stock-movement', {
      outletId,
      ...dateRange
    });
  }

  async exportConsumptionTrends(outletId = null, dateRange = null) {
    return this.exportInventoryReport('consumption-trends', {
      outletId,
      ...dateRange
    });
  }

  async exportWasteAnalysis(outletId = null, dateRange = null) {
    return this.exportInventoryReport('waste-analysis', {
      outletId,
      ...dateRange
    });
  }
}

export const inventoryService = new InventoryService();
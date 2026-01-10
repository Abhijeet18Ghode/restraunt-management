'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { websocketService } from '../../services/websocketService';

const InventoryTracker = ({ outletId = null }) => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadInventoryData();
    setupRealTimeUpdates();

    return () => {
      cleanupRealTimeUpdates();
    };
  }, [outletId, selectedCategory]);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [itemsResponse, lowStockResponse] = await Promise.all([
        inventoryService.getInventoryItems(outletId, selectedCategory === 'all' ? null : selectedCategory),
        inventoryService.getLowStockItems(outletId)
      ]);

      setInventoryItems(itemsResponse.data || []);
      setLowStockItems(lowStockResponse.data || []);
    } catch (err) {
      setError('Failed to load inventory data');
      console.error('Inventory loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const handleInventoryUpdate = (data) => {
      if (data.type === 'inventory_level_changed') {
        setInventoryItems(prev => 
          prev.map(item => 
            item.id === data.itemId 
              ? { ...item, currentStock: data.newLevel, lastUpdated: data.timestamp }
              : item
          )
        );
      } else if (data.type === 'low_stock_alert') {
        setLowStockItems(prev => {
          const exists = prev.find(item => item.id === data.itemId);
          if (!exists) {
            return [...prev, data.item];
          }
          return prev;
        });
      }
    };

    inventoryService.subscribeToInventoryUpdates(handleInventoryUpdate);
  };

  const cleanupRealTimeUpdates = () => {
    inventoryService.unsubscribeFromInventoryUpdates();
  };

  const handleStockAdjustment = async (itemId, newQuantity, reason) => {
    try {
      await inventoryService.updateInventoryLevel(itemId, newQuantity, reason, outletId);
      await loadInventoryData(); // Refresh data
    } catch (err) {
      setError('Failed to update stock level');
      console.error('Stock adjustment error:', err);
    }
  };

  const getStockStatusColor = (item) => {
    const { currentStock, minStock, maxStock } = item;
    if (currentStock <= minStock) return 'text-red-600 bg-red-50';
    if (currentStock <= minStock * 1.5) return 'text-yellow-600 bg-yellow-50';
    if (currentStock >= maxStock) return 'text-blue-600 bg-blue-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockStatusText = (item) => {
    const { currentStock, minStock, maxStock } = item;
    if (currentStock <= minStock) return 'Critical';
    if (currentStock <= minStock * 1.5) return 'Low';
    if (currentStock >= maxStock) return 'Overstocked';
    return 'Normal';
  };

  const filteredAndSortedItems = inventoryItems
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'stockStatus') {
        aValue = a.currentStock / a.minStock;
        bValue = b.currentStock / b.minStock;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const categories = ['all', 'ingredients', 'beverages', 'packaging', 'cleaning', 'other'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Inventory Tracking</h2>
        <div className="flex space-x-3">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Add Item
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            ⚠️ Low Stock Alerts ({lowStockItems.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white p-3 rounded border">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-600">
                  Current: {item.currentStock} {item.unit}
                </div>
                <div className="text-sm text-red-600">
                  Min: {item.minStock} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="currentStock">Stock Level</option>
              <option value="stockStatus">Stock Status</option>
              <option value="lastUpdated">Last Updated</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min/Max
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        SKU: {item.sku || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {item.currentStock} {item.unit}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(item)}`}>
                      {getStockStatusText(item)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.minStock} / {item.maxStock} {item.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => {/* Handle edit */}}
                      >
                        Edit
                      </button>
                      <button 
                        className="text-green-600 hover:text-green-900"
                        onClick={() => {/* Handle stock adjustment */}}
                      >
                        Adjust
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{inventoryItems.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Low Stock</div>
          <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Normal Stock</div>
          <div className="text-2xl font-bold text-green-600">
            {inventoryItems.filter(item => 
              item.currentStock > item.minStock * 1.5 && item.currentStock < item.maxStock
            ).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Overstocked</div>
          <div className="text-2xl font-bold text-blue-600">
            {inventoryItems.filter(item => item.currentStock >= item.maxStock).length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryTracker;
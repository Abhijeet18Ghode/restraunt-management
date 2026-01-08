'use client';

import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../../services/inventoryService';
import websocketService from '../../services/websocketService';

import InventoryStatusIndicator, { InventoryStatusBadge, StockLevelBar } from '../Inventory/InventoryStatusIndicator';
import { 
  AlertTriangle, 
  RefreshCw, 
  Package, 
  TrendingDown,
  Clock,
  Settings
} from 'lucide-react';

/**
 * Menu Inventory Integration Component
 * Connects menu items with real-time inventory status
 */
export default function MenuInventoryIntegration({ 
  menuItems = [], 
  outletId = null,
  onAvailabilityChange = null,
  showAnalytics = true,
  className = ''
}) {
  const [inventoryData, setInventoryData] = useState({});
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load inventory data for menu items
  const loadInventoryData = useCallback(async () => {
    if (menuItems.length === 0) return;

    try {
      setLoading(true);
      
      // Get inventory status for all menu items
      const menuItemIds = menuItems.map(item => item.id);
      const inventoryStatus = await inventoryService.getMenuItemsInventoryStatus(
        menuItemIds, 
        outletId
      );

      // Get low stock items
      const lowStock = await inventoryService.getLowStockItems(outletId);

      setInventoryData(inventoryStatus);
      setLowStockItems(lowStock);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  }, [menuItems, outletId]);

  // Handle real-time inventory updates
  const handleInventoryUpdate = useCallback((data) => {
    console.log('Inventory update received:', data);
    
    // Update inventory data for affected items
    if (data.itemId && inventoryData[data.itemId]) {
      setInventoryData(prev => ({
        ...prev,
        [data.itemId]: {
          ...prev[data.itemId],
          currentStock: data.newStock,
          lastUpdated: new Date(data.timestamp)
        }
      }));
    }

    // Handle low stock alerts
    if (data.type === 'low_stock_alert') {
      setLowStockItems(prev => {
        const exists = prev.find(item => item.id === data.itemId);
        if (!exists) {
          return [...prev, data];
        }
        return prev;
      });
    }

    // Trigger availability change callback
    if (onAvailabilityChange && data.availabilityChanged) {
      onAvailabilityChange(data.itemId, data.isAvailable);
    }

    setLastUpdated(new Date());
  }, [inventoryData, onAvailabilityChange]);

  // Set up real-time updates
  useEffect(() => {
    if (autoRefresh) {
      // Subscribe to WebSocket updates
      websocketService.subscribe('inventory_updated', handleInventoryUpdate);
      websocketService.subscribe('low_stock_alert', handleInventoryUpdate);
      websocketService.subscribe('menu_availability_changed', handleInventoryUpdate);

      return () => {
        websocketService.unsubscribe('inventory_updated', handleInventoryUpdate);
        websocketService.unsubscribe('low_stock_alert', handleInventoryUpdate);
        websocketService.unsubscribe('menu_availability_changed', handleInventoryUpdate);
      };
    }
  }, [autoRefresh, handleInventoryUpdate]);

  // Load initial data
  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadInventoryData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadInventoryData]);

  const handleToggleAvailability = async (itemId, currentAvailability) => {
    try {
      // Update menu item availability
      const newAvailability = !currentAvailability;
      
      // This would typically call menuService.updateAvailability
      console.log(`Toggling availability for item ${itemId} to ${newAvailability}`);
      
      if (onAvailabilityChange) {
        onAvailabilityChange(itemId, newAvailability);
      }
    } catch (error) {
      console.error('Failed to toggle availability:', error);
    }
  };

  const getItemInventoryInfo = (itemId) => {
    return inventoryData[itemId] || {
      currentStock: 0,
      minStock: 5,
      maxStock: 100,
      unit: 'units',
      isAvailable: false,
      lastUpdated: null
    };
  };

  if (loading && Object.keys(inventoryData).length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-medium text-gray-900">
              Menu Inventory Status
            </h3>
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${autoRefresh 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }
              `}
            >
              <Clock className="h-4 w-4 inline mr-1" />
              Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={loadInventoryData}
              disabled={loading}
              className="btn-secondary btn-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h4 className="font-medium text-yellow-800">
              Low Stock Alerts ({lowStockItems.length})
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="bg-white rounded p-3 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <InventoryStatusBadge
                    itemId={item.id}
                    currentStock={item.currentStock}
                    minStock={item.minStock}
                  />
                </div>
                <div className="mt-2">
                  <StockLevelBar
                    currentStock={item.currentStock}
                    minStock={item.minStock}
                    maxStock={item.maxStock}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Items with Inventory Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Menu Items Inventory Status</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {menuItems.map((item) => {
            const inventoryInfo = getItemInventoryInfo(item.id);
            
            return (
              <MenuItemInventoryRow
                key={item.id}
                item={item}
                inventoryInfo={inventoryInfo}
                onToggleAvailability={handleToggleAvailability}
              />
            );
          })}
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <InventoryAnalyticsSummary 
          inventoryData={inventoryData}
          menuItems={menuItems}
        />
      )}
    </div>
  );
}

/**
 * Menu Item Inventory Row Component
 */
function MenuItemInventoryRow({ item, inventoryInfo, onToggleAvailability }) {
  return (
    <div className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {item.image ? (
              <img 
                src={item.image} 
                alt={item.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>
          <div>
            <h5 className="font-medium text-gray-900">{item.name}</h5>
            <p className="text-sm text-gray-600">{item.category}</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Inventory Status */}
          <div className="text-center">
            <InventoryStatusIndicator
              itemId={item.id}
              currentStock={inventoryInfo.currentStock}
              minStock={inventoryInfo.minStock}
              maxStock={inventoryInfo.maxStock}
              unit={inventoryInfo.unit}
              showLabel={false}
              size="md"
            />
            <div className="text-xs text-gray-500 mt-1">
              {inventoryInfo.currentStock} {inventoryInfo.unit}
            </div>
          </div>

          {/* Stock Level Bar */}
          <div className="w-32">
            <StockLevelBar
              currentStock={inventoryInfo.currentStock}
              minStock={inventoryInfo.minStock}
              maxStock={inventoryInfo.maxStock}
            />
          </div>

          {/* Availability Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Available:</span>
            <button
              onClick={() => onToggleAvailability(item.id, inventoryInfo.isAvailable)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${inventoryInfo.isAvailable ? 'bg-green-600' : 'bg-gray-200'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${inventoryInfo.isAvailable ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inventory Analytics Summary Component
 */
function InventoryAnalyticsSummary({ inventoryData, menuItems }) {
  const analytics = {
    totalItems: menuItems.length,
    inStock: Object.values(inventoryData).filter(item => item.currentStock > item.minStock).length,
    lowStock: Object.values(inventoryData).filter(item => item.currentStock <= item.minStock && item.currentStock > 0).length,
    outOfStock: Object.values(inventoryData).filter(item => item.currentStock <= 0).length
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h4 className="font-medium text-gray-900 mb-4">Inventory Summary</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-900">{analytics.totalItems}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-green-600">{analytics.inStock}</div>
          <div className="text-sm text-gray-600">In Stock</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-yellow-600">{analytics.lowStock}</div>
          <div className="text-sm text-gray-600">Low Stock</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-600">{analytics.outOfStock}</div>
          <div className="text-sm text-gray-600">Out of Stock</div>
        </div>
      </div>
    </div>
  );
}
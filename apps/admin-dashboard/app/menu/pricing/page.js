'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import PermissionGate from '../../components/Auth/PermissionGate';
import { useRoleManager } from '../../components/Auth/RoleManager';
import PricingManager from '../../components/Menu/PricingManager';
import BulkOperations from '../../components/Menu/BulkOperations';
import MultiOutletManager from '../../components/Menu/MultiOutletManager';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Building2,
  BarChart3,
  Settings,
} from 'lucide-react';

function PricingPageContent() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('pricing');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    averagePrice: 0,
    priceRange: { min: 0, max: 0 },
    recentChanges: 0,
  });

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  useEffect(() => {
    if (selectedOutlet) {
      loadData();
    }
  }, [selectedOutlet]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        menuService.getMenuItems(selectedOutlet.id),
        menuService.getCategories(selectedOutlet.id),
      ]);
      
      setMenuItems(itemsData);
      setCategories(categoriesData);
      calculateStats(itemsData);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    if (items.length === 0) {
      setStats({
        totalItems: 0,
        averagePrice: 0,
        priceRange: { min: 0, max: 0 },
        recentChanges: 0,
      });
      return;
    }

    const prices = items.map(item => item.price || 0);
    const totalPrice = prices.reduce((sum, price) => sum + price, 0);
    
    setStats({
      totalItems: items.length,
      averagePrice: totalPrice / items.length,
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
      recentChanges: items.filter(item => item.recentlyUpdated).length,
    });
  };

  const handleItemsUpdate = (updatedItems) => {
    setMenuItems(updatedItems);
    calculateStats(updatedItems);
  };

  const handleSelectionClear = () => {
    setSelectedItems([]);
  };

  const tabs = [
    {
      id: 'pricing',
      name: 'Pricing Management',
      icon: DollarSign,
      permission: PERMISSIONS.MENU_PRICING_VIEW,
    },
    {
      id: 'bulk',
      name: 'Bulk Operations',
      icon: Calculator,
      permission: PERMISSIONS.MENU_BULK_MANAGE,
    },
    {
      id: 'outlets',
      name: 'Multi-Outlet',
      icon: Building2,
      permission: PERMISSIONS.MENU_BULK_MANAGE,
    },
    {
      id: 'analytics',
      name: 'Price Analytics',
      icon: BarChart3,
      permission: PERMISSIONS.ANALYTICS_VIEW,
    },
  ];

  const filteredTabs = tabs.filter(tab => 
    !tab.permission || PERMISSIONS[tab.permission]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Pricing</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage pricing, bulk operations, and multi-outlet synchronization
            </p>
          </div>
          
          <PermissionGate permission={PERMISSIONS.MENU_PRICING_MANAGE}>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Pricing Settings
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Average Price</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats.averagePrice.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Price Range</p>
                <p className="text-2xl font-semibold text-gray-900">
                  ${stats.priceRange.min.toFixed(2)} - ${stats.priceRange.max.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calculator className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.totalItems}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Changes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.recentChanges}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center py-2 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === 'pricing' && (
            <PricingManager
              items={menuItems}
              onItemsUpdate={handleItemsUpdate}
            />
          )}

          {activeTab === 'bulk' && (
            <BulkOperations
              selectedItems={selectedItems}
              allItems={menuItems}
              onItemsUpdate={handleItemsUpdate}
              onSelectionClear={handleSelectionClear}
            />
          )}

          {activeTab === 'outlets' && (
            <MultiOutletManager
              items={menuItems}
              categories={categories}
              onItemsUpdate={handleItemsUpdate}
            />
          )}

          {activeTab === 'analytics' && (
            <Card className="p-8 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Price Analytics
              </h3>
              <p className="text-gray-500">
                Advanced pricing analytics and insights coming soon
              </p>
            </Card>
          )}
        </div>

        {/* Bulk Selection Bar */}
        {selectedItems.length > 0 && activeTab === 'pricing' && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <Card className="p-4 shadow-lg">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">
                  {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                </span>
                <Button
                  size="sm"
                  onClick={() => setActiveTab('bulk')}
                >
                  Bulk Operations
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectionClear}
                >
                  Clear
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function PricingPage() {
  return (
    <ProtectedRoute 
      requiredPermission="menu.pricing.view"
      resource="menu pricing management"
    >
      <PricingPageContent />
    </ProtectedRoute>
  );
}
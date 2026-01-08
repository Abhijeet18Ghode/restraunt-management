'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import PermissionGate from '../../components/Auth/PermissionGate';
import { useRoleManager } from '../../components/Auth/RoleManager';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Package,
  AlertCircle,
} from 'lucide-react';

function MenuItemsContent() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedOutlet } = useTenant();
  const { PERMISSIONS, canAccessFeature } = useRoleManager();

  useEffect(() => {
    if (selectedOutlet) {
      loadMenuItems();
    }
  }, [selectedOutlet]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const data = await menuService.getMenuItems(selectedOutlet.id);
      setMenuItems(data);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Menu Items</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your restaurant's menu items and pricing
            </p>
          </div>
          
          {/* Create button - only show if user has permission */}
          <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </PermissionGate>
        </div>

        {/* Bulk operations - only for managers and admins */}
        <PermissionGate permission={PERMISSIONS.MENU_BULK_MANAGE}>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Bulk Operations</h3>
                <p className="text-sm text-gray-500">
                  Perform operations on multiple menu items at once
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Bulk Price Update
                </Button>
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Update Availability
                </Button>
              </div>
            </div>
          </Card>
        </PermissionGate>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.category}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                {item.image && (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg ml-4"
                  />
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold text-gray-900">
                  ${item.price.toFixed(2)}
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  item.isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </div>
              </div>

              {/* Low stock warning - only show if user can view inventory */}
              <PermissionGate permission={PERMISSIONS.INVENTORY_VIEW}>
                {item.lowStock && (
                  <div className="flex items-center text-yellow-600 text-sm mb-4">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Low stock warning
                  </div>
                )}
              </PermissionGate>

              {/* Action buttons based on permissions */}
              <div className="flex space-x-2">
                {/* View button - everyone can view */}
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>

                {/* Edit button - only if user can manage items */}
                <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </PermissionGate>

                {/* Delete button - only for admins and managers */}
                <PermissionGate 
                  permission={PERMISSIONS.MENU_ITEMS_MANAGE}
                  role={['admin', 'manager']}
                >
                  <Button variant="danger" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </PermissionGate>
              </div>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {menuItems.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No menu items found
            </h3>
            <p className="text-gray-500 mb-6">
              Get started by adding your first menu item.
            </p>
            <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </PermissionGate>
          </Card>
        )}

        {/* Permission-based feature showcase */}
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Feature Access Based on Your Role
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(PERMISSIONS.MENU_ITEMS_MANAGE) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Create/Edit Menu Items</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(PERMISSIONS.MENU_PRICING_MANAGE) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Manage Pricing</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(PERMISSIONS.MENU_BULK_MANAGE) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Bulk Operations</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(PERMISSIONS.INVENTORY_VIEW) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>View Inventory Status</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(PERMISSIONS.ANALYTICS_VIEW) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>View Analytics</span>
              </div>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  canAccessFeature(null, ['admin', 'manager']) ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Advanced Management</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function MenuItemsPage() {
  return (
    <ProtectedRoute 
      requiredPermission="menu.items.view"
      resource="menu items management"
    >
      <MenuItemsContent />
    </ProtectedRoute>
  );
}
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import PermissionGate from '../../components/Auth/PermissionGate';
import { useRoleManager } from '../../components/Auth/RoleManager';
import CategoryManager from '../../components/Menu/CategoryManager';
import MenuItemForm from '../../components/Menu/MenuItemForm';
import MenuAnalytics from '../../components/Menu/MenuAnalytics';
import MenuInventoryIntegration from '../../components/Menu/MenuInventoryIntegration';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
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
  Grid,
  List,
  Search,
  Filter,
  Download,
  Upload,
} from 'lucide-react';

function MenuManagementContent() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showInventoryIntegration, setShowInventoryIntegration] = useState(true);

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS, canAccessFeature } = useRoleManager();

  // Utility function to safely format price
  const formatPrice = (price) => {
    if (typeof price === 'number') {
      return price.toFixed(2);
    }
    const numPrice = parseFloat(price || 0);
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  useEffect(() => {
    if (selectedOutlet) {
      loadData();
    }
  }, [selectedOutlet]);

  useEffect(() => {
    filterItems();
  }, [menuItems, selectedCategory, searchTerm]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, itemsData] = await Promise.all([
        menuService.getCategories(selectedOutlet.id),
        menuService.getMenuItems(selectedOutlet.id),
      ]);
      setCategories(categoriesData);
      setMenuItems(itemsData);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.categoryId === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const handleCategoriesUpdate = (updatedCategories) => {
    setCategories(updatedCategories);
  };

  const handleItemSave = (savedItem) => {
    if (editingItem) {
      setMenuItems(items => items.map(item => 
        item.id === editingItem.id ? savedItem : item
      ));
    } else {
      setMenuItems(items => [...items, savedItem]);
    }
    setShowItemForm(false);
    setEditingItem(null);
  };

  const handleItemEdit = (item) => {
    setEditingItem(item);
    setShowItemForm(true);
  };

  const handleItemDelete = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      await menuService.deleteMenuItem(itemId);
      setMenuItems(items => items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete menu item:', error);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (selectedItems.length === 0) return;

    const newPrice = prompt('Enter new price for selected items:');
    if (!newPrice || isNaN(parseFloat(newPrice))) return;

    try {
      const updates = selectedItems.map(itemId => ({
        itemId,
        price: parseFloat(newPrice),
      }));

      await menuService.bulkUpdatePrices(updates);
      
      // Update local state
      setMenuItems(items => items.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, price: parseFloat(newPrice) }
          : item
      ));

      setSelectedItems([]);
      setBulkMode(false);
    } catch (error) {
      console.error('Failed to update prices:', error);
    }
  };

  const handleAvailabilityChange = async (itemId, isAvailable) => {
    try {
      await menuService.updateItemAvailability(itemId, isAvailable);
      
      // Update local state
      setMenuItems(items => items.map(item => 
        item.id === itemId ? { ...item, isAvailable } : item
      ));
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const handleBulkAvailabilityToggle = async (available) => {
    if (selectedItems.length === 0) return;

    try {
      await Promise.all(
        selectedItems.map(itemId => 
          menuService.updateItemAvailability(itemId, available)
        )
      );

      // Update local state
      setMenuItems(items => items.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, isAvailable: available }
          : item
      ));

      setSelectedItems([]);
      setBulkMode(false);
    } catch (error) {
      console.error('Failed to update availability:', error);
    }
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage categories, items, and pricing for your restaurant
            </p>
          </div>
          
          <div className="flex space-x-3">
            <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
              <Button
                variant="outline"
                onClick={() => setBulkMode(!bulkMode)}
              >
                {bulkMode ? 'Exit Bulk Mode' : 'Bulk Operations'}
              </Button>
              <Button onClick={() => setShowItemForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Category Management */}
        <PermissionGate permission={PERMISSIONS.MENU_CATEGORIES_VIEW}>
          <CategoryManager
            categories={categories}
            onCategoriesUpdate={handleCategoriesUpdate}
          />
        </PermissionGate>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setShowAnalytics(false);
                setShowInventoryIntegration(false);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                !showAnalytics && !showInventoryIntegration
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Menu Items
            </button>
            <PermissionGate permission={PERMISSIONS.INVENTORY_VIEW}>
              <button
                onClick={() => {
                  setShowInventoryIntegration(true);
                  setShowAnalytics(false);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  showInventoryIntegration
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Inventory Status
              </button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.ANALYTICS_VIEW}>
              <button
                onClick={() => {
                  setShowAnalytics(true);
                  setShowInventoryIntegration(false);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  showAnalytics
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
            </PermissionGate>
          </nav>
        </div>

        {/* Inventory Integration Tab */}
        {showInventoryIntegration && (
          <PermissionGate permission={PERMISSIONS.INVENTORY_VIEW}>
            <MenuInventoryIntegration
              menuItems={menuItems}
              outletId={selectedOutlet?.id}
              onAvailabilityChange={handleAvailabilityChange}
              showAnalytics={true}
            />
          </PermissionGate>
        )}

        {/* Analytics Tab */}
        {showAnalytics && (
          <PermissionGate permission={PERMISSIONS.ANALYTICS_VIEW}>
            <MenuAnalytics
              menuItems={menuItems}
              outletId={selectedOutlet?.id}
            />
          </PermissionGate>
        )}

        {/* Menu Items Tab (default) */}
        {!showAnalytics && !showInventoryIntegration && (
          <>
        {/* Filters and Controls */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${
                    viewMode === 'list'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Export/Import */}
              <PermissionGate permission={PERMISSIONS.MENU_BULK_MANAGE}>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Bulk Operations Bar */}
          {bulkMode && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedItems.length} items selected
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedItems(filteredItems.map(item => item.id))}
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedItems([])}
                  >
                    Clear Selection
                  </Button>
                </div>

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={handleBulkPriceUpdate}
                    disabled={selectedItems.length === 0}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Update Prices
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAvailabilityToggle(true)}
                    disabled={selectedItems.length === 0}
                  >
                    Make Available
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAvailabilityToggle(false)}
                    disabled={selectedItems.length === 0}
                  >
                    Make Unavailable
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Menu Items */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-6">
                {bulkMode && (
                  <div className="mb-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleItemSelection(item.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {categories.find(cat => cat.id === item.categoryId)?.name}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  </div>
                  {item.images?.[0] && (
                    <img 
                      src={item.images[0].url || item.images[0]} 
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg ml-4"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-semibold text-gray-900">
                    ${formatPrice(item.price)}
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.isAvailable 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </div>
                </div>

                {/* Dietary indicators */}
                {(item.isVegetarian || item.isVegan || item.isGlutenFree) && (
                  <div className="flex space-x-1 mb-4">
                    {item.isVegetarian && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Vegetarian
                      </span>
                    )}
                    {item.isVegan && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Vegan
                      </span>
                    )}
                    {item.isGlutenFree && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        Gluten Free
                      </span>
                    )}
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>

                  <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleItemEdit(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </PermissionGate>

                  <PermissionGate 
                    permission={PERMISSIONS.MENU_ITEMS_MANAGE}
                    role={['admin', 'manager']}
                  >
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => handleItemDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          // List view
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {bulkMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedItems.length === filteredItems.length && filteredItems.length > 0}
                          onChange={(e) => 
                            setSelectedItems(
                              e.target.checked ? filteredItems.map(item => item.id) : []
                            )
                          }
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      {bulkMode && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.images?.[0] && (
                            <img 
                              src={item.images[0].url || item.images[0]} 
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded-lg mr-3"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {item.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {categories.find(cat => cat.id === item.categoryId)?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${formatPrice(item.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.isAvailable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleItemEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate 
                          permission={PERMISSIONS.MENU_ITEMS_MANAGE}
                          role={['admin', 'manager']}
                        >
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleItemDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedCategory !== 'all' 
                ? 'No items match your filters' 
                : 'No menu items found'
              }
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first menu item.'
              }
            </p>
            <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
              <Button onClick={() => setShowItemForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Menu Item
              </Button>
            </PermissionGate>
          </Card>
        )}
        </>
        )}

        {/* Menu Item Form Modal */}
        <Modal
          isOpen={showItemForm}
          onClose={() => {
            setShowItemForm(false);
            setEditingItem(null);
          }}
          title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          size="xl"
        >
          <MenuItemForm
            item={editingItem}
            categories={categories}
            onSave={handleItemSave}
            onCancel={() => {
              setShowItemForm(false);
              setEditingItem(null);
            }}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
}

export default function MenuManagementPage() {
  return (
    <ProtectedRoute 
      requiredPermission="menu.view"
      resource="menu management"
    >
      <MenuManagementContent />
    </ProtectedRoute>
  );
}
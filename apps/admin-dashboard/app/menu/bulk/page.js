'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import PermissionGate from '../../components/Auth/PermissionGate';
import { useRoleManager } from '../../components/Auth/RoleManager';
import BulkOperations from '../../components/Menu/BulkOperations';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Calculator,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  DollarSign,
  Package,
  Grid,
  List,
} from 'lucide-react';

function BulkOperationsPageContent() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  useEffect(() => {
    if (selectedOutlet) {
      loadData();
    }
  }, [selectedOutlet]);

  useEffect(() => {
    filterItems();
  }, [menuItems, searchTerm, selectedCategory, availabilityFilter, priceRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsData, categoriesData] = await Promise.all([
        menuService.getMenuItems(selectedOutlet.id),
        menuService.getCategories(selectedOutlet.id),
      ]);
      
      setMenuItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.categoryId === selectedCategory);
    }

    // Availability filter
    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(item => 
        availabilityFilter === 'available' ? item.isAvailable : !item.isAvailable
      );
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(item => {
        const price = item.price || 0;
        const min = parseFloat(priceRange.min) || 0;
        const max = parseFloat(priceRange.max) || Infinity;
        return price >= min && price <= max;
      });
    }

    setFilteredItems(filtered);
  };

  const handleItemsUpdate = (updatedItems) => {
    setMenuItems(updatedItems);
  };

  const handleSelectionClear = () => {
    setSelectedItems([]);
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredItems.map(item => item.id));
    }
  };

  const isAllSelected = selectedItems.length === filteredItems.length && filteredItems.length > 0;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < filteredItems.length;

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
            <h1 className="text-2xl font-bold text-gray-900">Bulk Operations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Select and manage multiple menu items at once
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {selectedItems.length} of {filteredItems.length} selected
            </span>
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              disabled={filteredItems.length === 0}
            >
              {isAllSelected ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>

            {/* Availability Filter */}
            <Select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="available">Available Only</option>
              <option value="unavailable">Unavailable Only</option>
            </Select>

            {/* Price Range */}
            <div className="flex space-x-2">
              <Input
                placeholder="Min $"
                type="number"
                step="0.01"
                value={priceRange.min}
                onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              />
              <Input
                placeholder="Max $"
                type="number"
                step="0.01"
                value={priceRange.max}
                onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              />
            </div>

            {/* View Mode */}
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
          </div>
        </Card>

        {/* Bulk Operations Component */}
        <BulkOperations
          selectedItems={selectedItems}
          allItems={menuItems}
          onItemsUpdate={handleItemsUpdate}
          onSelectionClear={handleSelectionClear}
        />

        {/* Items Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => toggleItemSelection(item.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  {item.images?.[0] && (
                    <img 
                      src={item.images[0].url || item.images[0]} 
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900 line-clamp-1">
                    {item.name}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      ${item.price?.toFixed(2)}
                    </span>
                    <div className={`flex items-center text-xs ${
                      item.isAvailable ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {item.isAvailable ? (
                        <Eye className="h-3 w-3 mr-1" />
                      ) : (
                        <EyeOff className="h-3 w-3 mr-1" />
                      )}
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {categories.find(cat => cat.id === item.categoryId)?.name}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isPartiallySelected;
                        }}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50 ${
                        selectedItems.includes(item.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
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
                        ${item.price?.toFixed(2)}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <Card className="p-12 text-center">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No items match your filters
            </h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or filters
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function BulkOperationsPage() {
  return (
    <ProtectedRoute 
      requiredPermission="menu.bulk.manage"
      resource="bulk menu operations"
    >
      <BulkOperationsPageContent />
    </ProtectedRoute>
  );
}
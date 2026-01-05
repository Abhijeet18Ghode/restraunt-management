'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { menuService } from '../../services/menuService';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { selectedOutlet } = useTenant();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    available: true,
    ingredients: '',
    allergens: '',
    preparationTime: '',
  });

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
    } catch (error) {
      console.error('Failed to load menu data:', error);
      toast.error('Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const itemData = {
        ...formData,
        outletId: selectedOutlet.id,
        price: parseFloat(formData.price),
        preparationTime: parseInt(formData.preparationTime) || 0,
        ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(Boolean),
        allergens: formData.allergens.split(',').map(a => a.trim()).filter(Boolean),
      };

      if (editingItem) {
        await menuService.updateMenuItem(editingItem.id, itemData);
        toast.success('Menu item updated successfully');
      } else {
        await menuService.createMenuItem(itemData);
        toast.success('Menu item created successfully');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Failed to save menu item:', error);
      toast.error('Failed to save menu item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      categoryId: item.categoryId,
      available: item.available,
      ingredients: item.ingredients?.join(', ') || '',
      allergens: item.allergens?.join(', ') || '',
      preparationTime: item.preparationTime?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      await menuService.deleteMenuItem(item.id);
      toast.success('Menu item deleted successfully');
      loadData();
    } catch (error) {
      console.error('Failed to delete menu item:', error);
      toast.error('Failed to delete menu item');
    }
  };

  const toggleAvailability = async (item) => {
    try {
      await menuService.updateItemAvailability(item.id, !item.available);
      toast.success(`${item.name} ${!item.available ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      console.error('Failed to update availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      available: true,
      ingredients: '',
      allergens: '',
      preparationTime: '',
    });
    setEditingItem(null);
  };

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.categoryId === selectedCategory);

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <ProtectedRoute requiredPermission="menu.view">
      <DashboardLayout>
        <Toaster position="top-right" />
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Menu Items</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your menu items for {selectedOutlet?.name}
              </p>
            </div>
            
            <Button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Filter by Category:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input w-auto"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Menu Items */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <Card key={item.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getCategoryName(item.categoryId)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`p-1 rounded ${
                          item.available 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={item.available ? 'Available' : 'Unavailable'}
                      >
                        {item.available ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-sm text-gray-600 mb-4">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xl font-bold text-primary-600">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.preparationTime && (
                      <span className="text-sm text-gray-500">
                        {item.preparationTime} min
                      </span>
                    )}
                  </div>

                  {item.ingredients && item.ingredients.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        Ingredients:
                      </p>
                      <p className="text-xs text-gray-600">
                        {item.ingredients.join(', ')}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {!loading && filteredItems.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-gray-500">
                No menu items found. 
                {selectedCategory !== 'all' ? ' Try selecting a different category.' : ''}
              </p>
            </Card>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  className="input"
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="input"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={formData.preparationTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ingredients (comma-separated)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., tomato, cheese, basil"
                value={formData.ingredients}
                onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allergens (comma-separated)
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g., dairy, gluten, nuts"
                value={formData.allergens}
                onChange={(e) => setFormData(prev => ({ ...prev, allergens: e.target.value }))}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="available"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                checked={formData.available}
                onChange={(e) => setFormData(prev => ({ ...prev, available: e.target.checked }))}
              />
              <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                Available for ordering
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update Item' : 'Create Item'}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
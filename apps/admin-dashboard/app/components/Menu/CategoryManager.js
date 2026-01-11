'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import PermissionGate from '../Auth/PermissionGate';
import { useRoleManager } from '../Auth/RoleManager';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Save,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// Error Boundary Component for Drag Operations
class DragErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Drag operation error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div className="flex-1">
            <span className="text-red-700">
              Drag and drop temporarily unavailable. 
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function CategoryManager({ categories, onCategoriesUpdate }) {
  const [localCategories, setLocalCategories] = useState([]);
  const [previousCategories, setPreviousCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [dragLoading, setDragLoading] = useState(false);
  const [error, setError] = useState('');

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  useEffect(() => {
    // Ensure categories is always an array with proper validation
    const categoriesArray = Array.isArray(categories) ? categories : [];
    setLocalCategories(categoriesArray);
    setPreviousCategories(categoriesArray);
  }, [categories]);

  const handleDragEnd = useCallback(async (result) => {
    // Early return if no destination or invalid drag
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // No change if dropped in same position
    if (source.index === destination.index) return;

    try {
      setDragLoading(true);
      setError('');

      // Optimistic update - update UI immediately
      const items = Array.from(localCategories);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);

      // Update display order
      const updatedItems = items.map((item, index) => ({
        ...item,
        displayOrder: index,
      }));

      // Store previous state for rollback
      setPreviousCategories(localCategories);
      
      // Apply optimistic update
      setLocalCategories(updatedItems);

      // Save new order to backend
      await menuService.reorderCategories(
        selectedOutlet.id,
        updatedItems.map(item => item.id)
      );
      
      // Notify parent component of successful update
      onCategoriesUpdate(updatedItems);
      
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      
      // Rollback on failure
      setLocalCategories(previousCategories);
      
      // Show user-friendly error with retry option
      setError(
        <div className="flex items-center justify-between">
          <span>Failed to save category order. Please try again.</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDragEnd(result)}
            className="ml-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      );
    } finally {
      setDragLoading(false);
    }
  }, [localCategories, previousCategories, selectedOutlet.id, onCategoriesUpdate]);

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        displayOrder: category.displayOrder || 0,
        isActive: category.isActive !== false,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        displayOrder: localCategories.length,
        isActive: true,
      });
    }
    setIsModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const categoryData = {
        ...formData,
        outletId: selectedOutlet.id,
      };

      let updatedCategory;
      if (editingCategory) {
        updatedCategory = await menuService.updateCategory(editingCategory.id, categoryData);
        const updatedCategories = localCategories.map(cat =>
          cat.id === editingCategory.id ? updatedCategory : cat
        );
        setLocalCategories(updatedCategories);
        onCategoriesUpdate(updatedCategories);
      } else {
        updatedCategory = await menuService.createCategory(categoryData);
        const newCategories = [...localCategories, updatedCategory];
        setLocalCategories(newCategories);
        onCategoriesUpdate(newCategories);
      }

      closeModal();
    } catch (error) {
      console.error('Failed to save category:', error);
      setError(error.response?.data?.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      await menuService.deleteCategory(categoryId);
      const updatedCategories = localCategories.filter(cat => cat.id !== categoryId);
      setLocalCategories(updatedCategories);
      onCategoriesUpdate(updatedCategories);
    } catch (error) {
      console.error('Failed to delete category:', error);
      setError('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Menu Categories</h2>
          <p className="text-sm text-gray-500">
            Organize your menu items into categories. Drag to reorder.
          </p>
        </div>
        <PermissionGate permission={PERMISSIONS.MENU_CATEGORIES_MANAGE}>
          <Button onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </PermissionGate>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <div className="flex-1">
            {typeof error === 'string' ? (
              <span className="text-red-700">{error}</span>
            ) : (
              error
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError('')}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Drag Loading Indicator */}
      {dragLoading && (
        <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
          <span className="text-blue-700">Saving category order...</span>
        </div>
      )}

      {/* Categories List with Error Boundary */}
      <DragErrorBoundary>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-3 ${
                  snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                }`}
              >
                {Array.isArray(localCategories) && localCategories.map((category, index) => (
                  <Draggable
                    key={category.id}
                    draggableId={category.id.toString()}
                    index={index}
                    isDragDisabled={dragLoading}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-4 transition-all duration-200 ${
                          snapshot.isDragging ? 'shadow-lg rotate-2 z-50' : ''
                        } ${dragLoading ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              {...provided.dragHandleProps}
                              className={`cursor-grab active:cursor-grabbing ${
                                dragLoading ? 'cursor-not-allowed' : ''
                              }`}
                            >
                              <GripVertical className="h-5 w-5 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">
                                {category.name}
                              </h3>
                              {category.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              category.isActive !== false
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {category.isActive !== false ? 'Active' : 'Inactive'}
                            </div>

                            <PermissionGate permission={PERMISSIONS.MENU_CATEGORIES_MANAGE}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openModal(category)}
                                disabled={dragLoading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(category.id)}
                                className="text-red-600 hover:text-red-700"
                                disabled={dragLoading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </DragErrorBoundary>

      {/* Empty state */}
      {(!Array.isArray(localCategories) || localCategories.length === 0) && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Plus className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No categories yet
          </h3>
          <p className="text-gray-500 mb-4">
            Create your first menu category to organize your items.
          </p>
          <PermissionGate permission={PERMISSIONS.MENU_CATEGORIES_MANAGE}>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </PermissionGate>
        </Card>
      )}

      {/* Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter category name"
            required
          />

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={3}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active category
            </label>
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {editingCategory ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
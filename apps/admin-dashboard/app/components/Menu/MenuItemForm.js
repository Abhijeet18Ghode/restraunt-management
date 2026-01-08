'use client';

import { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import Select from '../UI/Select';
import ImageUpload from '../UI/ImageUpload';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Save,
  X,
  AlertCircle,
  Plus,
  Trash2,
  DollarSign,
  Clock,
  Package,
} from 'lucide-react';

export default function MenuItemForm({ 
  item = null, 
  categories = [], 
  onSave, 
  onCancel 
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    preparationTime: '',
    ingredients: [],
    allergens: [],
    nutritionalInfo: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
    },
    images: [],
    isAvailable: true,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    spiceLevel: 'none',
  });

  const [newIngredient, setNewIngredient] = useState('');
  const [newAllergen, setNewAllergen] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const { selectedOutlet } = useTenant();

  const spiceLevels = [
    { value: 'none', label: 'No Spice' },
    { value: 'mild', label: 'Mild' },
    { value: 'medium', label: 'Medium' },
    { value: 'hot', label: 'Hot' },
    { value: 'very_hot', label: 'Very Hot' },
  ];

  const commonAllergens = [
    'Dairy', 'Eggs', 'Fish', 'Shellfish', 'Tree Nuts', 
    'Peanuts', 'Wheat', 'Soy', 'Sesame'
  ];

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        categoryId: item.categoryId || '',
        preparationTime: item.preparationTime?.toString() || '',
        ingredients: item.ingredients || [],
        allergens: item.allergens || [],
        nutritionalInfo: {
          calories: item.nutritionalInfo?.calories?.toString() || '',
          protein: item.nutritionalInfo?.protein?.toString() || '',
          carbs: item.nutritionalInfo?.carbs?.toString() || '',
          fat: item.nutritionalInfo?.fat?.toString() || '',
        },
        images: item.images || [],
        isAvailable: item.isAvailable !== false,
        isVegetarian: item.isVegetarian || false,
        isVegan: item.isVegan || false,
        isGlutenFree: item.isGlutenFree || false,
        spiceLevel: item.spiceLevel || 'none',
      });
    }
  }, [item]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required';
    }

    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }

    if (formData.preparationTime && (isNaN(parseInt(formData.preparationTime)) || parseInt(formData.preparationTime) < 0)) {
      newErrors.preparationTime = 'Preparation time must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const itemData = {
        ...formData,
        outletId: selectedOutlet.id,
        price: parseFloat(formData.price),
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : null,
        nutritionalInfo: {
          calories: formData.nutritionalInfo.calories ? parseInt(formData.nutritionalInfo.calories) : null,
          protein: formData.nutritionalInfo.protein ? parseFloat(formData.nutritionalInfo.protein) : null,
          carbs: formData.nutritionalInfo.carbs ? parseFloat(formData.nutritionalInfo.carbs) : null,
          fat: formData.nutritionalInfo.fat ? parseFloat(formData.nutritionalInfo.fat) : null,
        },
      };

      let savedItem;
      if (item) {
        savedItem = await menuService.updateMenuItem(item.id, itemData);
      } else {
        savedItem = await menuService.createMenuItem(itemData);
      }

      onSave(savedItem);
    } catch (error) {
      console.error('Failed to save menu item:', error);
      setErrors({ 
        submit: error.response?.data?.message || 'Failed to save menu item' 
      });
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = () => {
    if (newIngredient.trim() && !formData.ingredients.includes(newIngredient.trim())) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, newIngredient.trim()]
      });
      setNewIngredient('');
    }
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const addAllergen = (allergen) => {
    if (!formData.allergens.includes(allergen)) {
      setFormData({
        ...formData,
        allergens: [...formData.allergens, allergen]
      });
    }
  };

  const removeAllergen = (allergen) => {
    setFormData({
      ...formData,
      allergens: formData.allergens.filter(a => a !== allergen)
    });
  };

  const handleImageUpload = (images) => {
    setFormData({
      ...formData,
      images: images
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Item Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter item name"
              error={errors.name}
              required
            />
          </div>

          <div className="md:col-span-2">
            <TextArea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the menu item"
              rows={3}
            />
          </div>

          <Select
            label="Category"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            error={errors.categoryId}
            required
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Input
            label="Price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0.00"
            error={errors.price}
            icon={DollarSign}
            required
          />

          <Input
            label="Preparation Time (minutes)"
            type="number"
            min="0"
            value={formData.preparationTime}
            onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
            placeholder="15"
            error={errors.preparationTime}
            icon={Clock}
          />

          <Select
            label="Spice Level"
            value={formData.spiceLevel}
            onChange={(e) => setFormData({ ...formData, spiceLevel: e.target.value })}
          >
            {spiceLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Dietary Options */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Dietary Options</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isVegetarian}
                onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Vegetarian</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isVegan}
                onChange={(e) => setFormData({ ...formData, isVegan: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Vegan</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isGlutenFree}
                onChange={(e) => setFormData({ ...formData, isGlutenFree: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Gluten Free</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Available</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Images */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Images</h3>
        <ImageUpload
          images={formData.images}
          onImagesChange={handleImageUpload}
          maxImages={5}
        />
      </Card>

      {/* Ingredients */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ingredients</h3>
        
        <div className="flex space-x-2 mb-4">
          <Input
            value={newIngredient}
            onChange={(e) => setNewIngredient(e.target.value)}
            placeholder="Add ingredient"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
            className="flex-1"
          />
          <Button
            type="button"
            onClick={addIngredient}
            disabled={!newIngredient.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.ingredients.map((ingredient, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {ingredient}
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </Card>

      {/* Allergens */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Allergens</h3>
        
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {commonAllergens.map(allergen => (
            <button
              key={allergen}
              type="button"
              onClick={() => 
                formData.allergens.includes(allergen) 
                  ? removeAllergen(allergen)
                  : addAllergen(allergen)
              }
              className={`px-3 py-2 text-sm rounded-lg border ${
                formData.allergens.includes(allergen)
                  ? 'bg-red-100 border-red-300 text-red-800'
                  : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {allergen}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {formData.allergens.map(allergen => (
            <span
              key={allergen}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
            >
              {allergen}
              <button
                type="button"
                onClick={() => removeAllergen(allergen)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </Card>

      {/* Nutritional Information */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Nutritional Information (Optional)</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Input
            label="Calories"
            type="number"
            min="0"
            value={formData.nutritionalInfo.calories}
            onChange={(e) => setFormData({
              ...formData,
              nutritionalInfo: {
                ...formData.nutritionalInfo,
                calories: e.target.value
              }
            })}
            placeholder="250"
          />

          <Input
            label="Protein (g)"
            type="number"
            step="0.1"
            min="0"
            value={formData.nutritionalInfo.protein}
            onChange={(e) => setFormData({
              ...formData,
              nutritionalInfo: {
                ...formData.nutritionalInfo,
                protein: e.target.value
              }
            })}
            placeholder="15.5"
          />

          <Input
            label="Carbs (g)"
            type="number"
            step="0.1"
            min="0"
            value={formData.nutritionalInfo.carbs}
            onChange={(e) => setFormData({
              ...formData,
              nutritionalInfo: {
                ...formData.nutritionalInfo,
                carbs: e.target.value
              }
            })}
            placeholder="30.2"
          />

          <Input
            label="Fat (g)"
            type="number"
            step="0.1"
            min="0"
            value={formData.nutritionalInfo.fat}
            onChange={(e) => setFormData({
              ...formData,
              nutritionalInfo: {
                ...formData.nutritionalInfo,
                fat: e.target.value
              }
            })}
            placeholder="8.5"
          />
        </div>
      </Card>

      {/* Error Display */}
      {errors.submit && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{errors.submit}</span>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
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
              {item ? 'Update Item' : 'Create Item'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
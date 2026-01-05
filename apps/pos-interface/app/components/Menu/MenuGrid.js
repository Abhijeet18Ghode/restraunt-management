'use client';

import { useState, useEffect } from 'react';
import { usePOS } from '../../contexts/POSContext';
import { useAuth } from '../../contexts/AuthContext';
import { posService } from '../../services/posService';
import TouchButton from '../UI/TouchButton';
import { Plus, Clock } from 'lucide-react';

export default function MenuGrid() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { addItem } = usePOS();
  const { outletId } = useAuth();

  useEffect(() => {
    if (outletId) {
      loadMenuData();
    }
  }, [outletId]);

  const loadMenuData = async () => {
    try {
      setLoading(true);
      const [categoriesData, menuData] = await Promise.all([
        posService.getCategories(outletId),
        posService.getMenu(outletId),
      ]);
      
      setCategories(categoriesData);
      setMenuItems(menuData);
    } catch (error) {
      console.error('Failed to load menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.categoryId === selectedCategory);

  const handleAddItem = (item) => {
    if (!item.available) return;
    
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.categoryName,
      preparationTime: item.preparationTime,
    });

    // Visual feedback
    const button = document.getElementById(`item-${item.id}`);
    if (button) {
      button.classList.add('scale-110');
      setTimeout(() => {
        button.classList.remove('scale-110');
      }, 150);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`category-tab whitespace-nowrap ${
              selectedCategory === 'all' 
                ? 'category-tab-active' 
                : 'category-tab-inactive'
            }`}
          >
            All Items
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-tab whitespace-nowrap ${
                selectedCategory === category.id 
                  ? 'category-tab-active' 
                  : 'category-tab-inactive'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              id={`item-${item.id}`}
              className={`menu-item-card ${
                !item.available ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleAddItem(item)}
            >
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                  {item.name}
                </h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                  {item.categoryName}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-primary-600">
                    ${item.price.toFixed(2)}
                  </span>
                  {item.preparationTime && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {item.preparationTime}m
                    </div>
                  )}
                </div>
                
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-colors
                  ${item.available 
                    ? 'bg-primary-100 text-primary-600' 
                    : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  <Plus className="h-4 w-4" />
                </div>
              </div>

              {!item.available && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-20 rounded-xl flex items-center justify-center">
                  <span className="text-white font-medium text-sm bg-red-600 px-2 py-1 rounded">
                    Unavailable
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-lg font-medium">No items available</p>
            <p className="text-sm">
              {selectedCategory === 'all' 
                ? 'No menu items found' 
                : 'No items in this category'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
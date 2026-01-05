'use client';

import { usePOS } from '../../contexts/POSContext';
import TouchButton from '../UI/TouchButton';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';

export default function OrderCart() {
  const { 
    currentOrder, 
    removeItem, 
    updateQuantity, 
    selectedTable,
    clearOrder 
  } = usePOS();

  const handleQuantityChange = (itemId, change) => {
    const item = currentOrder.items.find(item => item.id === itemId);
    if (item) {
      const newQuantity = item.quantity + change;
      if (newQuantity <= 0) {
        removeItem(itemId);
      } else {
        updateQuantity(itemId, newQuantity);
      }
    }
  };

  if (currentOrder.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
        <ShoppingCart className="h-16 w-16 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium mb-2">Cart is Empty</h3>
        <p className="text-sm text-center">
          Add items from the menu to start building an order
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Order</h2>
            {selectedTable && (
              <p className="text-sm text-gray-500">
                Table {selectedTable.number}
              </p>
            )}
          </div>
          <TouchButton
            variant="secondary"
            size="sm"
            onClick={clearOrder}
            className="text-red-600 hover:text-red-700"
          >
            Clear All
          </TouchButton>
        </div>
      </div>

      {/* Order Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {currentOrder.items.map(item => (
          <div key={item.id} className="cart-item">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.name}</h4>
              <p className="text-sm text-gray-500">{item.category}</p>
              <p className="text-sm font-medium text-primary-600">
                ${item.price.toFixed(2)} each
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Quantity Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleQuantityChange(item.id, -1)}
                  className="quantity-btn text-gray-600"
                >
                  <Minus className="h-4 w-4" />
                </button>
                
                <span className="w-8 text-center font-medium">
                  {item.quantity}
                </span>
                
                <button
                  onClick={() => handleQuantityChange(item.id, 1)}
                  className="quantity-btn text-gray-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right min-w-[60px]">
                <p className="font-semibold text-gray-900">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Summary */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">${currentOrder.subtotal.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (10%):</span>
            <span className="font-medium">${currentOrder.tax.toFixed(2)}</span>
          </div>
          
          {currentOrder.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Discount:</span>
              <span className="font-medium text-green-600">
                -${currentOrder.discount.toFixed(2)}
              </span>
            </div>
          )}
          
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
            <span>Total:</span>
            <span className="text-primary-600">${currentOrder.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          {currentOrder.items.length} item{currentOrder.items.length !== 1 ? 's' : ''} • 
          {currentOrder.items.reduce((sum, item) => sum + item.quantity, 0)} total quantity
        </div>
      </div>
    </div>
  );
}
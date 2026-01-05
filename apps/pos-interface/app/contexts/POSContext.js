'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { posService } from '../services/posService';

const POSContext = createContext({});

// POS State Management
const initialState = {
  currentOrder: {
    id: null,
    tableId: null,
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    status: 'draft',
  },
  selectedTable: null,
  paymentMethod: null,
  isProcessingPayment: false,
  orderHistory: [],
};

function posReducer(state, action) {
  switch (action.type) {
    case 'SET_TABLE':
      return {
        ...state,
        selectedTable: action.payload,
        currentOrder: {
          ...state.currentOrder,
          tableId: action.payload?.id || null,
        },
      };

    case 'ADD_ITEM':
      const existingItemIndex = state.currentOrder.items.findIndex(
        item => item.id === action.payload.id
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = state.currentOrder.items.map((item, index) =>
          index === existingItemIndex
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        updatedItems = [
          ...state.currentOrder.items,
          { ...action.payload, quantity: 1 }
        ];
      }

      const newOrder = {
        ...state.currentOrder,
        items: updatedItems,
      };

      return {
        ...state,
        currentOrder: calculateOrderTotals(newOrder),
      };

    case 'REMOVE_ITEM':
      const filteredItems = state.currentOrder.items.filter(
        item => item.id !== action.payload
      );
      const orderAfterRemoval = {
        ...state.currentOrder,
        items: filteredItems,
      };

      return {
        ...state,
        currentOrder: calculateOrderTotals(orderAfterRemoval),
      };

    case 'UPDATE_QUANTITY':
      const { itemId, quantity } = action.payload;
      const itemsWithUpdatedQuantity = state.currentOrder.items.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(0, quantity) } : item
      ).filter(item => item.quantity > 0);

      const orderWithUpdatedQuantity = {
        ...state.currentOrder,
        items: itemsWithUpdatedQuantity,
      };

      return {
        ...state,
        currentOrder: calculateOrderTotals(orderWithUpdatedQuantity),
      };

    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload,
      };

    case 'SET_PROCESSING_PAYMENT':
      return {
        ...state,
        isProcessingPayment: action.payload,
      };

    case 'CLEAR_ORDER':
      return {
        ...state,
        currentOrder: initialState.currentOrder,
        selectedTable: null,
        paymentMethod: null,
      };

    case 'LOAD_ORDER':
      return {
        ...state,
        currentOrder: calculateOrderTotals(action.payload),
      };

    case 'ADD_TO_HISTORY':
      return {
        ...state,
        orderHistory: [action.payload, ...state.orderHistory.slice(0, 49)], // Keep last 50
      };

    default:
      return state;
  }
}

function calculateOrderTotals(order) {
  const subtotal = order.items.reduce(
    (sum, item) => sum + (item.price * item.quantity), 
    0
  );
  
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax - (order.discount || 0);

  return {
    ...order,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function POSProvider({ children }) {
  const [state, dispatch] = useReducer(posReducer, initialState);
  const { isAuthenticated, outletId } = useAuth();

  // Auto-save order to localStorage
  useEffect(() => {
    if (isAuthenticated && state.currentOrder.items.length > 0) {
      localStorage.setItem('pos_current_order', JSON.stringify(state.currentOrder));
    }
  }, [state.currentOrder, isAuthenticated]);

  // Load saved order on mount
  useEffect(() => {
    if (isAuthenticated) {
      const savedOrder = localStorage.getItem('pos_current_order');
      if (savedOrder) {
        try {
          const order = JSON.parse(savedOrder);
          dispatch({ type: 'LOAD_ORDER', payload: order });
        } catch (error) {
          console.error('Failed to load saved order:', error);
        }
      }
    }
  }, [isAuthenticated]);

  const addItem = (item) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  };

  const removeItem = (itemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  };

  const updateQuantity = (itemId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { itemId, quantity } });
  };

  const setTable = (table) => {
    dispatch({ type: 'SET_TABLE', payload: table });
  };

  const setPaymentMethod = (method) => {
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  };

  const processPayment = async () => {
    if (!state.currentOrder.items.length || !state.selectedTable || !state.paymentMethod) {
      throw new Error('Order incomplete');
    }

    dispatch({ type: 'SET_PROCESSING_PAYMENT', payload: true });

    try {
      const orderData = {
        ...state.currentOrder,
        outletId,
        paymentMethod: state.paymentMethod,
        staffId: state.user?.id,
      };

      const result = await posService.processOrder(orderData);
      
      // Add to history
      dispatch({ type: 'ADD_TO_HISTORY', payload: result });
      
      // Clear current order
      dispatch({ type: 'CLEAR_ORDER' });
      localStorage.removeItem('pos_current_order');

      return result;
    } finally {
      dispatch({ type: 'SET_PROCESSING_PAYMENT', payload: false });
    }
  };

  const clearOrder = () => {
    dispatch({ type: 'CLEAR_ORDER' });
    localStorage.removeItem('pos_current_order');
  };

  const value = {
    ...state,
    addItem,
    removeItem,
    updateQuantity,
    setTable,
    setPaymentMethod,
    processPayment,
    clearOrder,
  };

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
}

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
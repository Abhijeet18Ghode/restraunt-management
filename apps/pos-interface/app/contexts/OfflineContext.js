'use client';

import { createContext, useContext, useEffect, useState } from 'react';

const OfflineContext = createContext({});

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Load pending orders from localStorage
    const saved = localStorage.getItem('pos_pending_orders');
    if (saved) {
      try {
        setPendingOrders(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load pending orders:', error);
      }
    }

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOrders();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save pending orders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pos_pending_orders', JSON.stringify(pendingOrders));
  }, [pendingOrders]);

  const addPendingOrder = (order) => {
    const orderWithId = {
      ...order,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      status: 'pending_sync',
    };

    setPendingOrders(prev => [...prev, orderWithId]);
    return orderWithId;
  };

  const removePendingOrder = (orderId) => {
    setPendingOrders(prev => prev.filter(order => order.id !== orderId));
  };

  const syncPendingOrders = async () => {
    if (!isOnline || pendingOrders.length === 0) return;

    const { posService } = await import('../services/posService');

    for (const order of pendingOrders) {
      try {
        await posService.processOrder(order);
        removePendingOrder(order.id);
      } catch (error) {
        console.error('Failed to sync order:', order.id, error);
        // Keep the order in pending state for retry
      }
    }
  };

  const value = {
    isOnline,
    pendingOrders,
    addPendingOrder,
    removePendingOrder,
    syncPendingOrders,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
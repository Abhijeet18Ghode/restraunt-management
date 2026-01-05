import { renderHook, act } from '@testing-library/react';
import { OfflineProvider, useOffline } from '../../app/contexts/OfflineContext';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('OfflineContext', () => {
  beforeEach(() => {
    localStorage.clear();
    navigator.onLine = true;
  });

  const wrapper = ({ children }) => <OfflineProvider>{children}</OfflineProvider>;

  it('initializes with online status', () => {
    const { result } = renderHook(() => useOffline(), { wrapper });
    
    expect(result.current.isOnline).toBe(true);
    expect(result.current.pendingOrders).toEqual([]);
  });

  it('detects offline status', () => {
    navigator.onLine = false;
    
    const { result } = renderHook(() => useOffline(), { wrapper });
    
    // Simulate offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    
    expect(result.current.isOnline).toBe(false);
  });

  it('adds pending orders when offline', () => {
    const { result } = renderHook(() => useOffline(), { wrapper });
    
    const testOrder = {
      items: [{ id: 'item-1', name: 'Test Item', price: 10.99, quantity: 1 }],
      total: 12.09,
      tableId: 'table-1',
    };

    let addedOrder;
    act(() => {
      addedOrder = result.current.addPendingOrder(testOrder);
    });

    expect(result.current.pendingOrders).toHaveLength(1);
    expect(addedOrder.id).toMatch(/^offline_/);
    expect(addedOrder.status).toBe('pending_sync');
    expect(addedOrder.timestamp).toBeTruthy();
  });

  it('removes pending orders', () => {
    const { result } = renderHook(() => useOffline(), { wrapper });
    
    const testOrder = {
      items: [{ id: 'item-1', name: 'Test Item', price: 10.99, quantity: 1 }],
      total: 12.09,
      tableId: 'table-1',
    };

    let addedOrder;
    act(() => {
      addedOrder = result.current.addPendingOrder(testOrder);
    });

    expect(result.current.pendingOrders).toHaveLength(1);

    act(() => {
      result.current.removePendingOrder(addedOrder.id);
    });

    expect(result.current.pendingOrders).toHaveLength(0);
  });

  it('saves pending orders to localStorage', () => {
    const { result } = renderHook(() => useOffline(), { wrapper });
    
    const testOrder = {
      items: [{ id: 'item-1', name: 'Test Item', price: 10.99, quantity: 1 }],
      total: 12.09,
      tableId: 'table-1',
    };

    act(() => {
      result.current.addPendingOrder(testOrder);
    });

    const savedOrders = localStorage.getItem('pos_pending_orders');
    expect(savedOrders).toBeTruthy();
    
    const parsedOrders = JSON.parse(savedOrders);
    expect(parsedOrders).toHaveLength(1);
    expect(parsedOrders[0].total).toBe(12.09);
  });

  it('loads pending orders from localStorage on mount', () => {
    const existingOrders = [
      {
        id: 'offline_123',
        items: [{ id: 'item-1', name: 'Test Item', price: 10.99, quantity: 1 }],
        total: 12.09,
        status: 'pending_sync',
        timestamp: new Date().toISOString(),
      },
    ];

    localStorage.setItem('pos_pending_orders', JSON.stringify(existingOrders));

    const { result } = renderHook(() => useOffline(), { wrapper });
    
    expect(result.current.pendingOrders).toHaveLength(1);
    expect(result.current.pendingOrders[0].id).toBe('offline_123');
  });

  it('handles localStorage errors gracefully', () => {
    // Set invalid JSON in localStorage
    localStorage.setItem('pos_pending_orders', 'invalid json');

    const { result } = renderHook(() => useOffline(), { wrapper });
    
    // Should not crash and should initialize with empty array
    expect(result.current.pendingOrders).toEqual([]);
  });
});
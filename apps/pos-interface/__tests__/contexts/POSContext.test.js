import { renderHook, act } from '@testing-library/react';
import { POSProvider, usePOS } from '../../app/contexts/POSContext';
import { useAuth } from '../../app/contexts/AuthContext';

// Mock AuthContext
jest.mock('../../app/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

// Mock posService
jest.mock('../../app/services/posService', () => ({
  posService: {
    processOrder: jest.fn(),
  },
}));

describe('POSContext', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      outletId: 'outlet-1',
    });
    
    // Clear localStorage
    localStorage.clear();
  });

  const wrapper = ({ children }) => <POSProvider>{children}</POSProvider>;

  it('initializes with empty order', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    expect(result.current.currentOrder.items).toEqual([]);
    expect(result.current.currentOrder.total).toBe(0);
    expect(result.current.selectedTable).toBe(null);
  });

  it('adds items to order', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
    });

    expect(result.current.currentOrder.items).toHaveLength(1);
    expect(result.current.currentOrder.items[0]).toEqual({
      ...testItem,
      quantity: 1,
    });
  });

  it('increases quantity when adding existing item', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
      result.current.addItem(testItem);
    });

    expect(result.current.currentOrder.items).toHaveLength(1);
    expect(result.current.currentOrder.items[0].quantity).toBe(2);
  });

  it('calculates order totals correctly', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.00,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
      result.current.addItem(testItem); // quantity: 2
    });

    const expectedSubtotal = 20.00; // 10.00 * 2
    const expectedTax = 2.00; // 10% of subtotal
    const expectedTotal = 22.00; // subtotal + tax

    expect(result.current.currentOrder.subtotal).toBe(expectedSubtotal);
    expect(result.current.currentOrder.tax).toBe(expectedTax);
    expect(result.current.currentOrder.total).toBe(expectedTotal);
  });

  it('removes items from order', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
    });

    expect(result.current.currentOrder.items).toHaveLength(1);

    act(() => {
      result.current.removeItem('item-1');
    });

    expect(result.current.currentOrder.items).toHaveLength(0);
  });

  it('updates item quantity', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
    });

    act(() => {
      result.current.updateQuantity('item-1', 5);
    });

    expect(result.current.currentOrder.items[0].quantity).toBe(5);
  });

  it('removes item when quantity is set to 0', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
    });

    act(() => {
      result.current.updateQuantity('item-1', 0);
    });

    expect(result.current.currentOrder.items).toHaveLength(0);
  });

  it('sets selected table', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testTable = {
      id: 'table-1',
      number: 5,
      capacity: 4,
    };

    act(() => {
      result.current.setTable(testTable);
    });

    expect(result.current.selectedTable).toEqual(testTable);
    expect(result.current.currentOrder.tableId).toBe('table-1');
  });

  it('clears order', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    const testTable = {
      id: 'table-1',
      number: 5,
      capacity: 4,
    };

    act(() => {
      result.current.addItem(testItem);
      result.current.setTable(testTable);
    });

    expect(result.current.currentOrder.items).toHaveLength(1);
    expect(result.current.selectedTable).toEqual(testTable);

    act(() => {
      result.current.clearOrder();
    });

    expect(result.current.currentOrder.items).toHaveLength(0);
    expect(result.current.selectedTable).toBe(null);
  });

  it('saves order to localStorage', () => {
    const { result } = renderHook(() => usePOS(), { wrapper });
    
    const testItem = {
      id: 'item-1',
      name: 'Test Item',
      price: 10.99,
      category: 'Test Category',
    };

    act(() => {
      result.current.addItem(testItem);
    });

    const savedOrder = localStorage.getItem('pos_current_order');
    expect(savedOrder).toBeTruthy();
    
    const parsedOrder = JSON.parse(savedOrder);
    expect(parsedOrder.items).toHaveLength(1);
    expect(parsedOrder.items[0].name).toBe('Test Item');
  });
});
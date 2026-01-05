import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { AuthProvider, useAuth } from '../../app/contexts/AuthContext';
import { authService } from '../../app/services/authService';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../../app/services/authService', () => ({
  authService: {
    login: jest.fn(),
    validateToken: jest.fn(),
  },
}));

describe('AuthContext', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('initializes with loading state', () => {
    Cookies.get.mockReturnValue(null);
    
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('validates existing token on mount', async () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    Cookies.get.mockReturnValue('valid-token');
    authService.validateToken.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // Wait for useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('handles login successfully', async () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    const mockResponse = { token: 'new-token', user: mockUser };
    
    Cookies.get.mockReturnValue(null);
    authService.login.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'password');
    });

    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password');
    expect(Cookies.set).toHaveBeenCalledWith('auth_token', 'new-token', { expires: 7 });
    expect(result.current.user).toEqual(mockUser);
    expect(loginResult.success).toBe(true);
  });

  it('handles login failure', async () => {
    const mockError = {
      response: { data: { message: 'Invalid credentials' } }
    };
    
    Cookies.get.mockReturnValue(null);
    authService.login.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAuth(), { wrapper });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('test@example.com', 'wrong-password');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials');
    expect(result.current.user).toBe(null);
  });

  it('handles logout', async () => {
    const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };
    Cookies.get.mockReturnValue('valid-token');
    authService.validateToken.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Wait for initial auth check
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Logout
    act(() => {
      result.current.logout();
    });

    expect(Cookies.remove).toHaveBeenCalledWith('auth_token');
    expect(result.current.user).toBe(null);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('checks permissions correctly', async () => {
    const mockUser = { 
      id: 1, 
      name: 'Test User', 
      email: 'test@example.com',
      role: 'manager',
      permissions: ['menu.view', 'staff.view']
    };
    
    Cookies.get.mockReturnValue('valid-token');
    authService.validateToken.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasPermission('menu.view')).toBe(true);
    expect(result.current.hasPermission('admin.access')).toBe(false);
    expect(result.current.hasRole('manager')).toBe(true);
    expect(result.current.hasRole('admin')).toBe(false);
  });

  it('grants all permissions to admin role', async () => {
    const mockUser = { 
      id: 1, 
      name: 'Admin User', 
      email: 'admin@example.com',
      role: 'admin',
      permissions: []
    };
    
    Cookies.get.mockReturnValue('valid-token');
    authService.validateToken.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.hasPermission('any.permission')).toBe(true);
    expect(result.current.hasRole('admin')).toBe(true);
  });
});
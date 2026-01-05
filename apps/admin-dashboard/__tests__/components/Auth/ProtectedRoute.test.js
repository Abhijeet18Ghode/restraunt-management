import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '../../../app/components/Auth/ProtectedRoute';
import { useAuth } from '../../../app/contexts/AuthContext';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock AuthContext
jest.mock('../../../app/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ProtectedRoute Component', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    useRouter.mockReturnValue({
      push: mockPush,
    });
    mockPush.mockClear();
  });

  it('shows loading spinner when auth is loading', () => {
    useAuth.mockReturnValue({
      loading: true,
      isAuthenticated: false,
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    useAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders children when authenticated', () => {
    useAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      hasPermission: jest.fn(() => true),
      hasRole: jest.fn(() => true),
    });

    render(
      <ProtectedRoute>
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to unauthorized when permission is required but not granted', () => {
    const mockHasPermission = jest.fn(() => false);
    
    useAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      hasPermission: mockHasPermission,
      hasRole: jest.fn(() => true),
    });

    render(
      <ProtectedRoute requiredPermission="admin.access">
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(mockHasPermission).toHaveBeenCalledWith('admin.access');
    expect(mockPush).toHaveBeenCalledWith('/unauthorized');
  });

  it('redirects to unauthorized when role is required but not granted', () => {
    const mockHasRole = jest.fn(() => false);
    
    useAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      hasPermission: jest.fn(() => true),
      hasRole: mockHasRole,
    });

    render(
      <ProtectedRoute requiredRole="admin">
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(mockHasRole).toHaveBeenCalledWith('admin');
    expect(mockPush).toHaveBeenCalledWith('/unauthorized');
  });

  it('uses custom fallback path', () => {
    useAuth.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      hasPermission: jest.fn(),
      hasRole: jest.fn(),
    });

    render(
      <ProtectedRoute fallbackPath="/custom-login">
        <div>Protected content</div>
      </ProtectedRoute>
    );

    expect(mockPush).toHaveBeenCalledWith('/custom-login');
  });
});
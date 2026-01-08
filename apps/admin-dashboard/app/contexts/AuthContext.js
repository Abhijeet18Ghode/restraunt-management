'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authService } from '../services/authService';
import { ROLE_PERMISSIONS, ROLES } from '../components/Auth/RoleManager';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await authService.validateToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, tenantId = null) => {
    try {
      const response = await authService.login(email, password, tenantId);
      const { token, user: userData } = response;
      
      Cookies.set('auth_token', token, { expires: 7 });
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || error.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    Cookies.remove('auth_token');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Map TENANT_ADMIN to ADMIN role for permissions
    let userRole = user.role;
    if (userRole === 'TENANT_ADMIN') {
      userRole = ROLES.ADMIN;
    }
    
    // Get permissions for the user's role
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    
    // Check if user has the permission through their role
    return rolePermissions.includes(permission);
  };

  const hasRole = (role) => {
    if (!user) return false;
    
    // Map TENANT_ADMIN to admin for role checks
    if (user.role === 'TENANT_ADMIN' && role === 'admin') {
      return true;
    }
    
    return user.role === role;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    hasRole,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
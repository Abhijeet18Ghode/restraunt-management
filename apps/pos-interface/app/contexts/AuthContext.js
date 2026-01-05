'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authService } from '../services/authService';

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
      const token = Cookies.get('pos_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await authService.validateToken(token);
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('pos_auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, outletId) => {
    try {
      const response = await authService.login(email, password, outletId);
      const { token, user: userData } = response;
      
      Cookies.set('pos_auth_token', token, { expires: 1 }); // 1 day for POS
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    Cookies.remove('pos_auth_token');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission) || 
           user.role === 'admin' || 
           user.role === 'manager';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasPermission,
    isAuthenticated: !!user,
    outletId: user?.outletId,
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
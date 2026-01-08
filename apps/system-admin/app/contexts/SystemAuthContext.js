'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

const SystemAuthContext = createContext({});

// System admin credentials (in production, this would be in a secure database)
const SYSTEM_ADMINS = [
  {
    id: 'sys-admin-1',
    username: 'sysadmin',
    password: 'admin123', // In production, this would be hashed
    name: 'System Administrator',
    email: 'sysadmin@platform.com',
    role: 'SYSTEM_ADMIN'
  }
];

export function SystemAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = Cookies.get('system_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      // In a real app, you'd validate the token with the server
      // For now, we'll decode the simple token
      try {
        const userData = JSON.parse(atob(token));
        const admin = SYSTEM_ADMINS.find(a => a.id === userData.id);
        if (admin) {
          setUser(admin);
        } else {
          Cookies.remove('system_auth_token');
        }
      } catch (error) {
        Cookies.remove('system_auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      Cookies.remove('system_auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const admin = SYSTEM_ADMINS.find(
        a => a.username === username && a.password === password
      );
      
      if (!admin) {
        return { 
          success: false, 
          error: 'Invalid username or password' 
        };
      }

      // Create a simple token (in production, use proper JWT)
      const token = btoa(JSON.stringify({ id: admin.id, timestamp: Date.now() }));
      
      Cookies.set('system_auth_token', token, { expires: 1 }); // 1 day
      setUser(admin);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: 'Login failed' 
      };
    }
  };

  const logout = () => {
    Cookies.remove('system_auth_token');
    setUser(null);
    router.push('/login');
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <SystemAuthContext.Provider value={value}>
      {children}
    </SystemAuthContext.Provider>
  );
}

export const useSystemAuth = () => {
  const context = useContext(SystemAuthContext);
  if (!context) {
    throw new Error('useSystemAuth must be used within a SystemAuthProvider');
  }
  return context;
};
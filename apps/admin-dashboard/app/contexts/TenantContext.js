'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { tenantService } from '../services/tenantService';

const TenantContext = createContext({});

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      loadTenantData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Load tenant information
      const tenantData = await tenantService.getTenant(user.tenantId);
      setTenant(tenantData);

      // Load outlets for this tenant
      const outletsData = await tenantService.getOutlets(user.tenantId);
      setOutlets(outletsData);

      // Set default outlet if none selected
      if (outletsData.length > 0 && !selectedOutlet) {
        setSelectedOutlet(outletsData[0]);
      }
    } catch (error) {
      console.error('Failed to load tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchOutlet = (outlet) => {
    setSelectedOutlet(outlet);
  };

  const refreshTenantData = () => {
    if (isAuthenticated && user?.tenantId) {
      loadTenantData();
    }
  };

  const value = {
    tenant,
    outlets,
    selectedOutlet,
    loading,
    switchOutlet,
    refreshTenantData,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
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
    console.log('🔄 TenantContext useEffect triggered:', { isAuthenticated, user: user?.id, tenantId: user?.tenantId });
    if (isAuthenticated && user?.tenantId) {
      loadTenantData();
    } else {
      console.log('🏁 TenantContext: Not authenticated or no tenantId, setting loading to false');
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      console.log('🔄 TenantContext: Starting to load tenant data for user:', user);
      
      // Load tenant information
      console.log('📋 TenantContext: Loading tenant data...');
      const tenantData = await tenantService.getTenant(user.tenantId);
      console.log('✅ TenantContext: Tenant data loaded:', tenantData);
      
      // Ensure the tenant object uses tenantId as the id for API calls
      const normalizedTenant = {
        ...tenantData,
        id: user.tenantId // Use the tenantId from user for API calls, not the database primary key
      };
      console.log('📋 TenantContext: Normalized tenant data:', normalizedTenant);
      setTenant(normalizedTenant);

      // Load outlets for this tenant
      console.log('📋 TenantContext: Loading outlets data...');
      const outletsData = await tenantService.getOutlets(user.tenantId);
      console.log('✅ TenantContext: Outlets data loaded:', outletsData);
      setOutlets(outletsData);

      // Set default outlet if none selected
      if (outletsData.length > 0 && !selectedOutlet) {
        console.log('📋 TenantContext: Setting default outlet:', outletsData[0]);
        setSelectedOutlet(outletsData[0]);
      } else if (outletsData.length === 0) {
        console.log('📋 TenantContext: No outlets found, creating fallback outlet');
        const fallbackOutlet = { 
          id: 'default', 
          name: 'Main Outlet', 
          address: 'Default Location' 
        };
        setOutlets([fallbackOutlet]);
        setSelectedOutlet(fallbackOutlet);
      }
      
      console.log('✅ TenantContext: All data loaded successfully');
    } catch (error) {
      console.error('❌ TenantContext: Failed to load tenant data:', error);
      // Set fallback data to allow the app to continue working
      console.log('📋 TenantContext: Setting fallback data');
      setTenant({ id: user.tenantId, name: 'Default Tenant' });
      const fallbackOutlet = { 
        id: 'default', 
        name: 'Main Outlet', 
        address: 'Default Location' 
      };
      setOutlets([fallbackOutlet]);
      setSelectedOutlet(fallbackOutlet);
    } finally {
      console.log('🏁 TenantContext: Setting loading to false');
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
    currentTenant: tenant, // Add alias for compatibility
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
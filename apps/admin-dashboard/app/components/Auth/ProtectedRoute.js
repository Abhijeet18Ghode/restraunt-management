'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../UI/LoadingSpinner';

export default function ProtectedRoute({ 
  children, 
  requiredPermission = null,
  requiredRole = null,
  fallbackPath = '/login',
  resource = null
}) {
  const { user, loading, isAuthenticated, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push(fallbackPath);
        return;
      }

      if (requiredPermission && !hasPermission(requiredPermission)) {
        const params = new URLSearchParams();
        params.set('permission', requiredPermission);
        if (resource) params.set('resource', resource);
        router.push(`/unauthorized?${params.toString()}`);
        return;
      }

      if (requiredRole && !hasRole(requiredRole)) {
        const params = new URLSearchParams();
        params.set('role', requiredRole);
        if (resource) params.set('resource', resource);
        router.push(`/unauthorized?${params.toString()}`);
        return;
      }
    }
  }, [
    loading, 
    isAuthenticated, 
    user, 
    requiredPermission, 
    requiredRole, 
    hasPermission, 
    hasRole, 
    router, 
    fallbackPath,
    resource
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return null;
  }

  return children;
}
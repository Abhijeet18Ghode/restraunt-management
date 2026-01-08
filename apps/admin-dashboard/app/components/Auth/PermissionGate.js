'use client';

import { useAuth } from '../../contexts/AuthContext';

/**
 * PermissionGate component for conditional rendering based on permissions
 * @param {Object} props
 * @param {string|string[]} props.permission - Required permission(s)
 * @param {string|string[]} props.role - Required role(s)
 * @param {boolean} props.requireAll - If true, user must have ALL permissions/roles (default: false)
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {React.ReactNode} props.fallback - Content to render if user lacks permission
 */
export default function PermissionGate({ 
  permission = null,
  role = null,
  requireAll = false,
  children,
  fallback = null 
}) {
  const { hasPermission, hasRole, user } = useAuth();

  // If no user is authenticated, don't render anything
  if (!user) {
    return fallback;
  }

  // Check permissions
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    const hasRequiredPermissions = requireAll 
      ? permissions.every(p => hasPermission(p))
      : permissions.some(p => hasPermission(p));
    
    if (!hasRequiredPermissions) {
      return fallback;
    }
  }

  // Check roles
  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    const hasRequiredRoles = requireAll
      ? roles.every(r => hasRole(r))
      : roles.some(r => hasRole(r));
    
    if (!hasRequiredRoles) {
      return fallback;
    }
  }

  return children;
}

/**
 * Hook for checking permissions in components
 */
export function usePermissions() {
  const { hasPermission, hasRole, user } = useAuth();

  const checkPermission = (permission) => {
    if (!user) return false;
    return hasPermission(permission);
  };

  const checkRole = (role) => {
    if (!user) return false;
    return hasRole(role);
  };

  const checkMultiplePermissions = (permissions, requireAll = false) => {
    if (!user) return false;
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    return requireAll 
      ? perms.every(p => hasPermission(p))
      : perms.some(p => hasPermission(p));
  };

  const checkMultipleRoles = (roles, requireAll = false) => {
    if (!user) return false;
    const roleList = Array.isArray(roles) ? roles : [roles];
    return requireAll
      ? roleList.every(r => hasRole(r))
      : roleList.some(r => hasRole(r));
  };

  return {
    checkPermission,
    checkRole,
    checkMultiplePermissions,
    checkMultipleRoles,
    user
  };
}
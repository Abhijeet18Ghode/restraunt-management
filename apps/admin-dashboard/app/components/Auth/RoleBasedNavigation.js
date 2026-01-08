'use client';

import { useAuth } from '../../contexts/AuthContext';

/**
 * Filter navigation items based on user permissions and roles
 * @param {Array} navigationItems - Array of navigation items
 * @param {Object} user - Current user object
 * @param {Function} hasPermission - Permission check function
 * @param {Function} hasRole - Role check function
 * @returns {Array} Filtered navigation items
 */
export function filterNavigationByPermissions(navigationItems, user, hasPermission, hasRole) {
  if (!user) return [];

  return navigationItems.filter(item => {
    // Check if item has permission requirement
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }

    // Check if item has role requirement
    if (item.role && !hasRole(item.role)) {
      return false;
    }

    // Check if item has multiple permission requirements
    if (item.permissions) {
      const permissions = Array.isArray(item.permissions) ? item.permissions : [item.permissions];
      const requireAll = item.requireAllPermissions || false;
      
      const hasRequiredPermissions = requireAll
        ? permissions.every(p => hasPermission(p))
        : permissions.some(p => hasPermission(p));
      
      if (!hasRequiredPermissions) {
        return false;
      }
    }

    // Check if item has multiple role requirements
    if (item.roles) {
      const roles = Array.isArray(item.roles) ? item.roles : [item.roles];
      const requireAll = item.requireAllRoles || false;
      
      const hasRequiredRoles = requireAll
        ? roles.every(r => hasRole(r))
        : roles.some(r => hasRole(r));
      
      if (!hasRequiredRoles) {
        return false;
      }
    }

    // Filter children if they exist
    if (item.children && item.children.length > 0) {
      const filteredChildren = filterNavigationByPermissions(item.children, user, hasPermission, hasRole);
      
      // If item has children but none are accessible, hide the parent
      if (item.hideIfNoChildren && filteredChildren.length === 0) {
        return false;
      }
      
      // Update item with filtered children
      item.children = filteredChildren;
    }

    return true;
  });
}

/**
 * Hook for getting filtered navigation items
 * @param {Array} navigationItems - Original navigation items
 * @returns {Array} Filtered navigation items based on user permissions
 */
export function useFilteredNavigation(navigationItems) {
  const { user, hasPermission, hasRole } = useAuth();
  
  if (!user || !navigationItems) {
    return [];
  }

  return filterNavigationByPermissions(navigationItems, user, hasPermission, hasRole);
}

/**
 * Component for rendering role-based navigation
 */
export default function RoleBasedNavigation({ 
  navigationItems, 
  renderItem, 
  className = '' 
}) {
  const filteredItems = useFilteredNavigation(navigationItems);

  return (
    <nav className={className}>
      {filteredItems.map((item, index) => 
        renderItem ? renderItem(item, index) : (
          <div key={item.name || index}>
            {item.name}
          </div>
        )
      )}
    </nav>
  );
}
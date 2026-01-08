'use client';

import { useAuth } from '../../contexts/AuthContext';

// Define all available permissions in the system
export const PERMISSIONS = {
  // Dashboard permissions
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Outlet permissions
  OUTLETS_VIEW: 'outlets.view',
  OUTLETS_CREATE: 'outlets.create',
  OUTLETS_UPDATE: 'outlets.update',
  OUTLETS_DELETE: 'outlets.delete',
  
  // Menu permissions
  MENU_VIEW: 'menu.view',
  MENU_CATEGORIES_VIEW: 'menu.categories.view',
  MENU_CATEGORIES_MANAGE: 'menu.categories.manage',
  MENU_ITEMS_VIEW: 'menu.items.view',
  MENU_ITEMS_MANAGE: 'menu.items.manage',
  MENU_PRICING_VIEW: 'menu.pricing.view',
  MENU_PRICING_MANAGE: 'menu.pricing.manage',
  MENU_BULK_MANAGE: 'menu.bulk.manage',
  
  // Inventory permissions
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_SUPPLIERS_VIEW: 'inventory.suppliers.view',
  INVENTORY_SUPPLIERS_MANAGE: 'inventory.suppliers.manage',
  INVENTORY_PURCHASE_ORDERS_VIEW: 'inventory.purchase_orders.view',
  INVENTORY_PURCHASE_ORDERS_MANAGE: 'inventory.purchase_orders.manage',
  INVENTORY_TRANSFERS_VIEW: 'inventory.transfers.view',
  INVENTORY_TRANSFERS_MANAGE: 'inventory.transfers.manage',
  
  // Staff permissions
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DELETE: 'staff.delete',
  STAFF_ATTENDANCE_VIEW: 'staff.attendance.view',
  STAFF_ATTENDANCE_MANAGE: 'staff.attendance.manage',
  STAFF_PERFORMANCE_VIEW: 'staff.performance.view',
  STAFF_SCHEDULES_MANAGE: 'staff.schedules.manage',
  STAFF_PAYROLL_VIEW: 'staff.payroll.view',
  STAFF_PAYROLL_MANAGE: 'staff.payroll.manage',
  
  // Customer permissions
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_DELETE: 'customers.delete',
  CUSTOMERS_LOYALTY_MANAGE: 'customers.loyalty.manage',
  CUSTOMERS_FEEDBACK_VIEW: 'customers.feedback.view',
  CUSTOMERS_MARKETING_MANAGE: 'customers.marketing.manage',
  
  // Analytics permissions
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_SALES_VIEW: 'analytics.sales.view',
  ANALYTICS_PERFORMANCE_VIEW: 'analytics.performance.view',
  ANALYTICS_TRENDS_VIEW: 'analytics.trends.view',
  ANALYTICS_FINANCIAL_VIEW: 'analytics.financial.view',
  ANALYTICS_EXPORT: 'analytics.export',
  
  // Payment permissions
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_PROCESS: 'payments.process',
  PAYMENTS_REFUNDS_MANAGE: 'payments.refunds.manage',
  PAYMENTS_SETTLEMENT_VIEW: 'payments.settlement.view',
  
  // Notification permissions
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_SEND: 'notifications.send',
  
  // Report permissions
  REPORTS_VIEW: 'reports.view',
  REPORTS_GENERATE: 'reports.generate',
  REPORTS_EXPORT: 'reports.export',
  
  // Settings permissions
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_GENERAL_VIEW: 'settings.general.view',
  SETTINGS_GENERAL_MANAGE: 'settings.general.manage',
  SETTINGS_SECURITY_MANAGE: 'settings.security.manage',
  SETTINGS_INTEGRATIONS_MANAGE: 'settings.integrations.manage',
  SETTINGS_BACKUP_MANAGE: 'settings.backup.manage',
};

// Define all available roles in the system
export const ROLES = {
  SYSTEM_ADMIN: 'system_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
  KITCHEN_STAFF: 'kitchen_staff',
  INVENTORY_MANAGER: 'inventory_manager',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  HOST: 'host',
};

// Define role hierarchies and permissions
export const ROLE_PERMISSIONS = {
  [ROLES.SYSTEM_ADMIN]: [
    // System admins have all permissions
    ...Object.values(PERMISSIONS)
  ],
  
  [ROLES.ADMIN]: [
    // Restaurant admins have most permissions except system-level ones
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OUTLETS_VIEW,
    PERMISSIONS.OUTLETS_CREATE,
    PERMISSIONS.OUTLETS_UPDATE,
    PERMISSIONS.OUTLETS_DELETE,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_CATEGORIES_MANAGE,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.MENU_ITEMS_MANAGE,
    PERMISSIONS.MENU_PRICING_VIEW,
    PERMISSIONS.MENU_PRICING_MANAGE,
    PERMISSIONS.MENU_BULK_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_SUPPLIERS_VIEW,
    PERMISSIONS.INVENTORY_SUPPLIERS_MANAGE,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_VIEW,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_MANAGE,
    PERMISSIONS.INVENTORY_TRANSFERS_VIEW,
    PERMISSIONS.INVENTORY_TRANSFERS_MANAGE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,
    PERMISSIONS.STAFF_ATTENDANCE_VIEW,
    PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
    PERMISSIONS.STAFF_PERFORMANCE_VIEW,
    PERMISSIONS.STAFF_SCHEDULES_MANAGE,
    PERMISSIONS.STAFF_PAYROLL_VIEW,
    PERMISSIONS.STAFF_PAYROLL_MANAGE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_DELETE,
    PERMISSIONS.CUSTOMERS_LOYALTY_MANAGE,
    PERMISSIONS.CUSTOMERS_FEEDBACK_VIEW,
    PERMISSIONS.CUSTOMERS_MARKETING_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_SALES_VIEW,
    PERMISSIONS.ANALYTICS_PERFORMANCE_VIEW,
    PERMISSIONS.ANALYTICS_TRENDS_VIEW,
    PERMISSIONS.ANALYTICS_FINANCIAL_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.PAYMENTS_REFUNDS_MANAGE,
    PERMISSIONS.PAYMENTS_SETTLEMENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_GENERAL_VIEW,
    PERMISSIONS.SETTINGS_GENERAL_MANAGE,
    PERMISSIONS.SETTINGS_SECURITY_MANAGE,
    PERMISSIONS.SETTINGS_INTEGRATIONS_MANAGE,
    PERMISSIONS.SETTINGS_BACKUP_MANAGE,
  ],
  
  [ROLES.MANAGER]: [
    // Managers have operational permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.OUTLETS_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_CATEGORIES_MANAGE,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.MENU_ITEMS_MANAGE,
    PERMISSIONS.MENU_PRICING_VIEW,
    PERMISSIONS.MENU_PRICING_MANAGE,
    PERMISSIONS.MENU_BULK_MANAGE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_SUPPLIERS_VIEW,
    PERMISSIONS.INVENTORY_SUPPLIERS_MANAGE,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_VIEW,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_MANAGE,
    PERMISSIONS.INVENTORY_TRANSFERS_VIEW,
    PERMISSIONS.INVENTORY_TRANSFERS_MANAGE,
    PERMISSIONS.STAFF_VIEW,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_ATTENDANCE_VIEW,
    PERMISSIONS.STAFF_ATTENDANCE_MANAGE,
    PERMISSIONS.STAFF_PERFORMANCE_VIEW,
    PERMISSIONS.STAFF_SCHEDULES_MANAGE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.CUSTOMERS_LOYALTY_MANAGE,
    PERMISSIONS.CUSTOMERS_FEEDBACK_VIEW,
    PERMISSIONS.CUSTOMERS_MARKETING_MANAGE,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_SALES_VIEW,
    PERMISSIONS.ANALYTICS_PERFORMANCE_VIEW,
    PERMISSIONS.ANALYTICS_TRENDS_VIEW,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.PAYMENTS_REFUNDS_MANAGE,
    PERMISSIONS.PAYMENTS_SETTLEMENT_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_GENERATE,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_GENERAL_VIEW,
    PERMISSIONS.SETTINGS_INTEGRATIONS_MANAGE,
  ],
  
  [ROLES.INVENTORY_MANAGER]: [
    // Inventory managers focus on stock management
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_UPDATE,
    PERMISSIONS.INVENTORY_SUPPLIERS_VIEW,
    PERMISSIONS.INVENTORY_SUPPLIERS_MANAGE,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_VIEW,
    PERMISSIONS.INVENTORY_PURCHASE_ORDERS_MANAGE,
    PERMISSIONS.INVENTORY_TRANSFERS_VIEW,
    PERMISSIONS.INVENTORY_TRANSFERS_MANAGE,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.ANALYTICS_SALES_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  
  [ROLES.STAFF]: [
    // General staff have basic operational permissions
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_FEEDBACK_VIEW,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  [ROLES.KITCHEN_STAFF]: [
    // Kitchen staff focus on order management
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  [ROLES.CASHIER]: [
    // Cashiers handle payments and basic customer service
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_PROCESS,
    PERMISSIONS.PAYMENTS_REFUNDS_MANAGE,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  [ROLES.WAITER]: [
    // Waiters handle orders and customer service
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.MENU_VIEW,
    PERMISSIONS.MENU_CATEGORIES_VIEW,
    PERMISSIONS.MENU_ITEMS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_FEEDBACK_VIEW,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
  
  [ROLES.HOST]: [
    // Hosts handle reservations and customer management
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.NOTIFICATIONS_VIEW,
  ],
};

/**
 * Hook for advanced role and permission management
 */
export function useRoleManager() {
  const { user, hasPermission, hasRole } = useAuth();

  const getUserPermissions = () => {
    if (!user || !user.role) return [];
    return ROLE_PERMISSIONS[user.role] || [];
  };

  const canAccessFeature = (requiredPermissions, requiredRoles = null) => {
    if (!user) return false;

    // Check permissions
    if (requiredPermissions) {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const hasRequiredPermissions = permissions.some(permission => hasPermission(permission));
      if (!hasRequiredPermissions) return false;
    }

    // Check roles
    if (requiredRoles) {
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      const hasRequiredRoles = roles.some(role => hasRole(role));
      if (!hasRequiredRoles) return false;
    }

    return true;
  };

  const isHigherRole = (roleToCheck) => {
    if (!user || !user.role) return false;
    
    const roleHierarchy = [
      ROLES.HOST,
      ROLES.WAITER,
      ROLES.CASHIER,
      ROLES.KITCHEN_STAFF,
      ROLES.STAFF,
      ROLES.INVENTORY_MANAGER,
      ROLES.MANAGER,
      ROLES.ADMIN,
      ROLES.SYSTEM_ADMIN,
    ];

    const currentRoleIndex = roleHierarchy.indexOf(user.role);
    const checkRoleIndex = roleHierarchy.indexOf(roleToCheck);

    return currentRoleIndex >= checkRoleIndex;
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      [ROLES.SYSTEM_ADMIN]: 'System Administrator',
      [ROLES.ADMIN]: 'Administrator',
      [ROLES.MANAGER]: 'Manager',
      [ROLES.INVENTORY_MANAGER]: 'Inventory Manager',
      [ROLES.STAFF]: 'Staff',
      [ROLES.KITCHEN_STAFF]: 'Kitchen Staff',
      [ROLES.CASHIER]: 'Cashier',
      [ROLES.WAITER]: 'Waiter',
      [ROLES.HOST]: 'Host',
    };
    return roleNames[role] || role;
  };

  const getPermissionDisplayName = (permission) => {
    return permission.split('.').map(part => 
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  };

  return {
    user,
    getUserPermissions,
    canAccessFeature,
    isHigherRole,
    getRoleDisplayName,
    getPermissionDisplayName,
    PERMISSIONS,
    ROLES,
    ROLE_PERMISSIONS,
  };
}
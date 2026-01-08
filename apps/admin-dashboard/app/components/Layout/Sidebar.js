'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '../../contexts/TenantContext';
import { useFilteredNavigation } from '../Auth/RoleBasedNavigation';
import {
  LayoutDashboard,
  Store,
  Menu,
  Users,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Building2,
  Package,
  CreditCard,
  UserCheck,
  Bell,
  FileText,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    name: 'Outlets',
    href: '/outlets',
    icon: Building2,
    permission: 'outlets.view',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Menu Management',
    icon: Menu,
    permission: 'menu.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Menu Management', 
        href: '/menu/management',
        permission: 'menu.categories.manage'
      },
      { 
        name: 'Categories', 
        href: '/menu/categories',
        permission: 'menu.categories.view'
      },
      { 
        name: 'Items', 
        href: '/menu/items',
        permission: 'menu.items.view'
      },
      { 
        name: 'Pricing', 
        href: '/menu/pricing',
        permission: 'menu.pricing.view',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Bulk Operations', 
        href: '/menu/bulk',
        permission: 'menu.bulk.manage',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Analytics', 
        href: '/menu/analytics',
        permission: 'analytics.view',
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Inventory',
    icon: Package,
    permission: 'inventory.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Stock Levels', 
        href: '/inventory',
        permission: 'inventory.view'
      },
      { 
        name: 'Suppliers', 
        href: '/inventory/suppliers',
        permission: 'inventory.suppliers.view',
        roles: ['admin', 'manager', 'inventory_manager']
      },
      { 
        name: 'Purchase Orders', 
        href: '/inventory/purchase-orders',
        permission: 'inventory.purchase_orders.view',
        roles: ['admin', 'manager', 'inventory_manager']
      },
      { 
        name: 'Stock Transfers', 
        href: '/inventory/transfers',
        permission: 'inventory.transfers.view',
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Staff Management',
    icon: Users,
    permission: 'staff.view',
    roles: ['admin', 'manager'],
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Staff List', 
        href: '/staff',
        permission: 'staff.view'
      },
      { 
        name: 'Attendance', 
        href: '/staff/attendance',
        permission: 'staff.attendance.view'
      },
      { 
        name: 'Performance', 
        href: '/staff/performance',
        permission: 'staff.performance.view',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Schedules', 
        href: '/staff/schedules',
        permission: 'staff.schedules.manage',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Payroll', 
        href: '/staff/payroll',
        permission: 'staff.payroll.view',
        roles: ['admin']
      },
    ],
  },
  {
    name: 'Customers',
    icon: UserCheck,
    permission: 'customers.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Customer List', 
        href: '/customers',
        permission: 'customers.view'
      },
      { 
        name: 'Loyalty Program', 
        href: '/customers/loyalty',
        permission: 'customers.loyalty.manage',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Feedback', 
        href: '/customers/feedback',
        permission: 'customers.feedback.view'
      },
      { 
        name: 'Marketing', 
        href: '/customers/marketing',
        permission: 'customers.marketing.manage',
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    permission: 'analytics.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Sales Reports', 
        href: '/analytics/sales',
        permission: 'analytics.sales.view'
      },
      { 
        name: 'Performance', 
        href: '/analytics/performance',
        permission: 'analytics.performance.view',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Trends', 
        href: '/analytics/trends',
        permission: 'analytics.trends.view',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Financial Reports', 
        href: '/analytics/financial',
        permission: 'analytics.financial.view',
        roles: ['admin']
      },
      { 
        name: 'Export Data', 
        href: '/analytics/export',
        permission: 'analytics.export',
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Payments',
    icon: CreditCard,
    permission: 'payments.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'Transactions', 
        href: '/payments',
        permission: 'payments.view'
      },
      { 
        name: 'Refunds', 
        href: '/payments/refunds',
        permission: 'payments.refunds.manage',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Settlement', 
        href: '/payments/settlement',
        permission: 'payments.settlement.view',
        roles: ['admin', 'manager']
      },
    ],
  },
  {
    name: 'Notifications',
    href: '/notifications',
    icon: Bell,
    permission: 'notifications.view',
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    permission: 'reports.view',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Settings',
    icon: Settings,
    permission: 'settings.view',
    hideIfNoChildren: true,
    children: [
      { 
        name: 'General', 
        href: '/settings',
        permission: 'settings.general.view'
      },
      { 
        name: 'Security', 
        href: '/settings/security',
        permission: 'settings.security.manage',
        roles: ['admin']
      },
      { 
        name: 'Integrations', 
        href: '/settings/integrations',
        permission: 'settings.integrations.manage',
        roles: ['admin', 'manager']
      },
      { 
        name: 'Backup', 
        href: '/settings/backup',
        permission: 'settings.backup.manage',
        roles: ['admin']
      },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const [expandedItems, setExpandedItems] = useState({});
  const pathname = usePathname();
  const { selectedOutlet } = useTenant();

  // Use the filtered navigation based on user permissions
  const filteredNavigation = useFilteredNavigation(navigation);

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName],
    }));
  };

  const isActive = (href) => {
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isParentActive = (children) => {
    return children?.some(child => isActive(child.href));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <Store className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Restaurant Admin
              </span>
            </div>
          </div>

          {/* Outlet Selector */}
          {selectedOutlet && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Current Outlet
              </div>
              <div className="mt-1 text-sm font-medium text-gray-900">
                {selectedOutlet.name}
              </div>
              <div className="text-xs text-gray-500">
                {selectedOutlet.address}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems[item.name];
              const itemIsActive = item.href ? isActive(item.href) : isParentActive(item.children);

              return (
                <div key={item.name}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`
                        sidebar-link w-full text-left
                        ${itemIsActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}
                      `}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={`
                        sidebar-link
                        ${itemIsActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}
                      `}
                      onClick={onClose}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  )}

                  {/* Submenu */}
                  {hasChildren && isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`
                            block px-3 py-2 text-sm rounded-md transition-colors duration-200
                            ${isActive(child.href) 
                              ? 'bg-primary-50 text-primary-700 font-medium' 
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                          onClick={onClose}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
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
  MessageSquare,
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
  },
  {
    name: 'Menu Management',
    icon: Menu,
    permission: 'menu.view',
    children: [
      { name: 'Categories', href: '/menu/categories' },
      { name: 'Items', href: '/menu/items' },
      { name: 'Pricing', href: '/menu/pricing' },
    ],
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: Package,
    permission: 'inventory.view',
  },
  {
    name: 'Staff Management',
    icon: Users,
    permission: 'staff.view',
    children: [
      { name: 'Staff List', href: '/staff' },
      { name: 'Attendance', href: '/staff/attendance' },
      { name: 'Performance', href: '/staff/performance' },
    ],
  },
  {
    name: 'Customers',
    icon: UserCheck,
    permission: 'customers.view',
    children: [
      { name: 'Customer List', href: '/customers' },
      { name: 'Loyalty Program', href: '/customers/loyalty' },
      { name: 'Feedback', href: '/customers/feedback' },
    ],
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    permission: 'analytics.view',
    children: [
      { name: 'Sales Reports', href: '/analytics/sales' },
      { name: 'Performance', href: '/analytics/performance' },
      { name: 'Trends', href: '/analytics/trends' },
    ],
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCard,
    permission: 'payments.view',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings.view',
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const [expandedItems, setExpandedItems] = useState({});
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const { selectedOutlet } = useTenant();

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

  const filteredNavigation = navigation.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

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
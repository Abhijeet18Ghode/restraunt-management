'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import {
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Building2,
} from 'lucide-react';

export default function Header({ onMenuClick }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOutletMenu, setShowOutletMenu] = useState(false);
  const { user, logout } = useAuth();
  const { outlets, selectedOutlet, switchOutlet } = useTenant();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-4 lg:ml-0">
            <h1 className="text-xl font-semibold text-gray-900">
              Restaurant Management
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Outlet Selector */}
          {outlets.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowOutletMenu(!showOutletMenu)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <Building2 className="h-4 w-4 mr-2" />
                {selectedOutlet?.name || 'Select Outlet'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>

              {showOutletMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {outlets.map((outlet) => (
                      <button
                        key={outlet.id}
                        onClick={() => {
                          switchOutlet(outlet);
                          setShowOutletMenu(false);
                        }}
                        className={`
                          block w-full text-left px-4 py-2 text-sm hover:bg-gray-100
                          ${selectedOutlet?.id === outlet.id 
                            ? 'bg-primary-50 text-primary-700 font-medium' 
                            : 'text-gray-700'
                          }
                        `}
                      >
                        <div className="font-medium">{outlet.name}</div>
                        <div className="text-xs text-gray-500">{outlet.address}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md">
            <Bell className="h-6 w-6" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <div className="flex items-center">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <div className="ml-3 text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name || 'User'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.role || 'Staff'}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 ml-2" />
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                    {user?.email}
                  </div>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
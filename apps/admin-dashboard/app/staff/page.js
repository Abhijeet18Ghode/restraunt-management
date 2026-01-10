'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import StaffProfileManager from '../components/Staff/StaffProfileManager';
import RoleManager from '../components/Staff/RoleManager';
import AttendanceTracker from '../components/Staff/AttendanceTracker';
import PerformanceTracker from '../components/Staff/PerformanceTracker';
import ScheduleManager from '../components/Staff/ScheduleManager';
import PayrollCalculator from '../components/Staff/PayrollCalculator';

const StaffPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profiles');

  const tabs = [
    { id: 'profiles', label: 'Staff Profiles', icon: '👥' },
    { id: 'roles', label: 'Role Management', icon: '🛡️' },
    { id: 'attendance', label: 'Attendance', icon: '⏰' },
    { id: 'performance', label: 'Performance', icon: '📊' },
    { id: 'schedules', label: 'Schedules', icon: '📅' },
    { id: 'payroll', label: 'Payroll', icon: '💰' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profiles':
        return <StaffProfileManager outletId={user?.tenantId} />;
      case 'roles':
        return <RoleManager />;
      case 'attendance':
        return <AttendanceTracker outletId={user?.tenantId} />;
      case 'performance':
        return <PerformanceTracker outletId={user?.tenantId} />;
      case 'schedules':
        return <ScheduleManager outletId={user?.tenantId} />;
      case 'payroll':
        return <PayrollCalculator outletId={user?.tenantId} />;
      default:
        return <StaffProfileManager outletId={user?.tenantId} />;
    }
  };

  return (
    <ProtectedRoute requiredPermission="staff.view">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="mt-2 text-gray-600">
              Manage staff profiles, roles, permissions, and attendance tracking
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default StaffPage;
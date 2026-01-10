'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import CustomerProfileManager from '../components/Customer/CustomerProfileManager';
import CustomerOrderHistory from '../components/Customer/CustomerOrderHistory';
import LoyaltyProgramManager from '../components/Customer/LoyaltyProgramManager';
import CustomerLoyaltyTracker from '../components/Customer/CustomerLoyaltyTracker';

const CustomersPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profiles');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const tabs = [
    { id: 'profiles', label: 'Customer Profiles', icon: '👥' },
    { id: 'orders', label: 'Order History', icon: '📦' },
    { id: 'loyalty-programs', label: 'Loyalty Programs', icon: '🎁' },
    { id: 'loyalty-tracker', label: 'Loyalty Tracker', icon: '⭐' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profiles':
        return <CustomerProfileManager outletId={user?.tenantId} />;
      case 'orders':
        return selectedCustomer ? (
          <CustomerOrderHistory 
            customerId={selectedCustomer.id} 
            customerName={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">Select a customer to view order history</div>
            <button
              onClick={() => setActiveTab('profiles')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Customers
            </button>
          </div>
        );
      case 'loyalty-programs':
        return <LoyaltyProgramManager outletId={user?.tenantId} />;
      case 'loyalty-tracker':
        return <CustomerLoyaltyTracker outletId={user?.tenantId} />;
      default:
        return <CustomerProfileManager outletId={user?.tenantId} />;
    }
  };

  return (
    <ProtectedRoute requiredPermission="customers.view">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="mt-2 text-gray-600">
              Manage customer profiles, loyalty programs, and track customer relationships
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

export default CustomersPage;
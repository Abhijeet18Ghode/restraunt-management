'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import InventoryTracker from '../components/Inventory/InventoryTracker';
import SupplierManager from '../components/Inventory/SupplierManager';
import PurchaseOrderManager from '../components/Inventory/PurchaseOrderManager';
import ConsumptionTrends from '../components/Inventory/ConsumptionTrends';
import WasteAnalysis from '../components/Inventory/WasteAnalysis';
import CostBreakdown from '../components/Inventory/CostBreakdown';
import StockTransferManager from '../components/Inventory/StockTransferManager';

const InventoryPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tracking');
  const [reportsSubTab, setReportsSubTab] = useState('consumption');

  const tabs = [
    { id: 'tracking', label: 'Inventory Tracking', icon: '📦' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏢' },
    { id: 'orders', label: 'Purchase Orders', icon: '📋' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📊' }
  ];

  const reportTabs = [
    { id: 'consumption', label: 'Consumption Trends', icon: '📈' },
    { id: 'waste', label: 'Waste Analysis', icon: '🗑️' },
    { id: 'costs', label: 'Cost Breakdown', icon: '💰' },
    { id: 'transfers', label: 'Stock Transfers', icon: '🔄' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracking':
        return <InventoryTracker outletId={user?.tenantId} />;
      case 'suppliers':
        return <SupplierManager />;
      case 'orders':
        return <PurchaseOrderManager outletId={user?.tenantId} />;
      case 'reports':
        return renderReportsContent();
      default:
        return <InventoryTracker outletId={user?.tenantId} />;
    }
  };

  const renderReportsContent = () => {
    return (
      <div className="space-y-6">
        {/* Reports Sub-navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {reportTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setReportsSubTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  reportsSubTab === tab.id
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

        {/* Reports Content */}
        <div>
          {reportsSubTab === 'consumption' && <ConsumptionTrends outletId={user?.tenantId} />}
          {reportsSubTab === 'waste' && <WasteAnalysis outletId={user?.tenantId} />}
          {reportsSubTab === 'costs' && <CostBreakdown outletId={user?.tenantId} />}
          {reportsSubTab === 'transfers' && <StockTransferManager outletId={user?.tenantId} />}
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute requiredPermission="inventory.view">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600">
              Track stock levels, manage suppliers, and create purchase orders
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

export default InventoryPage;
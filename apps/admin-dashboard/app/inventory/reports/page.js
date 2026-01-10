'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import ConsumptionTrends from '../../components/Inventory/ConsumptionTrends';
import WasteAnalysis from '../../components/Inventory/WasteAnalysis';
import CostBreakdown from '../../components/Inventory/CostBreakdown';
import StockTransferManager from '../../components/Inventory/StockTransferManager';

const InventoryReportsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('consumption');

  const tabs = [
    { id: 'consumption', label: 'Consumption Trends', icon: '📈' },
    { id: 'waste', label: 'Waste Analysis', icon: '🗑️' },
    { id: 'costs', label: 'Cost Breakdown', icon: '💰' },
    { id: 'transfers', label: 'Stock Transfers', icon: '🔄' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'consumption':
        return <ConsumptionTrends outletId={user?.tenantId} />;
      case 'waste':
        return <WasteAnalysis outletId={user?.tenantId} />;
      case 'costs':
        return <CostBreakdown outletId={user?.tenantId} />;
      case 'transfers':
        return <StockTransferManager outletId={user?.tenantId} />;
      default:
        return <ConsumptionTrends outletId={user?.tenantId} />;
    }
  };

  return (
    <ProtectedRoute requiredPermission="inventory.reports.view">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Inventory Reports & Analytics</h1>
            <p className="mt-2 text-gray-600">
              Analyze consumption patterns, waste trends, costs, and manage stock transfers
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

export default InventoryReportsPage;
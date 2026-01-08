'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import ProtectedRoute from '../../components/Auth/ProtectedRoute';
import PermissionGate from '../../components/Auth/PermissionGate';
import MenuAnalytics from '../../components/Menu/MenuAnalytics';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Calendar,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';

function MenuAnalyticsContent() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedOutlet, setSelectedOutlet] = useState('all');

  const { selectedOutlet: currentOutlet, outlets } = useTenant();

  useEffect(() => {
    if (currentOutlet) {
      loadMenuItems();
    }
  }, [currentOutlet, selectedOutlet, dateRange]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const outletId = selectedOutlet === 'all' ? null : selectedOutlet;
      const items = await menuService.getMenuItems(outletId || currentOutlet.id);
      setMenuItems(items);
    } catch (error) {
      console.error('Failed to load menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExportReport = () => {
    // Implement export functionality
    console.log('Exporting analytics report...');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analyze menu performance, trends, and customer preferences
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={loadMenuItems}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Date Range */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  className="input-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  className="input-sm"
                />
              </div>

              {/* Outlet Filter */}
              {outlets && outlets.length > 1 && (
                <select
                  value={selectedOutlet}
                  onChange={(e) => setSelectedOutlet(e.target.value)}
                  className="input-sm"
                >
                  <option value="all">All Outlets</option>
                  {outlets.map(outlet => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Analyzing {menuItems.length} menu items
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">₹15,680</p>
                <p className="text-sm text-green-600">+12.5% from last period</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Top Performer</p>
                <p className="text-lg font-semibold text-gray-900">Butter Chicken</p>
                <p className="text-sm text-green-600">89 orders this period</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                <p className="text-2xl font-semibold text-gray-900">4.6</p>
                <p className="text-sm text-green-600">+0.2 from last period</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                <p className="text-2xl font-semibold text-gray-900">32.5%</p>
                <p className="text-sm text-green-600">+2.1% from last period</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Analytics Component */}
        <MenuAnalytics
          menuItems={menuItems}
          dateRange={dateRange}
          outletId={selectedOutlet === 'all' ? null : selectedOutlet}
        />

        {/* Additional Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Insights */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Main Course items generate 56.7% of total revenue
                  </p>
                  <p className="text-sm text-gray-600">
                    Consider expanding this category with seasonal specials
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Desserts have the highest profit margin at 45%
                  </p>
                  <p className="text-sm text-gray-600">
                    Promote desserts to increase overall profitability
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Fish Curry needs attention with declining orders
                  </p>
                  <p className="text-sm text-gray-600">
                    Consider recipe improvements or promotional pricing
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900">Optimize Menu Layout</p>
                <p className="text-sm text-blue-700 mt-1">
                  Place high-performing items like Butter Chicken in prominent positions
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-900">Seasonal Promotions</p>
                <p className="text-sm text-green-700 mt-1">
                  Create limited-time offers for underperforming items to boost sales
                </p>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-medium text-purple-900">Price Optimization</p>
                <p className="text-sm text-purple-700 mt-1">
                  Consider slight price increases for high-demand items with good margins
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MenuAnalyticsPage() {
  return (
    <ProtectedRoute 
      requiredPermission="analytics.view"
      resource="menu analytics"
    >
      <MenuAnalyticsContent />
    </ProtectedRoute>
  );
}
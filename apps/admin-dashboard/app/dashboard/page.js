'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { analyticsService } from '../services/analyticsService';
import DashboardLayout from '../components/Layout/DashboardLayout';
import Card from '../components/UI/Card';
import SalesChart from '../components/Charts/SalesChart';
import PieChart from '../components/Charts/PieChart';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7d');
  const { selectedOutlet } = useTenant();

  useEffect(() => {
    if (selectedOutlet) {
      loadDashboardData();
    }
  }, [selectedOutlet, period]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getDashboardSummary(selectedOutlet.id);
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  const stats = [
    {
      name: 'Total Revenue',
      value: dashboardData?.revenue?.total || 0,
      change: dashboardData?.revenue?.change || 0,
      icon: DollarSign,
      format: 'currency',
    },
    {
      name: 'Orders Today',
      value: dashboardData?.orders?.today || 0,
      change: dashboardData?.orders?.change || 0,
      icon: ShoppingCart,
      format: 'number',
    },
    {
      name: 'Active Customers',
      value: dashboardData?.customers?.active || 0,
      change: dashboardData?.customers?.change || 0,
      icon: Users,
      format: 'number',
    },
    {
      name: 'Average Order Value',
      value: dashboardData?.averageOrderValue || 0,
      change: dashboardData?.averageOrderValueChange || 0,
      icon: TrendingUp,
      format: 'currency',
    },
  ];

  const formatValue = (value, format) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back! Here's what's happening at {selectedOutlet?.name}.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input w-auto"
            >
              <option value="1d">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const isPositive = stat.change >= 0;
            
            return (
              <Card key={stat.name} className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-primary-100 rounded-lg">
                      <Icon className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatValue(stat.value, stat.format)}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className={`text-sm font-medium ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? '+' : ''}{stat.change.toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-500 ml-1">vs last period</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <Card title="Sales Overview" className="p-6">
            {dashboardData?.salesChart ? (
              <SalesChart 
                data={dashboardData.salesChart}
                height={300}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No sales data available
              </div>
            )}
          </Card>

          {/* Top Items Chart */}
          <Card title="Top Selling Items" className="p-6">
            {dashboardData?.topItemsChart ? (
              <PieChart 
                data={dashboardData.topItemsChart}
                type="doughnut"
                height={300}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No items data available
              </div>
            )}
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <Card title="Recent Orders" className="p-6">
            <div className="space-y-4">
              {dashboardData?.recentOrders?.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Order #{order.orderNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatValue(order.total, 'currency')}
                    </p>
                    <p className={`text-xs ${
                      order.status === 'completed' ? 'text-green-600' :
                      order.status === 'pending' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No recent orders</p>
              )}
            </div>
          </Card>

          {/* Low Stock Alerts */}
          <Card title="Low Stock Alerts" className="p-6">
            <div className="space-y-4">
              {dashboardData?.lowStockItems?.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.currentStock} {item.unit} remaining
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No low stock alerts</p>
              )}
            </div>
          </Card>

          {/* Staff Performance */}
          <Card title="Staff Performance" className="p-6">
            <div className="space-y-4">
              {dashboardData?.topStaff?.slice(0, 5).map((staff) => (
                <div key={staff.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-600">
                        {staff.name.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                      <p className="text-xs text-gray-500">{staff.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {staff.ordersServed} orders
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatValue(staff.revenue, 'currency')}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500">No staff data available</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
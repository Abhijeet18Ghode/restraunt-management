'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Star,
  Clock,
  BarChart3,
  PieChart
} from 'lucide-react';

/**
 * Menu Analytics Dashboard Component
 * Displays comprehensive menu performance metrics
 */
export default function MenuAnalytics({ 
  menuItems = [], 
  dateRange = null,
  outletId = null,
  className = ''
}) {
  const [analytics, setAnalytics] = useState({
    topPerformers: [],
    lowPerformers: [],
    revenueMetrics: {},
    categoryPerformance: [],
    trends: {},
    loading: true
  });

  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [timeframe, setTimeframe] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [menuItems, dateRange, outletId, timeframe]);

  const loadAnalytics = async () => {
    setAnalytics(prev => ({ ...prev, loading: true }));
    
    try {
      // Simulate API call - replace with actual service call
      const mockAnalytics = {
        topPerformers: [
          {
            id: '1',
            name: 'Butter Chicken',
            revenue: 2450,
            orders: 89,
            avgRating: 4.8,
            trend: 12.5
          },
          {
            id: '2',
            name: 'Paneer Tikka',
            revenue: 1890,
            orders: 67,
            avgRating: 4.6,
            trend: 8.3
          },
          {
            id: '3',
            name: 'Biryani Special',
            revenue: 3200,
            orders: 45,
            avgRating: 4.9,
            trend: 15.2
          }
        ],
        lowPerformers: [
          {
            id: '4',
            name: 'Fish Curry',
            revenue: 320,
            orders: 12,
            avgRating: 3.8,
            trend: -5.2
          },
          {
            id: '5',
            name: 'Mutton Korma',
            revenue: 180,
            orders: 8,
            avgRating: 4.1,
            trend: -12.1
          }
        ],
        revenueMetrics: {
          totalRevenue: 15680,
          totalOrders: 234,
          avgOrderValue: 67.01,
          profitMargin: 32.5
        },
        categoryPerformance: [
          { category: 'Main Course', revenue: 8900, orders: 145, percentage: 56.7 },
          { category: 'Appetizers', revenue: 3200, orders: 78, percentage: 20.4 },
          { category: 'Beverages', revenue: 2100, orders: 89, percentage: 13.4 },
          { category: 'Desserts', revenue: 1480, orders: 45, percentage: 9.4 }
        ],
        trends: {
          revenue: { current: 15680, previous: 14200, change: 10.4 },
          orders: { current: 234, previous: 198, change: 18.2 },
          avgRating: { current: 4.5, previous: 4.3, change: 4.7 }
        }
      };

      setAnalytics({
        ...mockAnalytics,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setAnalytics(prev => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (analytics.loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Menu Analytics</h2>
          <div className="flex items-center space-x-4">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="input-sm"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(analytics.revenueMetrics.totalRevenue)}
            change={analytics.trends.revenue.change}
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Total Orders"
            value={analytics.revenueMetrics.totalOrders.toLocaleString()}
            change={analytics.trends.orders.change}
            icon={ShoppingCart}
            color="blue"
          />
          <MetricCard
            title="Avg Order Value"
            value={formatCurrency(analytics.revenueMetrics.avgOrderValue)}
            change={5.2}
            icon={BarChart3}
            color="purple"
          />
          <MetricCard
            title="Avg Rating"
            value={analytics.trends.avgRating.current.toFixed(1)}
            change={analytics.trends.avgRating.change}
            icon={Star}
            color="yellow"
          />
        </div>

        {/* Performance Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performers */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {analytics.topPerformers.map((item, index) => (
                <PerformanceItem
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  type="top"
                />
              ))}
            </div>
          </div>

          {/* Low Performers */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Needs Attention</h3>
            <div className="space-y-3">
              {analytics.lowPerformers.map((item, index) => (
                <PerformanceItem
                  key={item.id}
                  item={item}
                  rank={index + 1}
                  type="low"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Category Performance</h3>
          <div className="space-y-4">
            {analytics.categoryPerformance.map((category) => (
              <CategoryPerformanceBar
                key={category.category}
                category={category}
                total={analytics.revenueMetrics.totalRevenue}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 */
function MetricCard({ title, value, change, icon: Icon, color }) {
  const colorClasses = {
    green: 'text-green-600 bg-green-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
    yellow: 'text-yellow-600 bg-yellow-50'
  };

  const isPositive = change >= 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={`flex items-center text-sm ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{title}</p>
      </div>
    </div>
  );
}

/**
 * Performance Item Component
 */
function PerformanceItem({ item, rank, type }) {
  const isPositive = item.trend >= 0;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className={`
          flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
          ${type === 'top' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        `}>
          {rank}
        </div>
        <div>
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            {item.orders} orders • ₹{item.revenue.toLocaleString()}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center space-x-2">
          <Star className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium">{item.avgRating}</span>
        </div>
        <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}{item.trend.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

/**
 * Category Performance Bar Component
 */
function CategoryPerformanceBar({ category, total }) {
  const percentage = (category.revenue / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{category.category}</span>
        <span className="text-sm text-gray-600">
          ₹{category.revenue.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs text-gray-500">
        {category.orders} orders
      </div>
    </div>
  );
}
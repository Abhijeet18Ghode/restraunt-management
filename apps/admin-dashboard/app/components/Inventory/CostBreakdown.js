'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const CostBreakdown = ({ outletId = null }) => {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewType, setViewType] = useState('category');

  useEffect(() => {
    loadCostBreakdown();
  }, [outletId, dateRange, selectedCategory]);

  const loadCostBreakdown = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getCostBreakdown(
        outletId, 
        dateRange, 
        selectedCategory === 'all' ? null : selectedCategory
      );
      setCostData(response.data);
    } catch (err) {
      setError('Failed to load cost breakdown');
      console.error('Cost breakdown loading error:', err);
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

  const prepareCategoryChart = () => {
    if (!costData?.costByCategory) return null;

    const categories = costData.costByCategory.map(item => item.category);
    const costs = costData.costByCategory.map(item => item.totalCost);

    return {
      labels: categories,
      datasets: [
        {
          data: costs,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',   // blue
            'rgba(16, 185, 129, 0.8)',   // green
            'rgba(245, 101, 101, 0.8)',  // red
            'rgba(251, 191, 36, 0.8)',   // yellow
            'rgba(139, 92, 246, 0.8)',   // purple
            'rgba(236, 72, 153, 0.8)',   // pink
            'rgba(34, 197, 94, 0.8)',    // emerald
            'rgba(249, 115, 22, 0.8)',   // orange
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 101, 101, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
            'rgba(34, 197, 94, 1)',
            'rgba(249, 115, 22, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const prepareCostTrendChart = () => {
    if (!costData?.costTrend) return null;

    const dates = costData.costTrend.map(item => new Date(item.date).toLocaleDateString());
    const purchaseCosts = costData.costTrend.map(item => item.purchaseCost || 0);
    const wasteCosts = costData.costTrend.map(item => item.wasteCost || 0);
    const adjustmentCosts = costData.costTrend.map(item => item.adjustmentCost || 0);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Purchase Costs',
          data: purchaseCosts,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
        },
        {
          label: 'Waste Costs',
          data: wasteCosts,
          backgroundColor: 'rgba(245, 101, 101, 0.2)',
          borderColor: 'rgba(245, 101, 101, 1)',
          borderWidth: 2,
        },
        {
          label: 'Adjustment Costs',
          data: adjustmentCosts,
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
          borderColor: 'rgba(251, 191, 36, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const getCategoryColor = (category) => {
    const colors = {
      'ingredients': 'text-blue-600 bg-blue-50',
      'beverages': 'text-green-600 bg-green-50',
      'packaging': 'text-yellow-600 bg-yellow-50',
      'cleaning': 'text-purple-600 bg-purple-50',
      'equipment': 'text-red-600 bg-red-50',
      'other': 'text-gray-600 bg-gray-50'
    };
    return colors[category.toLowerCase()] || colors.other;
  };

  const categoryChart = prepareCategoryChart();
  const costTrendChart = prepareCostTrendChart();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      title: {
        display: true,
        text: 'Cost Distribution by Category',
      },
    },
  };

  const trendChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cost Trends Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cost ($)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Cost Breakdown Analysis</h2>
        <div className="flex space-x-3">
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="category">By Category</option>
            <option value="supplier">By Supplier</option>
            <option value="trends">Cost Trends</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Filter
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="ingredients">Ingredients</option>
              <option value="beverages">Beverages</option>
              <option value="packaging">Packaging</option>
              <option value="cleaning">Cleaning Supplies</option>
              <option value="equipment">Equipment</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {costData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Total Costs</div>
              <div className="text-2xl font-bold text-gray-900">
                ${costData.summary?.totalCosts?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-500">
                {costData.summary?.totalTransactions || 0} transactions
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Purchase Costs</div>
              <div className="text-2xl font-bold text-blue-600">
                ${costData.summary?.purchaseCosts?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-500">
                {((costData.summary?.purchaseCosts / costData.summary?.totalCosts) * 100).toFixed(1) || 0}% of total
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Waste Costs</div>
              <div className="text-2xl font-bold text-red-600">
                ${costData.summary?.wasteCosts?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-500">
                {((costData.summary?.wasteCosts / costData.summary?.totalCosts) * 100).toFixed(1) || 0}% of total
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Avg Daily Cost</div>
              <div className="text-2xl font-bold text-gray-900">
                ${costData.summary?.avgDailyCost?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-500">
                Last 30 days
              </div>
            </div>
          </div>

          {/* Charts */}
          {viewType === 'category' && categoryChart && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost by Category</h3>
                <div className="h-64">
                  <Doughnut data={categoryChart} options={chartOptions} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
                <div className="space-y-3">
                  {costData.costByCategory?.map((category, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category.category)}`}>
                          {category.category}
                        </span>
                        <span className="text-sm text-gray-600">
                          {category.itemCount} items
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          ${category.totalCost?.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {((category.totalCost / costData.summary?.totalCosts) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewType === 'trends' && costTrendChart && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends</h3>
              <div className="h-96">
                <Bar data={costTrendChart} options={trendChartOptions} />
              </div>
            </div>
          )}

          {/* Top Cost Items */}
          {costData.topCostItems && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Highest Cost Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        % of Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {costData.topCostItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${item.totalCost?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.avgUnitCost?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantityUsed} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {((item.totalCost / costData.summary?.totalCosts) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost Optimization Recommendations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Optimization Opportunities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Immediate Actions</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Negotiate better prices with suppliers for high-cost items
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Consider bulk purchasing for frequently used items
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Review and reduce waste in high-cost categories
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">•</span>
                    Implement portion control for expensive ingredients
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Strategic Initiatives</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Explore alternative suppliers for cost comparison
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Implement inventory turnover optimization
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Consider seasonal menu adjustments based on cost trends
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Invest in staff training for cost-conscious practices
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CostBreakdown;
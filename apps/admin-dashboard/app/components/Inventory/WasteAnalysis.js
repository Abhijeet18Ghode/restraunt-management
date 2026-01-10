'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Pie, Bar } from 'react-chartjs-2';
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

const WasteAnalysis = ({ outletId = null }) => {
  const [wasteData, setWasteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  const [viewType, setViewType] = useState('overview');

  useEffect(() => {
    loadWasteAnalysis();
  }, [outletId, dateRange]);

  const loadWasteAnalysis = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getWasteAnalysis(outletId, dateRange);
      setWasteData(response.data);
    } catch (err) {
      setError('Failed to load waste analysis');
      console.error('Waste analysis loading error:', err);
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

  const handleExport = async () => {
    try {
      const blob = await inventoryService.exportWasteAnalysis(outletId, dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `waste-analysis-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export waste analysis');
      console.error('Export error:', err);
    }
  };

  const prepareWasteByReasonChart = () => {
    if (!wasteData?.wasteByReason) return null;

    const reasons = wasteData.wasteByReason.map(item => item.reason);
    const amounts = wasteData.wasteByReason.map(item => item.totalAmount);
    const costs = wasteData.wasteByReason.map(item => item.totalCost);

    return {
      labels: reasons,
      datasets: [
        {
          label: 'Waste Amount',
          data: amounts,
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',   // red
            'rgba(245, 101, 101, 0.8)', // light red
            'rgba(251, 113, 133, 0.8)', // pink
            'rgba(248, 113, 113, 0.8)', // salmon
            'rgba(252, 165, 165, 0.8)', // light pink
          ],
          borderColor: [
            'rgba(239, 68, 68, 1)',
            'rgba(245, 101, 101, 1)',
            'rgba(251, 113, 133, 1)',
            'rgba(248, 113, 113, 1)',
            'rgba(252, 165, 165, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const prepareWasteTrendChart = () => {
    if (!wasteData?.wasteTrend) return null;

    const dates = wasteData.wasteTrend.map(item => new Date(item.date).toLocaleDateString());
    const amounts = wasteData.wasteTrend.map(item => item.totalAmount);
    const costs = wasteData.wasteTrend.map(item => item.totalCost);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Waste Amount',
          data: amounts,
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Waste Cost ($)',
          data: costs,
          backgroundColor: 'rgba(245, 101, 101, 0.2)',
          borderColor: 'rgba(245, 101, 101, 1)',
          borderWidth: 2,
          yAxisID: 'y1',
        },
      ],
    };
  };

  const getWasteReasonColor = (reason) => {
    const colors = {
      'expired': 'text-red-600 bg-red-50',
      'damaged': 'text-orange-600 bg-orange-50',
      'spoiled': 'text-yellow-600 bg-yellow-50',
      'overproduction': 'text-blue-600 bg-blue-50',
      'contaminated': 'text-purple-600 bg-purple-50',
      'other': 'text-gray-600 bg-gray-50'
    };
    return colors[reason.toLowerCase()] || colors.other;
  };

  const wasteByReasonChart = prepareWasteByReasonChart();
  const wasteTrendChart = prepareWasteTrendChart();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Waste Analysis',
      },
    },
  };

  const trendChartOptions = {
    responsive: true,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Waste Trend Over Time',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Amount',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Cost ($)',
        },
        grid: {
          drawOnChartArea: false,
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
        <h2 className="text-2xl font-bold text-gray-900">Waste Analysis</h2>
        <div className="flex space-x-3">
          <select
            value={viewType}
            onChange={(e) => setViewType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed Analysis</option>
            <option value="trends">Trends</option>
          </select>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Export Report
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Date Range Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
      </div>

      {wasteData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Total Waste</div>
              <div className="text-2xl font-bold text-red-600">
                {wasteData.summary?.totalWasteAmount || 0}
              </div>
              <div className="text-sm text-gray-500">
                {wasteData.summary?.totalWasteItems || 0} items
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Waste Cost</div>
              <div className="text-2xl font-bold text-red-600">
                ${wasteData.summary?.totalWasteCost?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-gray-500">
                {wasteData.summary?.wastePercentage?.toFixed(1) || 0}% of inventory
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Most Wasted Item</div>
              <div className="text-lg font-bold text-gray-900">
                {wasteData.summary?.mostWastedItem?.name || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">
                {wasteData.summary?.mostWastedItem?.amount || 0} units
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Avg Daily Waste</div>
              <div className="text-2xl font-bold text-gray-900">
                {wasteData.summary?.avgDailyWaste?.toFixed(1) || 0}
              </div>
              <div className="text-sm text-gray-500">
                ${wasteData.summary?.avgDailyCost?.toFixed(2) || '0.00'} cost
              </div>
            </div>
          </div>

          {/* Charts */}
          {viewType === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {wasteByReasonChart && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste by Reason</h3>
                  <div className="h-64">
                    <Pie data={wasteByReasonChart} options={chartOptions} />
                  </div>
                </div>
              )}

              {wasteTrendChart && (
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Trend</h3>
                  <div className="h-64">
                    <Bar data={wasteTrendChart} options={trendChartOptions} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Detailed Waste Items */}
          {viewType === 'detailed' && wasteData.wasteItems && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Waste Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount Wasted
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Impact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {wasteData.wasteItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getWasteReasonColor(item.reason)}`}>
                            {item.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.wastedAmount} {item.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${item.costImpact?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.wasteDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Waste Reduction Recommendations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Waste Reduction Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">High Priority Actions</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Review ordering patterns for frequently wasted items
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Implement FIFO (First In, First Out) inventory rotation
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Train staff on proper storage and handling procedures
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-500 mr-2">•</span>
                    Set up automated alerts for items nearing expiration
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Long-term Strategies</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Negotiate with suppliers for smaller, more frequent deliveries
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Implement demand forecasting to optimize order quantities
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Create staff incentive programs for waste reduction
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    Partner with local organizations for food donation programs
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

export default WasteAnalysis;
'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ConsumptionTrends = ({ outletId = null }) => {
  const [consumptionData, setConsumptionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [chartType, setChartType] = useState('line');
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    loadAvailableItems();
  }, [outletId]);

  useEffect(() => {
    if (selectedItems.length > 0) {
      loadConsumptionTrends();
    }
  }, [outletId, dateRange, selectedItems, groupBy]);

  const loadAvailableItems = async () => {
    try {
      const response = await inventoryService.getInventoryItems(outletId);
      setAvailableItems(response.data || []);
      
      // Auto-select top 5 items by default
      const topItems = (response.data || []).slice(0, 5).map(item => item.id);
      setSelectedItems(topItems);
    } catch (err) {
      console.error('Failed to load available items:', err);
    }
  };

  const loadConsumptionTrends = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getConsumptionTrends(
        outletId,
        dateRange,
        selectedItems
      );
      setConsumptionData(response.data || []);
    } catch (err) {
      setError('Failed to load consumption trends');
      console.error('Consumption trends loading error:', err);
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

  const handleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleExport = async () => {
    try {
      const blob = await inventoryService.exportConsumptionTrends(outletId, dateRange);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consumption-trends-${dateRange.startDate}-to-${dateRange.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to export consumption trends');
      console.error('Export error:', err);
    }
  };

  const prepareChartData = () => {
    if (!consumptionData.length) return null;

    const labels = consumptionData.map(item => {
      const date = new Date(item.date);
      if (groupBy === 'day') {
        return date.toLocaleDateString();
      } else if (groupBy === 'week') {
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
    });

    const datasets = selectedItems.map((itemId, index) => {
      const item = availableItems.find(i => i.id === itemId);
      const data = consumptionData.map(dataPoint => 
        dataPoint.items?.find(i => i.itemId === itemId)?.consumed || 0
      );

      const colors = [
        'rgb(59, 130, 246)', // blue
        'rgb(16, 185, 129)', // green
        'rgb(245, 101, 101)', // red
        'rgb(251, 191, 36)', // yellow
        'rgb(139, 92, 246)', // purple
        'rgb(236, 72, 153)', // pink
        'rgb(34, 197, 94)', // emerald
        'rgb(249, 115, 22)', // orange
      ];

      return {
        label: item?.name || `Item ${itemId}`,
        data,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length] + '20',
        tension: 0.1,
      };
    });

    return { labels, datasets };
  };

  const chartData = prepareChartData();

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inventory Consumption Trends',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantity Consumed',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time Period',
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
        <h2 className="text-2xl font-bold text-gray-900">Consumption Trends</h2>
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Export Report
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chart Type
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
        </div>

        {/* Item Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Items to Track ({selectedItems.length} selected)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
            {availableItems.map((item) => (
              <label key={item.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item.id)}
                  onChange={() => handleItemSelection(item.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 truncate">{item.name}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="h-96">
            {chartType === 'line' ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <Bar data={chartData} options={chartOptions} />
            )}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {consumptionData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Consumed Items</h3>
            <div className="space-y-2">
              {selectedItems.slice(0, 5).map((itemId) => {
                const item = availableItems.find(i => i.id === itemId);
                const totalConsumed = consumptionData.reduce((sum, dataPoint) => {
                  const itemData = dataPoint.items?.find(i => i.itemId === itemId);
                  return sum + (itemData?.consumed || 0);
                }, 0);
                
                return (
                  <div key={itemId} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{item?.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {totalConsumed} {item?.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Consumption Patterns</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Daily Consumption</span>
                <span className="text-sm font-medium text-gray-900">
                  {consumptionData.length > 0 ? 
                    Math.round(consumptionData.reduce((sum, day) => 
                      sum + (day.items?.reduce((itemSum, item) => itemSum + item.consumed, 0) || 0), 0
                    ) / consumptionData.length) : 0
                  } items
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Peak Consumption Day</span>
                <span className="text-sm font-medium text-gray-900">
                  {consumptionData.length > 0 ? 
                    new Date(consumptionData.reduce((max, day) => {
                      const dayTotal = day.items?.reduce((sum, item) => sum + item.consumed, 0) || 0;
                      const maxTotal = max.items?.reduce((sum, item) => sum + item.consumed, 0) || 0;
                      return dayTotal > maxTotal ? day : max;
                    }).date).toLocaleDateString() : 'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Trend Direction</span>
                <span className="text-sm font-medium text-gray-900">
                  {consumptionData.length >= 2 ? 
                    (consumptionData[consumptionData.length - 1].items?.reduce((sum, item) => sum + item.consumed, 0) || 0) >
                    (consumptionData[0].items?.reduce((sum, item) => sum + item.consumed, 0) || 0) ? 
                    '📈 Increasing' : '📉 Decreasing' : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Insights</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• Track consumption patterns to optimize inventory levels</p>
              <p>• Identify seasonal trends and adjust ordering accordingly</p>
              <p>• Monitor for unusual spikes that may indicate waste or theft</p>
              <p>• Use data to negotiate better supplier contracts</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumptionTrends;
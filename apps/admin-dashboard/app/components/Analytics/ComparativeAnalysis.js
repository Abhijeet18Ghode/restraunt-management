'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Building2,
  DollarSign,
  ShoppingCart,
  Users,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const COMPARISON_METRICS = [
  {
    id: 'revenue',
    name: 'Revenue',
    icon: DollarSign,
    format: 'currency',
    color: 'text-green-600'
  },
  {
    id: 'orders',
    name: 'Orders',
    icon: ShoppingCart,
    format: 'number',
    color: 'text-blue-600'
  },
  {
    id: 'customers',
    name: 'Customers',
    icon: Users,
    format: 'number',
    color: 'text-purple-600'
  },
  {
    id: 'avgOrderValue',
    name: 'Avg Order Value',
    icon: BarChart3,
    format: 'currency',
    color: 'text-orange-600'
  },
  {
    id: 'avgServiceTime',
    name: 'Avg Service Time',
    icon: Clock,
    format: 'time',
    color: 'text-indigo-600'
  }
];

const COMPARISON_PERIODS = [
  { id: '7d', name: 'Last 7 Days' },
  { id: '30d', name: 'Last 30 Days' },
  { id: '90d', name: 'Last 90 Days' },
  { id: 'ytd', name: 'Year to Date' }
];

export default function ComparativeAnalysis({ outlets = [], analyticsService }) {
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedOutlets.length >= 2) {
      loadComparisonData();
    }
  }, [selectedOutlets, selectedPeriod]);

  const loadComparisonData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await analyticsService.getComparativeAnalysis(selectedOutlets, selectedPeriod);
      setComparisonData(data);
    } catch (err) {
      setError('Failed to load comparison data');
      console.error('Error loading comparison data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOutletToggle = (outletId) => {
    setSelectedOutlets(prev => {
      if (prev.includes(outletId)) {
        return prev.filter(id => id !== outletId);
      } else if (prev.length < 4) { // Limit to 4 outlets for readability
        return [...prev, outletId];
      }
      return prev;
    });
  };

  const formatValue = (value, format) => {
    if (value === null || value === undefined) return 'N/A';
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      case 'time':
        return `${Math.round(value)} min`;
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toString();
    }
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  const getBestPerformer = (metric) => {
    if (!comparisonData?.outlets) return null;
    
    const outlets = comparisonData.outlets;
    let best = outlets[0];
    
    outlets.forEach(outlet => {
      if (outlet.metrics[metric] > best.metrics[metric]) {
        best = outlet;
      }
    });
    
    return best;
  };

  const getWorstPerformer = (metric) => {
    if (!comparisonData?.outlets) return null;
    
    const outlets = comparisonData.outlets;
    let worst = outlets[0];
    
    outlets.forEach(outlet => {
      if (outlet.metrics[metric] < worst.metrics[metric]) {
        worst = outlet;
      }
    });
    
    return worst;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <TrendingUp className="h-6 w-6 text-gray-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparative Analysis</h3>
            <p className="text-sm text-gray-600">Compare performance across multiple outlets</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Outlet Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Outlets to Compare (2-4 outlets)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {outlets.map((outlet) => (
                <label key={outlet.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOutlets.includes(outlet.id)}
                    onChange={() => handleOutletToggle(outlet.id)}
                    disabled={!selectedOutlets.includes(outlet.id) && selectedOutlets.length >= 4}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{outlet.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({outlet.address})</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Period and Metric Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {COMPARISON_PERIODS.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {COMPARISON_METRICS.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      {selectedOutlets.length < 2 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Outlets to Compare</h3>
          <p className="text-gray-600">Choose at least 2 outlets to see comparative analysis</p>
        </div>
      )}

      {selectedOutlets.length >= 2 && (
        <>
          {isLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading comparison data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {comparisonData && !isLoading && (
            <>
              {/* Performance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Best Performers</h4>
                  <div className="space-y-3">
                    {COMPARISON_METRICS.map((metric) => {
                      const best = getBestPerformer(metric.id);
                      const Icon = metric.icon;
                      return (
                        <div key={metric.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon className={`h-4 w-4 ${metric.color} mr-2`} />
                            <span className="text-sm text-gray-700">{metric.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {best?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatValue(best?.metrics[metric.id], metric.format)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Improvement Opportunities</h4>
                  <div className="space-y-3">
                    {COMPARISON_METRICS.map((metric) => {
                      const worst = getWorstPerformer(metric.id);
                      const Icon = metric.icon;
                      return (
                        <div key={metric.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Icon className={`h-4 w-4 ${metric.color} mr-2`} />
                            <span className="text-sm text-gray-700">{metric.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {worst?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatValue(worst?.metrics[metric.id], metric.format)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Detailed Comparison Table */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">Detailed Comparison</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outlet
                        </th>
                        {COMPARISON_METRICS.map((metric) => (
                          <th key={metric.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {metric.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comparisonData.outlets.map((outlet) => (
                        <tr key={outlet.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {outlet.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {outlet.address}
                                </div>
                              </div>
                            </div>
                          </td>
                          {COMPARISON_METRICS.map((metric) => (
                            <td key={metric.id} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatValue(outlet.metrics[metric.id], metric.format)}
                              </div>
                              {outlet.changes && outlet.changes[metric.id] !== undefined && (
                                <div className={`flex items-center text-xs ${getChangeColor(outlet.changes[metric.id])}`}>
                                  {getChangeIcon(outlet.changes[metric.id])}
                                  <span className="ml-1">
                                    {formatValue(Math.abs(outlet.changes[metric.id]), 'percentage')}
                                  </span>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Insights */}
              {comparisonData.insights && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-3">Key Insights</h4>
                  <ul className="space-y-2">
                    {comparisonData.insights.map((insight, index) => (
                      <li key={index} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-sm text-blue-800">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
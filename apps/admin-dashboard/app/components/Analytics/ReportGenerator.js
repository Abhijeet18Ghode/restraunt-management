'use client';

import { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Clock,
  Building2
} from 'lucide-react';

const REPORT_TYPES = [
  {
    id: 'sales',
    name: 'Sales Report',
    description: 'Revenue, orders, and sales performance',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'menu',
    name: 'Menu Performance',
    description: 'Item popularity, profit margins, and trends',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'customer',
    name: 'Customer Analytics',
    description: 'Customer behavior, loyalty, and demographics',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'inventory',
    name: 'Inventory Report',
    description: 'Stock levels, consumption, and waste analysis',
    icon: Package,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    id: 'staff',
    name: 'Staff Performance',
    description: 'Productivity, attendance, and performance metrics',
    icon: Clock,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'comparative',
    name: 'Comparative Analysis',
    description: 'Multi-outlet comparison and benchmarking',
    icon: TrendingUp,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  }
];

const EXPORT_FORMATS = [
  { id: 'pdf', name: 'PDF Report', extension: '.pdf', icon: FileText },
  { id: 'excel', name: 'Excel Spreadsheet', extension: '.xlsx', icon: FileText },
  { id: 'csv', name: 'CSV Data', extension: '.csv', icon: FileText }
];

const DATE_RANGES = [
  { id: 'today', name: 'Today', value: '1d' },
  { id: 'yesterday', name: 'Yesterday', value: 'yesterday' },
  { id: 'week', name: 'This Week', value: '7d' },
  { id: 'month', name: 'This Month', value: '30d' },
  { id: 'quarter', name: 'This Quarter', value: '90d' },
  { id: 'year', name: 'This Year', value: '365d' },
  { id: 'custom', name: 'Custom Range', value: 'custom' }
];

export default function ReportGenerator({ outlets = [], onGenerateReport }) {
  const [selectedReportType, setSelectedReportType] = useState('sales');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [includeComparison, setIncludeComparison] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleOutletToggle = (outletId) => {
    setSelectedOutlets(prev => 
      prev.includes(outletId) 
        ? prev.filter(id => id !== outletId)
        : [...prev, outletId]
    );
  };

  const handleSelectAllOutlets = () => {
    if (selectedOutlets.length === outlets.length) {
      setSelectedOutlets([]);
    } else {
      setSelectedOutlets(outlets.map(outlet => outlet.id));
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      const reportConfig = {
        type: selectedReportType,
        format: selectedFormat,
        dateRange: selectedDateRange === 'custom' ? customDateRange : { period: selectedDateRange },
        outlets: selectedOutlets.length > 0 ? selectedOutlets : [outlets[0]?.id],
        includeComparison: includeComparison && selectedOutlets.length > 1,
        timestamp: new Date().toISOString()
      };

      await onGenerateReport(reportConfig);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedReport = REPORT_TYPES.find(type => type.id === selectedReportType);
  const canGenerate = selectedOutlets.length > 0 || outlets.length === 1;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <FileText className="h-6 w-6 text-gray-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Report Generator</h3>
            <p className="text-sm text-gray-600">Generate and export comprehensive business reports</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Report Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedReportType(type.id)}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all duration-200
                    ${selectedReportType === type.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-start">
                    <div className={`p-2 rounded-lg ${type.bgColor} mr-3`}>
                      <Icon className={`h-5 w-5 ${type.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">{type.name}</h4>
                      <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Date Range
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {DATE_RANGES.map((range) => (
              <button
                key={range.id}
                onClick={() => setSelectedDateRange(range.value)}
                className={`
                  px-3 py-2 text-sm rounded-md border transition-colors duration-200
                  ${selectedDateRange === range.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {range.name}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {selectedDateRange === 'custom' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Outlet Selection */}
        {outlets.length > 1 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Outlets
              </label>
              <button
                onClick={handleSelectAllOutlets}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {selectedOutlets.length === outlets.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {outlets.map((outlet) => (
                <label key={outlet.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOutlets.includes(outlet.id)}
                    onChange={() => handleOutletToggle(outlet.id)}
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

            {/* Comparison Option */}
            {selectedOutlets.length > 1 && (
              <div className="mt-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeComparison}
                    onChange={(e) => setIncludeComparison(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Include comparative analysis between outlets
                  </span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* Export Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Export Format
          </label>
          <div className="grid grid-cols-3 gap-3">
            {EXPORT_FORMATS.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-all duration-200
                    ${selectedFormat === format.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <div className="text-sm font-medium text-gray-900">{format.name}</div>
                  <div className="text-xs text-gray-500">{format.extension}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Report Preview */}
        {selectedReport && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Report Preview</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Type: <span className="font-medium">{selectedReport.name}</span></div>
              <div>Format: <span className="font-medium">{EXPORT_FORMATS.find(f => f.id === selectedFormat)?.name}</span></div>
              <div>Period: <span className="font-medium">
                {selectedDateRange === 'custom' 
                  ? `${customDateRange.startDate} to ${customDateRange.endDate}`
                  : DATE_RANGES.find(r => r.value === selectedDateRange)?.name
                }
              </span></div>
              <div>Outlets: <span className="font-medium">
                {selectedOutlets.length === 0 ? '1 outlet' : `${selectedOutlets.length} outlets`}
                {includeComparison && ' (with comparison)'}
              </span></div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={!canGenerate || isGenerating}
            className={`
              flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200
              ${canGenerate && !isGenerating
                ? 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
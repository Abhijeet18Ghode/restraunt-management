'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { analyticsService } from '../services/analyticsService';
import ReportGenerator from '../components/Analytics/ReportGenerator';
import ComparativeAnalysis from '../components/Analytics/ComparativeAnalysis';
import ExportManager from '../components/Analytics/ExportManager';
import { 
  BarChart3, 
  TrendingUp, 
  Download,
  FileText,
  Building2,
  Calendar,
  Filter
} from 'lucide-react';

const TABS = [
  {
    id: 'reports',
    name: 'Report Generator',
    icon: FileText,
    description: 'Generate comprehensive business reports'
  },
  {
    id: 'comparison',
    name: 'Comparative Analysis',
    icon: TrendingUp,
    description: 'Compare performance across outlets'
  },
  {
    id: 'exports',
    name: 'Export Manager',
    icon: Download,
    description: 'Manage and download exported reports'
  }
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('reports');
  const [outlets, setOutlets] = useState([]);
  const [exports, setExports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { selectedOutlet, tenant } = useTenant();

  useEffect(() => {
    loadInitialData();
  }, [tenant]);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load outlets data
      if (tenant?.outlets) {
        setOutlets(tenant.outlets);
      }

      // Load existing exports
      await loadExports();
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Error loading analytics data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExports = async () => {
    try {
      // Mock export data - in real implementation, this would come from the backend
      const mockExports = [
        {
          id: '1',
          name: 'Sales Report - December 2024',
          type: 'sales',
          format: 'pdf',
          status: 'completed',
          fileSize: 2048576,
          createdAt: '2024-12-15T10:30:00Z',
          description: 'Monthly sales performance report',
          downloadUrl: '/api/exports/1/download',
          previewUrl: '/api/exports/1/preview'
        },
        {
          id: '2',
          name: 'Menu Performance Analysis',
          type: 'menu',
          format: 'excel',
          status: 'processing',
          progress: 75,
          createdAt: '2024-12-15T11:00:00Z',
          description: 'Detailed menu item performance analysis'
        },
        {
          id: '3',
          name: 'Customer Analytics Report',
          type: 'customer',
          format: 'csv',
          status: 'failed',
          error: 'Insufficient data for the selected period',
          createdAt: '2024-12-15T09:15:00Z',
          description: 'Customer behavior and loyalty analysis'
        }
      ];
      
      setExports(mockExports);
    } catch (err) {
      console.error('Error loading exports:', err);
    }
  };

  const handleGenerateReport = async (reportConfig) => {
    try {
      // Create new export entry
      const newExport = {
        id: Date.now().toString(),
        name: `${reportConfig.type.charAt(0).toUpperCase() + reportConfig.type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
        type: reportConfig.type,
        format: reportConfig.format,
        status: 'processing',
        progress: 0,
        createdAt: new Date().toISOString(),
        description: `Generated report for ${reportConfig.outlets.length} outlet(s)`
      };

      setExports(prev => [newExport, ...prev]);

      // Simulate report generation process
      const updateProgress = (progress) => {
        setExports(prev => prev.map(exp => 
          exp.id === newExport.id 
            ? { ...exp, progress }
            : exp
        ));
      };

      // Simulate progress updates
      setTimeout(() => updateProgress(25), 500);
      setTimeout(() => updateProgress(50), 1000);
      setTimeout(() => updateProgress(75), 1500);
      setTimeout(() => {
        setExports(prev => prev.map(exp => 
          exp.id === newExport.id 
            ? { 
                ...exp, 
                status: 'completed',
                progress: 100,
                fileSize: Math.floor(Math.random() * 5000000) + 1000000,
                downloadUrl: `/api/exports/${newExport.id}/download`,
                previewUrl: `/api/exports/${newExport.id}/preview`
              }
            : exp
        ));
      }, 2000);

      // In real implementation, this would call the analytics service
      // await analyticsService.generateReport(reportConfig);
      
    } catch (err) {
      console.error('Error generating report:', err);
      // Update export status to failed
      setExports(prev => prev.map(exp => 
        exp.id === newExport.id 
          ? { ...exp, status: 'failed', error: 'Report generation failed' }
          : exp
      ));
    }
  };

  const handleDownloadExport = (exportItem) => {
    // In real implementation, this would trigger the actual download
    console.log('Downloading export:', exportItem);
    
    // Simulate download
    const link = document.createElement('a');
    link.href = exportItem.downloadUrl;
    link.download = `${exportItem.name}.${exportItem.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteExport = (exportId) => {
    setExports(prev => prev.filter(exp => exp.id !== exportId));
  };

  const handleRetryExport = (exportItem) => {
    setExports(prev => prev.map(exp => 
      exp.id === exportItem.id 
        ? { ...exp, status: 'processing', progress: 0, error: null }
        : exp
    ));

    // Simulate retry process
    setTimeout(() => {
      setExports(prev => prev.map(exp => 
        exp.id === exportItem.id 
          ? { 
              ...exp, 
              status: 'completed',
              fileSize: Math.floor(Math.random() * 5000000) + 1000000,
              downloadUrl: `/api/exports/${exportItem.id}/download`,
              previewUrl: `/api/exports/${exportItem.id}/preview`
            }
          : exp
      ));
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadInitialData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
              <p className="text-gray-600">Generate comprehensive reports and analyze business performance</p>
            </div>
          </div>

          {/* Current Context */}
          {selectedOutlet && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Building2 className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-900">
                  Current Outlet: {selectedOutlet.name}
                </span>
                <span className="text-sm text-blue-700 ml-2">
                  ({selectedOutlet.address})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                      ${activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    <div className="text-left">
                      <div>{tab.name}</div>
                      <div className="text-xs text-gray-500 font-normal">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'reports' && (
            <ReportGenerator
              outlets={outlets}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'comparison' && (
            <ComparativeAnalysis
              outlets={outlets}
              analyticsService={analyticsService}
            />
          )}

          {activeTab === 'exports' && (
            <ExportManager
              exports={exports}
              onDownload={handleDownloadExport}
              onDelete={handleDeleteExport}
              onRetry={handleRetryExport}
            />
          )}
        </div>
      </div>
    </div>
  );
}
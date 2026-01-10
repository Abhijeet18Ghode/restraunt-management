'use client';

import { useState } from 'react';
import { 
  Download, 
  FileText, 
  Calendar, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Eye
} from 'lucide-react';

const EXPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

const STATUS_CONFIG = {
  [EXPORT_STATUS.PENDING]: {
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  [EXPORT_STATUS.PROCESSING]: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  [EXPORT_STATUS.COMPLETED]: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  [EXPORT_STATUS.FAILED]: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

export default function ExportManager({ exports = [], onDownload, onDelete, onRetry }) {
  const [selectedExports, setSelectedExports] = useState([]);

  const handleSelectAll = () => {
    if (selectedExports.length === exports.length) {
      setSelectedExports([]);
    } else {
      setSelectedExports(exports.map(exp => exp.id));
    }
  };

  const handleSelectExport = (exportId) => {
    setSelectedExports(prev => 
      prev.includes(exportId)
        ? prev.filter(id => id !== exportId)
        : [...prev, exportId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedExports.length > 0 && onDelete) {
      selectedExports.forEach(exportId => onDelete(exportId));
      setSelectedExports([]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG[EXPORT_STATUS.PENDING];
  };

  const completedExports = exports.filter(exp => exp.status === EXPORT_STATUS.COMPLETED);
  const processingExports = exports.filter(exp => 
    exp.status === EXPORT_STATUS.PENDING || exp.status === EXPORT_STATUS.PROCESSING
  );
  const failedExports = exports.filter(exp => exp.status === EXPORT_STATUS.FAILED);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Download className="h-6 w-6 text-gray-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Export Manager</h3>
              <p className="text-sm text-gray-600">Manage and download your exported reports</p>
            </div>
          </div>
          
          {selectedExports.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete Selected ({selectedExports.length})
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {exports.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exports yet</h3>
            <p className="text-gray-600">Generate your first report to see it here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-green-900">Completed</div>
                    <div className="text-lg font-semibold text-green-700">{completedExports.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Processing</div>
                    <div className="text-lg font-semibold text-blue-700">{processingExports.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <XCircle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-red-900">Failed</div>
                    <div className="text-lg font-semibold text-red-700">{failedExports.length}</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-600 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Total</div>
                    <div className="text-lg font-semibold text-gray-700">{exports.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Export List */}
            <div className="overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">Recent Exports</h4>
                <label className="flex items-center text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedExports.length === exports.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-2"
                  />
                  Select All
                </label>
              </div>

              <div className="space-y-3">
                {exports.map((exportItem) => {
                  const statusConfig = getStatusConfig(exportItem.status);
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <div
                      key={exportItem.id}
                      className={`
                        border rounded-lg p-4 transition-all duration-200
                        ${selectedExports.includes(exportItem.id) 
                          ? 'border-primary-300 bg-primary-50' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedExports.includes(exportItem.id)}
                            onChange={() => handleSelectExport(exportItem.id)}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                          />
                          
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h5 className="text-sm font-medium text-gray-900 mr-3">
                                {exportItem.name}
                              </h5>
                              <div className={`
                                flex items-center px-2 py-1 rounded-full text-xs font-medium
                                ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor} border
                              `}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {exportItem.status.charAt(0).toUpperCase() + exportItem.status.slice(1)}
                              </div>
                            </div>
                            
                            <div className="mt-1 text-xs text-gray-500 space-x-4">
                              <span>Type: {exportItem.type}</span>
                              <span>Format: {exportItem.format.toUpperCase()}</span>
                              {exportItem.fileSize && (
                                <span>Size: {formatFileSize(exportItem.fileSize)}</span>
                              )}
                              <span>Created: {formatDate(exportItem.createdAt)}</span>
                            </div>
                            
                            {exportItem.description && (
                              <p className="mt-1 text-xs text-gray-600">{exportItem.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {exportItem.status === EXPORT_STATUS.COMPLETED && (
                            <>
                              <button
                                onClick={() => onDownload && onDownload(exportItem)}
                                className="flex items-center px-3 py-1 text-xs text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors duration-200"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </button>
                              <button
                                onClick={() => window.open(exportItem.previewUrl, '_blank')}
                                className="flex items-center px-3 py-1 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors duration-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Preview
                              </button>
                            </>
                          )}
                          
                          {exportItem.status === EXPORT_STATUS.FAILED && (
                            <button
                              onClick={() => onRetry && onRetry(exportItem)}
                              className="flex items-center px-3 py-1 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors duration-200"
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Retry
                            </button>
                          )}
                          
                          {exportItem.status === EXPORT_STATUS.PROCESSING && (
                            <div className="flex items-center px-3 py-1 text-xs text-blue-600">
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                              {exportItem.progress ? `${exportItem.progress}%` : 'Processing...'}
                            </div>
                          )}
                          
                          <button
                            onClick={() => onDelete && onDelete(exportItem.id)}
                            className="flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      
                      {exportItem.error && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                          <strong>Error:</strong> {exportItem.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
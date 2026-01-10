'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { 
  DollarSign, 
  Clock, 
  Calculator, 
  Download, 
  Eye, 
  User,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText
} from 'lucide-react';

const PayrollCalculator = ({ outletId = null }) => {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  useEffect(() => {
    loadData();
  }, [outletId, selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [payrollResponse, staffResponse] = await Promise.all([
        staffService.getPayrollRecords(outletId, selectedPeriod),
        staffService.getStaffMembers(outletId, null, 'active')
      ]);

      setPayrollRecords(payrollResponse.data || []);
      setStaffMembers(staffResponse.data || []);
    } catch (err) {
      setError('Failed to load payroll data');
      console.error('Payroll loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async (staffId = null) => {
    try {
      setCalculating(true);
      
      if (staffId) {
        // Calculate for specific staff member
        await staffService.calculatePayroll(staffId, selectedPeriod);
      } else {
        // Calculate for all staff members
        const calculatePromises = staffMembers.map(staff => 
          staffService.calculatePayroll(staff.id, selectedPeriod)
        );
        await Promise.all(calculatePromises);
      }
      
      await loadData();
    } catch (err) {
      setError('Failed to calculate payroll');
      console.error('Payroll calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleProcessPayroll = async (payrollData) => {
    try {
      await staffService.processPayroll(payrollData);
      await loadData();
    } catch (err) {
      setError('Failed to process payroll');
      console.error('Payroll processing error:', err);
    }
  };

  const handleExportPayroll = async () => {
    try {
      const reportData = await staffService.exportStaffReport('payroll', {
        outletId,
        ...selectedPeriod
      });
      
      // Create download link
      const blob = new Blob([reportData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payroll-${selectedPeriod.startDate}-to-${selectedPeriod.endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export payroll report');
      console.error('Export error:', err);
    }
  };

  const getStaffName = (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';
  };

  const getStaffRole = (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff ? staff.role : 'Unknown';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatHours = (hours) => {
    return `${(hours || 0).toFixed(1)}h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'calculated': return 'text-blue-600 bg-blue-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'processed': return 'text-purple-600 bg-purple-50';
      case 'paid': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'calculated': return 'Calculated';
      case 'approved': return 'Approved';
      case 'processed': return 'Processed';
      case 'paid': return 'Paid';
      default: return 'Pending';
    }
  };

  const calculateTotals = () => {
    const filteredRecords = selectedStaff === 'all' 
      ? payrollRecords 
      : payrollRecords.filter(record => record.staffId === selectedStaff);

    return {
      totalGrossPay: filteredRecords.reduce((sum, record) => sum + (record.grossPay || 0), 0),
      totalNetPay: filteredRecords.reduce((sum, record) => sum + (record.netPay || 0), 0),
      totalHours: filteredRecords.reduce((sum, record) => sum + (record.totalHours || 0), 0),
      totalDeductions: filteredRecords.reduce((sum, record) => sum + (record.totalDeductions || 0), 0),
      recordCount: filteredRecords.length
    };
  };

  const filteredPayrollRecords = selectedStaff === 'all' 
    ? payrollRecords 
    : payrollRecords.filter(record => record.staffId === selectedStaff);

  const totals = calculateTotals();

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
        <h2 className="text-2xl font-bold text-gray-900">Payroll Calculator</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExportPayroll}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => handleCalculatePayroll()}
            disabled={calculating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Calculating...' : 'Calculate All'}</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Period Start
            </label>
            <input
              type="date"
              value={selectedPeriod.startDate}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Period End
            </label>
            <input
              type="date"
              value={selectedPeriod.endDate}
              onChange={(e) => setSelectedPeriod(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff Member
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Staff</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total Gross Pay</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalGrossPay)}</div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total Net Pay</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.totalNetPay)}</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total Hours</div>
              <div className="text-2xl font-bold text-gray-900">{formatHours(totals.totalHours)}</div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Staff Count</div>
              <div className="text-2xl font-bold text-gray-900">{totals.recordCount}</div>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Payroll Records */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payroll Records</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayrollRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getStaffName(record.staffId)}
                        </div>
                        <div className="text-sm text-gray-500">{getStaffRole(record.staffId)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>
                        {new Date(record.startDate).toLocaleDateString()} - {new Date(record.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{formatHours(record.totalHours)}</span>
                    </div>
                    {record.overtimeHours > 0 && (
                      <div className="text-xs text-orange-600">
                        +{formatHours(record.overtimeHours)} OT
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.grossPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(record.totalDeductions)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(record.netPay)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPayroll(record);
                          setShowDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      {record.status === 'calculated' && (
                        <button
                          onClick={() => handleProcessPayroll(record)}
                          className="text-green-600 hover:text-green-900 flex items-center space-x-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Process</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayrollRecords.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">No payroll records found</div>
            <button
              onClick={() => handleCalculatePayroll()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Calculate Payroll
            </button>
          </div>
        )}
      </div>

      {/* Payroll Details Modal */}
      {showDetailsModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Payroll Details - {getStaffName(selectedPayroll.staffId)}
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPayroll(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Staff Member</label>
                  <div className="text-sm text-gray-900">{getStaffName(selectedPayroll.staffId)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <div className="text-sm text-gray-900">{getStaffRole(selectedPayroll.staffId)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pay Period</label>
                  <div className="text-sm text-gray-900">
                    {new Date(selectedPayroll.startDate).toLocaleDateString()} - {new Date(selectedPayroll.endDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayroll.status)}`}>
                    {getStatusText(selectedPayroll.status)}
                  </span>
                </div>
              </div>

              {/* Hours Breakdown */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Hours Breakdown</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm font-medium text-gray-700">Regular Hours</div>
                    <div className="text-lg font-semibold text-gray-900">{formatHours(selectedPayroll.regularHours)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm font-medium text-gray-700">Overtime Hours</div>
                    <div className="text-lg font-semibold text-orange-600">{formatHours(selectedPayroll.overtimeHours)}</div>
                  </div>
                </div>
              </div>

              {/* Pay Breakdown */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Pay Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Regular Pay ({formatHours(selectedPayroll.regularHours)} × {formatCurrency(selectedPayroll.hourlyRate)})</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.regularPay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Overtime Pay ({formatHours(selectedPayroll.overtimeHours)} × {formatCurrency(selectedPayroll.overtimeRate)})</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.overtimePay)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bonuses</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.bonuses)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">Gross Pay</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(selectedPayroll.grossPay)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">Deductions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Federal Tax</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.federalTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">State Tax</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.stateTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Social Security</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.socialSecurity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Medicare</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.medicare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Other Deductions</span>
                    <span className="text-sm font-medium">{formatCurrency(selectedPayroll.otherDeductions)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-gray-900">Total Deductions</span>
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(selectedPayroll.totalDeductions)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-green-800">Net Pay</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(selectedPayroll.netPay)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPayroll(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {/* Handle print/export individual payslip */}}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Print Payslip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollCalculator;
'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { Clock, Calendar, User, MapPin, Coffee, CheckCircle, XCircle } from 'lucide-react';

const AttendanceTracker = ({ outletId = null }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [viewType, setViewType] = useState('daily');

  useEffect(() => {
    loadData();
  }, [outletId, selectedDate, selectedStaff, viewType]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange();
      const [attendanceResponse, staffResponse] = await Promise.all([
        staffService.getAttendanceRecords(
          selectedStaff === 'all' ? null : selectedStaff,
          outletId,
          dateRange
        ),
        staffService.getStaffMembers(outletId, null, 'active')
      ]);

      setAttendanceRecords(attendanceResponse.data || []);
      setStaffMembers(staffResponse.data || []);
    } catch (err) {
      setError('Failed to load attendance data');
      console.error('Attendance loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const date = new Date(selectedDate);
    
    if (viewType === 'daily') {
      return {
        startDate: selectedDate,
        endDate: selectedDate
      };
    } else if (viewType === 'weekly') {
      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() - date.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    } else {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  };

  const handleClockIn = async (staffId) => {
    try {
      await staffService.clockIn(staffId, outletId);
      await loadData();
    } catch (err) {
      setError('Failed to clock in');
      console.error('Clock in error:', err);
    }
  };

  const handleClockOut = async (staffId) => {
    try {
      await staffService.clockOut(staffId, outletId);
      await loadData();
    } catch (err) {
      setError('Failed to clock out');
      console.error('Clock out error:', err);
    }
  };

  const handleAddBreak = async (staffId, breakType, duration) => {
    try {
      await staffService.addBreak(staffId, breakType, duration);
      await loadData();
    } catch (err) {
      setError('Failed to add break');
      console.error('Add break error:', err);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getAttendanceStatus = (record) => {
    if (!record.clockInTime) return 'not_started';
    if (record.clockInTime && !record.clockOutTime) return 'active';
    if (record.clockInTime && record.clockOutTime) return 'completed';
    return 'unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'completed': return 'text-blue-600 bg-blue-50';
      case 'not_started': return 'text-gray-600 bg-gray-50';
      case 'late': return 'text-red-600 bg-red-50';
      case 'early_leave': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      case 'not_started': return 'Not Started';
      case 'late': return 'Late';
      case 'early_leave': return 'Early Leave';
      default: return 'Unknown';
    }
  };

  const calculateTotalHours = (records) => {
    return records.reduce((total, record) => {
      return total + (record.totalHours || 0);
    }, 0);
  };

  const groupRecordsByStaff = () => {
    const grouped = {};
    attendanceRecords.forEach(record => {
      if (!grouped[record.staffId]) {
        grouped[record.staffId] = [];
      }
      grouped[record.staffId].push(record);
    });
    return grouped;
  };

  const groupedRecords = groupRecordsByStaff();

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
        <h2 className="text-2xl font-bold text-gray-900">Attendance Tracking</h2>
        <div className="flex space-x-3">
          <button
            onClick={loadData}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              View Type
            </label>
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
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
              onClick={() => {/* Handle export */}}
              className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Staff</div>
          <div className="text-2xl font-bold text-gray-900">{staffMembers.length}</div>
          <div className="text-sm text-gray-500">Active employees</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Present Today</div>
          <div className="text-2xl font-bold text-green-600">
            {Object.keys(groupedRecords).length}
          </div>
          <div className="text-sm text-gray-500">
            {((Object.keys(groupedRecords).length / staffMembers.length) * 100).toFixed(1)}% attendance
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold text-blue-600">
            {formatDuration(calculateTotalHours(attendanceRecords) * 60)}
          </div>
          <div className="text-sm text-gray-500">Worked today</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="text-sm font-medium text-gray-500">Late Arrivals</div>
          <div className="text-2xl font-bold text-red-600">
            {attendanceRecords.filter(r => r.status === 'late').length}
          </div>
          <div className="text-sm text-gray-500">Staff members</div>
        </div>
      </div>

      {/* Attendance Records */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Attendance Records</h3>
        </div>
        
        {viewType === 'daily' ? (
          /* Daily View - Staff Cards */
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staffMembers.map((staff) => {
                const staffRecords = groupedRecords[staff.id] || [];
                const todayRecord = staffRecords.find(r => 
                  new Date(r.date).toDateString() === new Date(selectedDate).toDateString()
                );
                const status = todayRecord ? getAttendanceStatus(todayRecord) : 'not_started';
                
                return (
                  <div key={staff.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {staff.firstName} {staff.lastName}
                          </h4>
                          <p className="text-sm text-gray-500">{staff.role}</p>
                        </div>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                        {getStatusText(status)}
                      </span>
                    </div>
                    
                    {todayRecord ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Clock In:</span>
                          <span className="font-medium">{formatTime(todayRecord.clockInTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Clock Out:</span>
                          <span className="font-medium">{formatTime(todayRecord.clockOutTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Total Hours:</span>
                          <span className="font-medium">{formatDuration((todayRecord.totalHours || 0) * 60)}</span>
                        </div>
                        {todayRecord.breaks && todayRecord.breaks.length > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Breaks:</span>
                            <span className="font-medium">{todayRecord.breaks.length}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No attendance record for today
                      </div>
                    )}
                    
                    <div className="mt-4 flex space-x-2">
                      {status === 'not_started' && (
                        <button
                          onClick={() => handleClockIn(staff.id)}
                          className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center space-x-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Clock In</span>
                        </button>
                      )}
                      {status === 'active' && (
                        <>
                          <button
                            onClick={() => handleClockOut(staff.id)}
                            className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-1"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Clock Out</span>
                          </button>
                          <button
                            onClick={() => handleAddBreak(staff.id, 'lunch', 30)}
                            className="flex-1 bg-yellow-50 text-yellow-600 px-3 py-2 rounded text-sm font-medium hover:bg-yellow-100 transition-colors flex items-center justify-center space-x-1"
                          >
                            <Coffee className="w-4 h-4" />
                            <span>Break</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Weekly/Monthly View - Table */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clock Out
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => {
                  const staff = staffMembers.find(s => s.id === record.staffId);
                  const status = getAttendanceStatus(record);
                  
                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {staff?.firstName} {staff?.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{staff?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.clockInTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.clockOutTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration((record.totalHours || 0) * 60)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;
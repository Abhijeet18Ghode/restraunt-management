'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { 
  Calendar, 
  Clock, 
  User, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle
} from 'lucide-react';

const ScheduleManager = ({ outletId = null }) => {
  const [schedules, setSchedules] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState('week'); // 'week' or 'month'
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('all');

  const [formData, setFormData] = useState({
    staffId: '',
    date: '',
    startTime: '',
    endTime: '',
    position: '',
    notes: '',
    isRecurring: false,
    recurringDays: [],
    recurringEndDate: ''
  });

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const positions = ['Server', 'Cook', 'Cashier', 'Manager', 'Host', 'Cleaner', 'Bartender'];

  useEffect(() => {
    loadData();
  }, [outletId, currentDate, selectedStaff]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const dateRange = getDateRange();
      const [schedulesResponse, staffResponse] = await Promise.all([
        staffService.getSchedules(
          outletId,
          selectedStaff === 'all' ? null : selectedStaff,
          dateRange
        ),
        staffService.getStaffMembers(outletId, null, 'active')
      ]);

      setSchedules(schedulesResponse.data || []);
      setStaffMembers(staffResponse.data || []);
    } catch (err) {
      setError('Failed to load schedule data');
      console.error('Schedule loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    if (viewType === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      };
    } else {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0]
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await staffService.updateSchedule(editingSchedule.id, formData);
      } else {
        if (formData.isRecurring) {
          // Create recurring schedules
          const startDate = new Date(formData.date);
          const endDate = new Date(formData.recurringEndDate);
          const schedulePromises = [];

          for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();
            if (formData.recurringDays.includes(dayOfWeek)) {
              schedulePromises.push(
                staffService.createSchedule({
                  ...formData,
                  date: date.toISOString().split('T')[0],
                  isRecurring: false
                })
              );
            }
          }
          
          await Promise.all(schedulePromises);
        } else {
          await staffService.createSchedule(formData);
        }
      }
      
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(editingSchedule ? 'Failed to update schedule' : 'Failed to create schedule');
      console.error('Schedule save error:', err);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      staffId: schedule.staffId || '',
      date: schedule.date ? new Date(schedule.date).toISOString().split('T')[0] : '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      position: schedule.position || '',
      notes: schedule.notes || '',
      isRecurring: false,
      recurringDays: [],
      recurringEndDate: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await staffService.deleteSchedule(scheduleId);
      await loadData();
    } catch (err) {
      setError('Failed to delete schedule');
      console.error('Schedule delete error:', err);
    }
  };

  const handleCopy = (schedule) => {
    setFormData({
      staffId: schedule.staffId || '',
      date: '',
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      position: schedule.position || '',
      notes: schedule.notes || '',
      isRecurring: false,
      recurringDays: [],
      recurringEndDate: ''
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSchedule(null);
    setFormData({
      staffId: '',
      date: '',
      startTime: '',
      endTime: '',
      position: '',
      notes: '',
      isRecurring: false,
      recurringDays: [],
      recurringEndDate: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRecurringDayToggle = (dayIndex) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: prev.recurringDays.includes(dayIndex)
        ? prev.recurringDays.filter(d => d !== dayIndex)
        : [...prev.recurringDays, dayIndex]
    }));
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewType === 'week') {
      newDate.setDate(currentDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(currentDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateHours = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end - start) / (1000 * 60 * 60);
  };

  const getSchedulesForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return schedules.filter(schedule => 
      schedule.date && schedule.date.split('T')[0] === dateString
    );
  };

  const getStaffName = (staffId) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff ? `${staff.firstName} ${staff.lastName}` : 'Unknown';
  };

  const getPositionColor = (position) => {
    const colors = {
      'Server': 'bg-blue-100 text-blue-800',
      'Cook': 'bg-orange-100 text-orange-800',
      'Cashier': 'bg-green-100 text-green-800',
      'Manager': 'bg-purple-100 text-purple-800',
      'Host': 'bg-pink-100 text-pink-800',
      'Cleaner': 'bg-gray-100 text-gray-800',
      'Bartender': 'bg-yellow-100 text-yellow-800'
    };
    return colors[position] || 'bg-gray-100 text-gray-800';
  };

  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="grid grid-cols-8 border-b">
          <div className="p-4 bg-gray-50 font-medium text-gray-900">Staff</div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-4 bg-gray-50 text-center">
              <div className="font-medium text-gray-900">{daysOfWeek[day.getDay()]}</div>
              <div className="text-sm text-gray-500">{day.getDate()}</div>
            </div>
          ))}
        </div>
        
        {staffMembers.map((staff) => (
          <div key={staff.id} className="grid grid-cols-8 border-b hover:bg-gray-50">
            <div className="p-4 border-r">
              <div className="font-medium text-gray-900">
                {staff.firstName} {staff.lastName}
              </div>
              <div className="text-sm text-gray-500">{staff.role}</div>
            </div>
            
            {weekDays.map((day, dayIndex) => {
              const daySchedules = getSchedulesForDate(day).filter(s => s.staffId === staff.id);
              
              return (
                <div key={dayIndex} className="p-2 border-r min-h-[80px]">
                  {daySchedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`mb-1 p-2 rounded text-xs ${getPositionColor(schedule.position)}`}
                    >
                      <div className="font-medium">{schedule.position}</div>
                      <div>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</div>
                      <div className="flex space-x-1 mt-1">
                        <button
                          onClick={() => handleEdit(schedule)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleCopy(schedule)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderMonthView = () => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const weeks = [];
    let currentWeek = [];
    
    for (let date = new Date(startDate); date <= endOfMonth || currentWeek.length < 7; date.setDate(date.getDate() + 1)) {
      currentWeek.push(new Date(date));
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {daysOfWeek.map((day) => (
            <div key={day} className="p-4 bg-gray-50 text-center font-medium text-gray-900">
              {day}
            </div>
          ))}
        </div>
        
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7">
            {week.map((day, dayIndex) => {
              const daySchedules = getSchedulesForDate(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              
              return (
                <div
                  key={dayIndex}
                  className={`p-2 border-r border-b min-h-[120px] ${
                    isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {daySchedules.slice(0, 3).map((schedule) => (
                      <div
                        key={schedule.id}
                        className={`text-xs p-1 rounded ${getPositionColor(schedule.position)}`}
                      >
                        <div className="font-medium">{getStaffName(schedule.staffId)}</div>
                        <div>{formatTime(schedule.startTime)}</div>
                      </div>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{daySchedules.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
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
        <h2 className="text-2xl font-bold text-gray-900">Schedule Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate(-1)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900">
                {viewType === 'week' 
                  ? `Week of ${currentDate.toLocaleDateString()}`
                  : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                }
              </h3>
              <button
                onClick={() => navigateDate(1)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Staff</option>
              {staffMembers.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName}
                </option>
              ))}
            </select>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewType('week')}
                className={`px-3 py-1 text-sm rounded ${
                  viewType === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewType('month')}
                className={`px-3 py-1 text-sm rounded ${
                  viewType === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule View */}
      {viewType === 'week' ? renderWeekView() : renderMonthView()}

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Staff Member
                  </label>
                  <select
                    value={formData.staffId}
                    onChange={(e) => handleInputChange('staffId', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Staff Member</option>
                    {staffMembers.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.firstName} {staff.lastName} - {staff.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Position</option>
                    {positions.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    required={!formData.isRecurring}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Recurring Schedule</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {formData.isRecurring && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recurring Days
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day, index) => (
                        <label key={index} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.recurringDays.includes(index)}
                            onChange={() => handleRecurringDayToggle(index)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date for Recurring
                    </label>
                    <input
                      type="date"
                      value={formData.recurringEndDate}
                      onChange={(e) => handleInputChange('recurringEndDate', e.target.value)}
                      required={formData.isRecurring}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional notes or instructions..."
                />
              </div>

              {formData.startTime && formData.endTime && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Total Hours:</strong> {calculateHours(formData.startTime, formData.endTime).toFixed(1)} hours
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;
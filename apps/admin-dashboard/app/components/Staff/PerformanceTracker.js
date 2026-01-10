'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import { 
  TrendingUp, 
  TrendingDown, 
  Star, 
  Clock, 
  DollarSign, 
  Users, 
  Award,
  Calendar,
  BarChart3,
  Target,
  MessageSquare
} from 'lucide-react';

const PerformanceTracker = ({ outletId = null }) => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [performanceData, setPerformanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStaffForReview, setSelectedStaffForReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comments: '',
    goals: '',
    strengths: '',
    improvements: ''
  });

  useEffect(() => {
    loadData();
  }, [outletId, selectedStaff, dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load staff members
      const staffResponse = await staffService.getStaffMembers(outletId, null, 'active');
      const staff = staffResponse.data || [];
      setStaffMembers(staff);

      // Load performance data for each staff member
      const performancePromises = staff.map(async (member) => {
        try {
          const performance = await staffService.getPerformanceMetrics(member.id, dateRange);
          return { staffId: member.id, data: performance.data };
        } catch (err) {
          console.error(`Failed to load performance for staff ${member.id}:`, err);
          return { staffId: member.id, data: null };
        }
      });

      const performanceResults = await Promise.all(performancePromises);
      const performanceMap = {};
      performanceResults.forEach(result => {
        performanceMap[result.staffId] = result.data;
      });
      
      setPerformanceData(performanceMap);
    } catch (err) {
      setError('Failed to load performance data');
      console.error('Performance loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!selectedStaffForReview) return;
    
    try {
      await staffService.addPerformanceReview(selectedStaffForReview.id, {
        ...reviewForm,
        reviewDate: new Date().toISOString(),
        reviewerId: 'current-user', // This should come from auth context
        period: dateRange
      });
      
      await loadData();
      setShowReviewModal(false);
      setSelectedStaffForReview(null);
      setReviewForm({
        rating: 5,
        comments: '',
        goals: '',
        strengths: '',
        improvements: ''
      });
    } catch (err) {
      setError('Failed to add performance review');
      console.error('Review add error:', err);
    }
  };

  const getPerformanceMetrics = (staffId) => {
    const data = performanceData[staffId];
    if (!data) {
      return {
        totalSales: 0,
        averageOrderValue: 0,
        customerRating: 0,
        hoursWorked: 0,
        ordersProcessed: 0,
        efficiency: 0,
        punctuality: 0,
        customerComplaints: 0
      };
    }
    return data;
  };

  const getPerformanceRating = (metrics) => {
    // Calculate overall performance rating based on various metrics
    const factors = [
      Math.min(metrics.customerRating / 5, 1) * 0.3, // Customer rating (30%)
      Math.min(metrics.efficiency / 100, 1) * 0.25, // Efficiency (25%)
      Math.min(metrics.punctuality / 100, 1) * 0.2, // Punctuality (20%)
      Math.min((metrics.totalSales / 1000), 1) * 0.15, // Sales performance (15%)
      Math.max(0, 1 - (metrics.customerComplaints / 10)) * 0.1 // Complaints (10%, inverted)
    ];
    
    const rating = factors.reduce((sum, factor) => sum + factor, 0) * 5;
    return Math.min(Math.max(rating, 1), 5);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-50';
    if (rating >= 3.5) return 'text-blue-600 bg-blue-50';
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredStaffMembers = selectedStaff === 'all' 
    ? staffMembers 
    : staffMembers.filter(staff => staff.id === selectedStaff);

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
        <h2 className="text-2xl font-bold text-gray-900">Performance Tracking</h2>
        <button
          onClick={() => setShowReviewModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Review
        </button>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
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
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredStaffMembers.map((staff) => {
          const metrics = getPerformanceMetrics(staff.id);
          const overallRating = getPerformanceRating(metrics);
          
          return (
            <div key={staff.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {staff.firstName} {staff.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">{staff.role}</p>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${getRatingColor(overallRating)}`}>
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">{overallRating.toFixed(1)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span>Total Sales</span>
                  </div>
                  <span className="font-medium">{formatCurrency(metrics.totalSales)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <BarChart3 className="w-4 h-4" />
                    <span>Orders Processed</span>
                  </div>
                  <span className="font-medium">{metrics.ordersProcessed}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Hours Worked</span>
                  </div>
                  <span className="font-medium">{metrics.hoursWorked}h</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Target className="w-4 h-4" />
                    <span>Efficiency</span>
                  </div>
                  <span className="font-medium">{metrics.efficiency}%</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>Customer Rating</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="font-medium">{metrics.customerRating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedStaffForReview(staff);
                    setShowReviewModal(true);
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  Add Review
                </button>
                <button
                  onClick={() => {/* Handle view details */}}
                  className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Trends */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {staffMembers.filter(staff => getPerformanceRating(getPerformanceMetrics(staff.id)) >= 4).length}
            </div>
            <div className="text-sm text-gray-500">High Performers</div>
            <div className="flex items-center justify-center mt-1">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {staffMembers.filter(staff => {
                const rating = getPerformanceRating(getPerformanceMetrics(staff.id));
                return rating >= 2.5 && rating < 4;
              }).length}
            </div>
            <div className="text-sm text-gray-500">Average Performers</div>
            <div className="flex items-center justify-center mt-1">
              <BarChart3 className="w-4 h-4 text-yellow-600" />
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {staffMembers.filter(staff => getPerformanceRating(getPerformanceMetrics(staff.id)) < 2.5).length}
            </div>
            <div className="text-sm text-gray-500">Needs Improvement</div>
            <div className="flex items-center justify-center mt-1">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Performance Review
                {selectedStaffForReview && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    for {selectedStaffForReview.firstName} {selectedStaffForReview.lastName}
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedStaffForReview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Rating
                </label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Below Average</option>
                  <option value={1}>1 - Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strengths
                </label>
                <textarea
                  value={reviewForm.strengths}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, strengths: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What does this employee do well?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Areas for Improvement
                </label>
                <textarea
                  value={reviewForm.improvements}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, improvements: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What areas need improvement?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goals for Next Period
                </label>
                <textarea
                  value={reviewForm.goals}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, goals: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What goals should be set for the next review period?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Comments
                </label>
                <textarea
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, comments: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any additional comments or feedback..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedStaffForReview(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddReview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceTracker;
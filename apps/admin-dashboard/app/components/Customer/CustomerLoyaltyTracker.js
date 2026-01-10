'use client';

import { useState, useEffect } from 'react';
import CustomerService from '../../services/customerService';
import CustomerSearch from './CustomerSearch';
import { 
  Star, 
  Gift, 
  TrendingUp, 
  Award, 
  Plus, 
  Minus,
  History,
  Crown,
  Heart,
  Calendar,
  DollarSign,
  Target,
  Zap
} from 'lucide-react';

const CustomerLoyaltyTracker = ({ outletId = null }) => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState([]);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAddPointsModal, setShowAddPointsModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [selectedReward, setSelectedReward] = useState(null);

  const customerService = new CustomerService();

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerLoyalty();
    }
  }, [selectedCustomer]);

  const loadCustomerLoyalty = async () => {
    if (!selectedCustomer) return;
    
    try {
      setLoading(true);
      const response = await customerService.getCustomerLoyalty(selectedCustomer.id);
      setLoyaltyData(response.data);
      setLoyaltyHistory(response.data?.history || []);
      setAvailableRewards(response.data?.availableRewards || []);
    } catch (err) {
      setError('Failed to load customer loyalty data');
      console.error('Loyalty data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPoints = async () => {
    if (!selectedCustomer || !pointsToAdd || !pointsReason) return;
    
    try {
      await customerService.addLoyaltyPoints(
        selectedCustomer.id, 
        parseInt(pointsToAdd), 
        pointsReason
      );
      
      await loadCustomerLoyalty();
      setShowAddPointsModal(false);
      setPointsToAdd('');
      setPointsReason('');
    } catch (err) {
      setError('Failed to add loyalty points');
      console.error('Add points error:', err);
    }
  };

  const handleRedeemPoints = async (reward) => {
    if (!selectedCustomer || !reward) return;
    
    try {
      await customerService.redeemLoyaltyPoints(
        selectedCustomer.id, 
        reward.pointsCost, 
        null // orderId - can be null for manual redemption
      );
      
      await loadCustomerLoyalty();
      setShowRedeemModal(false);
      setSelectedReward(null);
    } catch (err) {
      setError('Failed to redeem loyalty points');
      console.error('Redeem points error:', err);
    }
  };

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'silver': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'bronze': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return <Crown className="w-5 h-5" />;
      case 'gold': return <Award className="w-5 h-5" />;
      case 'silver': return <Star className="w-5 h-5" />;
      case 'bronze': return <Target className="w-5 h-5" />;
      default: return <Heart className="w-5 h-5" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionTypeIcon = (type) => {
    switch (type) {
      case 'earned': return <Plus className="w-4 h-4 text-green-600" />;
      case 'redeemed': return <Minus className="w-4 h-4 text-red-600" />;
      case 'expired': return <Calendar className="w-4 h-4 text-gray-600" />;
      case 'bonus': return <Zap className="w-4 h-4 text-yellow-600" />;
      default: return <History className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'earned': return 'text-green-600';
      case 'redeemed': return 'text-red-600';
      case 'expired': return 'text-gray-600';
      case 'bonus': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const calculateNextTierProgress = () => {
    if (!loyaltyData?.currentTier || !loyaltyData?.nextTier) return null;
    
    const currentSpend = loyaltyData.totalSpend || 0;
    const nextTierRequirement = loyaltyData.nextTier.minimumSpend || 0;
    const currentTierRequirement = loyaltyData.currentTier.minimumSpend || 0;
    
    const progress = ((currentSpend - currentTierRequirement) / (nextTierRequirement - currentTierRequirement)) * 100;
    const remaining = nextTierRequirement - currentSpend;
    
    return {
      progress: Math.min(Math.max(progress, 0), 100),
      remaining: Math.max(remaining, 0)
    };
  };

  const nextTierProgress = calculateNextTierProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Customer Loyalty Tracker</h2>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Customer Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Customer</h3>
        <CustomerSearch
          outletId={outletId}
          onCustomerSelect={setSelectedCustomer}
          placeholder="Search for a customer to view their loyalty status..."
        />
      </div>

      {/* Customer Loyalty Dashboard */}
      {selectedCustomer && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : loyaltyData ? (
            <>
              {/* Customer Info & Loyalty Status */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <Star className="w-8 h-8 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </h3>
                      <p className="text-gray-500">Member since {formatDate(selectedCustomer.createdAt)}</p>
                    </div>
                  </div>
                  
                  {loyaltyData.currentTier && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getTierColor(loyaltyData.currentTier.name)}`}>
                      {getTierIcon(loyaltyData.currentTier.name)}
                      <span className="font-semibold">{loyaltyData.currentTier.name} Member</span>
                    </div>
                  )}
                </div>

                {/* Loyalty Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Star className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{loyaltyData.currentPoints || 0}</div>
                    <div className="text-sm text-gray-500">Current Points</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{loyaltyData.totalPointsEarned || 0}</div>
                    <div className="text-sm text-gray-500">Total Earned</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Gift className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{loyaltyData.totalRedemptions || 0}</div>
                    <div className="text-sm text-gray-500">Redemptions</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <DollarSign className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatCurrency(loyaltyData.totalSpend)}</div>
                    <div className="text-sm text-gray-500">Total Spend</div>
                  </div>
                </div>

                {/* Next Tier Progress */}
                {nextTierProgress && loyaltyData.nextTier && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Progress to {loyaltyData.nextTier.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(nextTierProgress.remaining)} remaining
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${nextTierProgress.progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {nextTierProgress.progress.toFixed(1)}% complete
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setShowAddPointsModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Points</span>
                  </button>
                  <button
                    onClick={() => setShowRedeemModal(true)}
                    disabled={!loyaltyData.currentPoints || loyaltyData.currentPoints === 0}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Gift className="w-4 h-4" />
                    <span>Redeem Points</span>
                  </button>
                </div>
              </div>

              {/* Available Rewards */}
              {availableRewards.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Rewards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableRewards.map((reward, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{reward.name}</h4>
                            <p className="text-sm text-gray-500">{reward.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-purple-600">{reward.pointsCost} pts</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRedeemPoints(reward)}
                          disabled={loyaltyData.currentPoints < reward.pointsCost}
                          className="w-full mt-3 bg-purple-50 text-purple-600 px-3 py-2 rounded text-sm font-medium hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loyaltyData.currentPoints >= reward.pointsCost ? 'Redeem' : 'Insufficient Points'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Loyalty History */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty History</h3>
                <div className="space-y-3">
                  {loyaltyHistory.length > 0 ? (
                    loyaltyHistory.slice(0, 10).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3">
                          {getTransactionTypeIcon(transaction.type)}
                          <div>
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            <div className="text-sm text-gray-500">{formatDate(transaction.createdAt)}</div>
                          </div>
                        </div>
                        <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'earned' || transaction.type === 'bonus' ? '+' : '-'}
                          {transaction.points} pts
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <div>No loyalty history found</div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
              <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <div className="text-gray-500 text-lg">Customer not enrolled in loyalty program</div>
              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Enroll Customer
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Points Modal */}
      {showAddPointsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Loyalty Points</h3>
              <button
                onClick={() => {
                  setShowAddPointsModal(false);
                  setPointsToAdd('');
                  setPointsReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points to Add
                </label>
                <input
                  type="number"
                  value={pointsToAdd}
                  onChange={(e) => setPointsToAdd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter points amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select reason</option>
                  <option value="Manual adjustment">Manual adjustment</option>
                  <option value="Compensation">Compensation</option>
                  <option value="Bonus points">Bonus points</option>
                  <option value="Promotion">Promotion</option>
                  <option value="Customer service">Customer service</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddPointsModal(false);
                  setPointsToAdd('');
                  setPointsReason('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPoints}
                disabled={!pointsToAdd || !pointsReason}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Points Modal */}
      {showRedeemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Redeem Points</h3>
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setSelectedReward(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Available Points:</strong> {loyaltyData?.currentPoints || 0} points
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {availableRewards.map((reward, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    loyaltyData.currentPoints >= reward.pointsCost
                      ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                  onClick={() => {
                    if (loyaltyData.currentPoints >= reward.pointsCost) {
                      handleRedeemPoints(reward);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{reward.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-purple-600">{reward.pointsCost} pts</div>
                      <div className="text-xs text-gray-500 capitalize">{reward.category}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {availableRewards.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Gift className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <div>No rewards available</div>
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setSelectedReward(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyaltyTracker;
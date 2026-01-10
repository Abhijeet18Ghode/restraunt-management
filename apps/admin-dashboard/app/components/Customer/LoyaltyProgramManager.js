'use client';

import { useState, useEffect } from 'react';
import CustomerService from '../../services/customerService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';
import { 
  Gift, 
  Star, 
  Award, 
  Users, 
  TrendingUp, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  Crown,
  Heart,
  Percent,
  DollarSign,
  Calendar,
  Target
} from 'lucide-react';

const LoyaltyProgramManager = ({ outletId = null }) => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const customerService = new CustomerService();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'points', // points, tier, cashback
    status: 'active',
    rules: {
      pointsPerDollar: 1,
      minimumSpend: 0,
      pointsExpiry: 365, // days
      redemptionMinimum: 100,
      redemptionValue: 0.01 // $0.01 per point
    },
    tiers: [
      {
        name: 'Bronze',
        minimumSpend: 0,
        pointsMultiplier: 1,
        benefits: ['Basic rewards', 'Birthday discount']
      },
      {
        name: 'Silver',
        minimumSpend: 500,
        pointsMultiplier: 1.25,
        benefits: ['Priority support', '10% bonus points', 'Free delivery']
      },
      {
        name: 'Gold',
        minimumSpend: 1000,
        pointsMultiplier: 1.5,
        benefits: ['VIP treatment', '15% bonus points', 'Exclusive offers']
      },
      {
        name: 'Platinum',
        minimumSpend: 2500,
        pointsMultiplier: 2,
        benefits: ['Personal concierge', '20% bonus points', 'Early access']
      }
    ],
    rewards: [
      {
        name: 'Free Appetizer',
        pointsCost: 500,
        description: 'Get any appetizer free',
        category: 'food'
      },
      {
        name: '$5 Off',
        pointsCost: 500,
        description: '$5 discount on your order',
        category: 'discount'
      },
      {
        name: 'Free Dessert',
        pointsCost: 300,
        description: 'Get any dessert free',
        category: 'food'
      }
    ],
    settings: {
      autoEnroll: true,
      emailNotifications: true,
      smsNotifications: false,
      welcomeBonus: 100,
      referralBonus: 250
    }
  });

  useEffect(() => {
    loadPrograms();
  }, [outletId]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const response = await customerService.getLoyaltyPrograms(outletId);
      setPrograms(response.data || []);
    } catch (err) {
      setError('Failed to load loyalty programs');
      console.error('Loyalty programs loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const programData = {
        ...formData,
        outletId
      };

      if (editingProgram) {
        await customerService.updateLoyaltyProgram(editingProgram.id, programData);
      } else {
        await customerService.createLoyaltyProgram(programData);
      }
      
      await loadPrograms();
      handleCloseModal();
    } catch (err) {
      setError(editingProgram ? 'Failed to update program' : 'Failed to create program');
      console.error('Program save error:', err);
    }
  };

  const handleEdit = (program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name || '',
      description: program.description || '',
      type: program.type || 'points',
      status: program.status || 'active',
      rules: {
        pointsPerDollar: program.rules?.pointsPerDollar || 1,
        minimumSpend: program.rules?.minimumSpend || 0,
        pointsExpiry: program.rules?.pointsExpiry || 365,
        redemptionMinimum: program.rules?.redemptionMinimum || 100,
        redemptionValue: program.rules?.redemptionValue || 0.01
      },
      tiers: program.tiers || formData.tiers,
      rewards: program.rewards || formData.rewards,
      settings: {
        autoEnroll: program.settings?.autoEnroll !== false,
        emailNotifications: program.settings?.emailNotifications !== false,
        smsNotifications: program.settings?.smsNotifications === true,
        welcomeBonus: program.settings?.welcomeBonus || 100,
        referralBonus: program.settings?.referralBonus || 250
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (programId) => {
    if (!confirm('Are you sure you want to delete this loyalty program?')) return;
    
    try {
      await customerService.deleteLoyaltyProgram(programId);
      await loadPrograms();
    } catch (err) {
      setError('Failed to delete program');
      console.error('Program delete error:', err);
    }
  };

  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProgram(null);
    setFormData({
      name: '',
      description: '',
      type: 'points',
      status: 'active',
      rules: {
        pointsPerDollar: 1,
        minimumSpend: 0,
        pointsExpiry: 365,
        redemptionMinimum: 100,
        redemptionValue: 0.01
      },
      tiers: [
        {
          name: 'Bronze',
          minimumSpend: 0,
          pointsMultiplier: 1,
          benefits: ['Basic rewards', 'Birthday discount']
        },
        {
          name: 'Silver',
          minimumSpend: 500,
          pointsMultiplier: 1.25,
          benefits: ['Priority support', '10% bonus points', 'Free delivery']
        },
        {
          name: 'Gold',
          minimumSpend: 1000,
          pointsMultiplier: 1.5,
          benefits: ['VIP treatment', '15% bonus points', 'Exclusive offers']
        },
        {
          name: 'Platinum',
          minimumSpend: 2500,
          pointsMultiplier: 2,
          benefits: ['Personal concierge', '20% bonus points', 'Early access']
        }
      ],
      rewards: [
        {
          name: 'Free Appetizer',
          pointsCost: 500,
          description: 'Get any appetizer free',
          category: 'food'
        },
        {
          name: '$5 Off',
          pointsCost: 500,
          description: '$5 discount on your order',
          category: 'discount'
        },
        {
          name: 'Free Dessert',
          pointsCost: 300,
          description: 'Get any dessert free',
          category: 'food'
        }
      ],
      settings: {
        autoEnroll: true,
        emailNotifications: true,
        smsNotifications: false,
        welcomeBonus: 100,
        referralBonus: 250
      }
    });
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const fieldParts = field.split('.');
      setFormData(prev => {
        const newData = { ...prev };
        let current = newData;
        
        for (let i = 0; i < fieldParts.length - 1; i++) {
          if (!current[fieldParts[i]]) {
            current[fieldParts[i]] = {};
          }
          current = current[fieldParts[i]];
        }
        
        current[fieldParts[fieldParts.length - 1]] = value;
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addTier = () => {
    setFormData(prev => ({
      ...prev,
      tiers: [
        ...prev.tiers,
        {
          name: '',
          minimumSpend: 0,
          pointsMultiplier: 1,
          benefits: []
        }
      ]
    }));
  };

  const removeTier = (index) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index)
    }));
  };

  const updateTier = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => 
        i === index ? { ...tier, [field]: value } : tier
      )
    }));
  };

  const addReward = () => {
    setFormData(prev => ({
      ...prev,
      rewards: [
        ...prev.rewards,
        {
          name: '',
          pointsCost: 0,
          description: '',
          category: 'discount'
        }
      ]
    }));
  };

  const removeReward = (index) => {
    setFormData(prev => ({
      ...prev,
      rewards: prev.rewards.filter((_, i) => i !== index)
    }));
  };

  const updateReward = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      rewards: prev.rewards.map((reward, i) => 
        i === index ? { ...reward, [field]: value } : reward
      )
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'draft': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'points': return <Star className="w-5 h-5" />;
      case 'tier': return <Crown className="w-5 h-5" />;
      case 'cashback': return <DollarSign className="w-5 h-5" />;
      default: return <Gift className="w-5 h-5" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
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
        <h2 className="text-2xl font-bold text-gray-900">Loyalty Program Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Program</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  {getTypeIcon(program.type)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{program.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{program.type} Program</p>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(program.status)}`}>
                {program.status?.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{program.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{program.memberCount || 0} members</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <TrendingUp className="w-4 h-4" />
                  <span>{program.redemptionRate || 0}% redemption</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Star className="w-4 h-4" />
                  <span>{program.rules?.pointsPerDollar || 1}x points</span>
                </div>
                
                <div className="flex items-center space-x-2 text-gray-600">
                  <Gift className="w-4 h-4" />
                  <span>{program.rewards?.length || 0} rewards</span>
                </div>
              </div>

              {program.type === 'tier' && program.tiers && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">Tiers</div>
                  <div className="flex space-x-1">
                    {program.tiers.slice(0, 4).map((tier, index) => (
                      <div
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tier.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleViewDetails(program)}
                className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button
                onClick={() => handleEdit(program)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(program.id)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 && (
        <div className="text-center py-12">
          <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 text-lg">No loyalty programs found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Program
          </button>
        </div>
      )}

      {/* Create/Edit Program Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingProgram ? 'Edit Loyalty Program' : 'Create New Loyalty Program'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Program Name"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                required
              />
              
              <Select
                label="Program Type"
                value={formData.type}
                onChange={(value) => handleInputChange('type', value)}
                options={[
                  { value: 'points', label: 'Points Program' },
                  { value: 'tier', label: 'Tier Program' },
                  { value: 'cashback', label: 'Cashback Program' }
                ]}
                required
              />
              
              <div className="md:col-span-2">
                <TextArea
                  label="Description"
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  rows={3}
                  placeholder="Describe your loyalty program..."
                />
              </div>
              
              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => handleInputChange('status', value)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                  { value: 'draft', label: 'Draft' }
                ]}
              />
            </div>
          </div>

          {/* Program Rules */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Program Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Points per Dollar"
                type="number"
                step="0.1"
                value={formData.rules.pointsPerDollar}
                onChange={(value) => handleInputChange('rules.pointsPerDollar', parseFloat(value))}
              />
              
              <Input
                label="Minimum Spend ($)"
                type="number"
                step="0.01"
                value={formData.rules.minimumSpend}
                onChange={(value) => handleInputChange('rules.minimumSpend', parseFloat(value))}
              />
              
              <Input
                label="Points Expiry (days)"
                type="number"
                value={formData.rules.pointsExpiry}
                onChange={(value) => handleInputChange('rules.pointsExpiry', parseInt(value))}
              />
              
              <Input
                label="Minimum Redemption Points"
                type="number"
                value={formData.rules.redemptionMinimum}
                onChange={(value) => handleInputChange('rules.redemptionMinimum', parseInt(value))}
              />
              
              <Input
                label="Point Value ($)"
                type="number"
                step="0.001"
                value={formData.rules.redemptionValue}
                onChange={(value) => handleInputChange('rules.redemptionValue', parseFloat(value))}
              />
            </div>
          </div>

          {/* Tiers (if tier program) */}
          {formData.type === 'tier' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Tiers</h3>
                <button
                  type="button"
                  onClick={addTier}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
                >
                  Add Tier
                </button>
              </div>
              <div className="space-y-4">
                {formData.tiers.map((tier, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-900">Tier {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input
                        label="Tier Name"
                        value={tier.name}
                        onChange={(value) => updateTier(index, 'name', value)}
                        placeholder="e.g., Bronze, Silver, Gold"
                      />
                      <Input
                        label="Minimum Spend ($)"
                        type="number"
                        step="0.01"
                        value={tier.minimumSpend}
                        onChange={(value) => updateTier(index, 'minimumSpend', parseFloat(value))}
                      />
                      <Input
                        label="Points Multiplier"
                        type="number"
                        step="0.1"
                        value={tier.pointsMultiplier}
                        onChange={(value) => updateTier(index, 'pointsMultiplier', parseFloat(value))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rewards */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Rewards</h3>
              <button
                type="button"
                onClick={addReward}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Add Reward
              </button>
            </div>
            <div className="space-y-4">
              {formData.rewards.map((reward, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-900">Reward {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeReward(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Reward Name"
                      value={reward.name}
                      onChange={(value) => updateReward(index, 'name', value)}
                      placeholder="e.g., Free Appetizer"
                    />
                    <Input
                      label="Points Cost"
                      type="number"
                      value={reward.pointsCost}
                      onChange={(value) => updateReward(index, 'pointsCost', parseInt(value))}
                    />
                    <div className="md:col-span-2">
                      <TextArea
                        label="Description"
                        value={reward.description}
                        onChange={(value) => updateReward(index, 'description', value)}
                        rows={2}
                        placeholder="Describe the reward..."
                      />
                    </div>
                    <Select
                      label="Category"
                      value={reward.category}
                      onChange={(value) => updateReward(index, 'category', value)}
                      options={[
                        { value: 'food', label: 'Food' },
                        { value: 'discount', label: 'Discount' },
                        { value: 'service', label: 'Service' },
                        { value: 'experience', label: 'Experience' }
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Welcome Bonus Points"
                type="number"
                value={formData.settings.welcomeBonus}
                onChange={(value) => handleInputChange('settings.welcomeBonus', parseInt(value))}
              />
              
              <Input
                label="Referral Bonus Points"
                type="number"
                value={formData.settings.referralBonus}
                onChange={(value) => handleInputChange('settings.referralBonus', parseInt(value))}
              />
              
              <div className="md:col-span-2 space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.settings.autoEnroll}
                    onChange={(e) => handleInputChange('settings.autoEnroll', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Auto-enroll new customers</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.settings.emailNotifications}
                    onChange={(e) => handleInputChange('settings.emailNotifications', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Send email notifications</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.settings.smsNotifications}
                    onChange={(e) => handleInputChange('settings.smsNotifications', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Send SMS notifications</span>
                </label>
              </div>
            </div>
          </div>

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
              {editingProgram ? 'Update Program' : 'Create Program'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Program Details Modal */}
      {showDetailsModal && selectedProgram && (
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedProgram(null);
          }}
          title={`${selectedProgram.name} - Program Details`}
          size="large"
        >
          <div className="space-y-6">
            {/* Program Overview */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Program Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{selectedProgram.memberCount || 0}</div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{selectedProgram.redemptionRate || 0}%</div>
                  <div className="text-sm text-gray-500">Redemption Rate</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{selectedProgram.totalPointsIssued || 0}</div>
                  <div className="text-sm text-gray-500">Points Issued</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Gift className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-900">{selectedProgram.totalRedemptions || 0}</div>
                  <div className="text-sm text-gray-500">Redemptions</div>
                </div>
              </div>
            </div>

            {/* Program Rules */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Program Rules</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Points per Dollar:</span>
                    <span className="ml-2 text-gray-900">{selectedProgram.rules?.pointsPerDollar || 1}x</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Minimum Spend:</span>
                    <span className="ml-2 text-gray-900">{formatCurrency(selectedProgram.rules?.minimumSpend)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Points Expiry:</span>
                    <span className="ml-2 text-gray-900">{selectedProgram.rules?.pointsExpiry || 365} days</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Point Value:</span>
                    <span className="ml-2 text-gray-900">{formatCurrency(selectedProgram.rules?.redemptionValue)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rewards */}
            {selectedProgram.rewards && selectedProgram.rewards.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Rewards</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedProgram.rewards.map((reward, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-gray-900">{reward.name}</div>
                          <div className="text-sm text-gray-500">{reward.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">{reward.pointsCost} pts</div>
                          <div className="text-xs text-gray-500 capitalize">{reward.category}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tiers (if tier program) */}
            {selectedProgram.type === 'tier' && selectedProgram.tiers && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Program Tiers</h3>
                <div className="space-y-3">
                  {selectedProgram.tiers.map((tier, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-gray-900">{tier.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(tier.minimumSpend)}+ • {tier.pointsMultiplier}x points
                        </div>
                      </div>
                      {tier.benefits && tier.benefits.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Benefits:</span> {tier.benefits.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowDetailsModal(false);
                setSelectedProgram(null);
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowDetailsModal(false);
                handleEdit(selectedProgram);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Program
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LoyaltyProgramManager;
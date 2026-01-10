'use client';

import { useState, useEffect } from 'react';
import CustomerService from '../../services/customerService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Star, 
  Gift,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  TrendingUp,
  Heart
} from 'lucide-react';

const CustomerProfileManager = ({ outletId = null }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedLoyaltyStatus, setSelectedLoyaltyStatus] = useState('all');

  const customerService = new CustomerService();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    preferences: {
      dietaryRestrictions: [],
      favoriteItems: [],
      communicationPreferences: {
        email: true,
        sms: false,
        push: true
      }
    },
    notes: ''
  });

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 
    'Nut-Free', 'Keto', 'Low-Carb', 'Halal', 'Kosher'
  ];

  useEffect(() => {
    loadCustomers();
  }, [outletId, currentPage, searchTerm, selectedSegment, selectedLoyaltyStatus]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomers(
        outletId, 
        currentPage, 
        20, 
        searchTerm
      );
      
      setCustomers(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Customer loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const customerData = {
        ...formData,
        outletId
      };

      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, customerData);
      } else {
        await customerService.createCustomer(customerData);
      }
      
      await loadCustomers();
      handleCloseModal();
    } catch (err) {
      setError(editingCustomer ? 'Failed to update customer' : 'Failed to create customer');
      console.error('Customer save error:', err);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split('T')[0] : '',
      address: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        zipCode: customer.address?.zipCode || '',
        country: customer.address?.country || ''
      },
      preferences: {
        dietaryRestrictions: customer.preferences?.dietaryRestrictions || [],
        favoriteItems: customer.preferences?.favoriteItems || [],
        communicationPreferences: {
          email: customer.preferences?.communicationPreferences?.email !== false,
          sms: customer.preferences?.communicationPreferences?.sms === true,
          push: customer.preferences?.communicationPreferences?.push !== false
        }
      },
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (customerId) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    
    try {
      await customerService.deleteCustomer(customerId);
      await loadCustomers();
    } catch (err) {
      setError('Failed to delete customer');
      console.error('Customer delete error:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      preferences: {
        dietaryRestrictions: [],
        favoriteItems: [],
        communicationPreferences: {
          email: true,
          sms: false,
          push: true
        }
      },
      notes: ''
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

  const handleDietaryRestrictionToggle = (restriction) => {
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        dietaryRestrictions: prev.preferences.dietaryRestrictions.includes(restriction)
          ? prev.preferences.dietaryRestrictions.filter(r => r !== restriction)
          : [...prev.preferences.dietaryRestrictions, restriction]
      }
    }));
  };

  const handleExport = async () => {
    try {
      const data = await customerService.exportCustomers(outletId, 'csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export customers');
      console.error('Export error:', err);
    }
  };

  const getLoyaltyStatusColor = (status) => {
    switch (status) {
      case 'VIP': return 'text-purple-600 bg-purple-50';
      case 'Gold': return 'text-yellow-600 bg-yellow-50';
      case 'Silver': return 'text-gray-600 bg-gray-50';
      case 'Bronze': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
        <h2 className="text-2xl font-bold text-gray-900">Customer Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <User className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Customers
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Segment
            </label>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Segments</option>
              <option value="new">New Customers</option>
              <option value="regular">Regular Customers</option>
              <option value="vip">VIP Customers</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Loyalty Status
            </label>
            <select
              value={selectedLoyaltyStatus}
              onChange={(e) => setSelectedLoyaltyStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="VIP">VIP</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
              <option value="Bronze">Bronze</option>
              <option value="None">No Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Customer since {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>
              {customer.loyaltyStatus && (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLoyaltyStatusColor(customer.loyaltyStatus)}`}>
                  {customer.loyaltyStatus}
                </span>
              )}
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{customer.email}</span>
              </div>
              
              {customer.phone && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{customer.phone}</span>
                </div>
              )}
              
              {customer.address?.city && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{customer.address.city}, {customer.address.state}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                <span>Lifetime Value: {formatCurrency(customer.lifetimeValue)}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <Heart className="w-4 h-4" />
                <span>Loyalty Points: {customer.loyaltyPoints || 0}</span>
              </div>
              
              {customer.lastOrderDate && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Last Order: {formatDate(customer.lastOrderDate)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleEdit(customer)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {/* Handle view details */}}
                className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Eye className="w-4 h-4" />
                <span>View</span>
              </button>
              <button
                onClick={() => handleDelete(customer.id)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No customers found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Customer
          </button>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                required
              />
              
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                required
              />
              
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                required
              />
              
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(value) => handleInputChange('phone', value)}
              />
              
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(value) => handleInputChange('dateOfBirth', value)}
              />
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Street Address"
                  value={formData.address.street}
                  onChange={(value) => handleInputChange('address.street', value)}
                />
              </div>
              
              <Input
                label="City"
                value={formData.address.city}
                onChange={(value) => handleInputChange('address.city', value)}
              />
              
              <Input
                label="State"
                value={formData.address.state}
                onChange={(value) => handleInputChange('address.state', value)}
              />
              
              <Input
                label="ZIP Code"
                value={formData.address.zipCode}
                onChange={(value) => handleInputChange('address.zipCode', value)}
              />
              
              <Input
                label="Country"
                value={formData.address.country}
                onChange={(value) => handleInputChange('address.country', value)}
              />
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Restrictions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {dietaryOptions.map((option) => (
                  <label key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.preferences.dietaryRestrictions.includes(option)}
                      onChange={() => handleDietaryRestrictionToggle(option)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Communication Preferences
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.preferences.communicationPreferences.email}
                    onChange={(e) => handleInputChange('preferences.communicationPreferences.email', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.preferences.communicationPreferences.sms}
                    onChange={(e) => handleInputChange('preferences.communicationPreferences.sms', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">SMS notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.preferences.communicationPreferences.push}
                    onChange={(e) => handleInputChange('preferences.communicationPreferences.push', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Push notifications</span>
                </label>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <TextArea
              label="Notes"
              value={formData.notes}
              onChange={(value) => handleInputChange('notes', value)}
              rows={3}
              placeholder="Additional notes about the customer..."
            />
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
              {editingCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CustomerProfileManager;
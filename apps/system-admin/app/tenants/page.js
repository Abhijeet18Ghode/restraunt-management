'use client';

import { useState, useEffect } from 'react';
import { systemTenantService } from '../services/systemTenantService';
import ProtectedRoute from '../components/ProtectedRoute';
import Layout from '../components/Layout';
import { Plus, Search, Filter, Edit, Trash2, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const result = await systemTenantService.getTenants(1, 100);
      if (result.success) {
        setTenants(result.data || []);
      } else {
        toast.error('Failed to load tenants');
      }
    } catch (error) {
      console.error('Failed to load tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async (tenantId) => {
    if (!confirm('Are you sure you want to deactivate this tenant?')) {
      return;
    }

    try {
      const result = await systemTenantService.deleteTenant(tenantId);
      if (result.success) {
        toast.success('Tenant deactivated successfully');
        loadTenants();
      } else {
        toast.error('Failed to deactivate tenant');
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      toast.error('Failed to deactivate tenant');
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tenant.contactInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && tenant.isActive) ||
                         (filterStatus === 'inactive' && !tenant.isActive);

    return matchesSearch && matchesFilter;
  });

  return (
    <ProtectedRoute>
      <Layout>
        <Toaster position="top-right" />
        
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage restaurant tenants and their subscriptions
              </p>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </button>
          </div>

          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tenants..."
                    className="input pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  className="input w-auto"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">Loading tenants...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">
                                {tenant.businessName.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {tenant.businessName}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {tenant.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {tenant.contactInfo?.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tenant.contactInfo?.phone}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenant.subscriptionPlan === 'ENTERPRISE' ? 'bg-orange-100 text-orange-800' :
                            tenant.subscriptionPlan === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {tenant.subscriptionPlan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tenant.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setShowDetailsModal(true);
                              }}
                              className="text-primary-600 hover:text-primary-900"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTenant(tenant.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredTenants.length === 0 && (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500">
                      {searchTerm || filterStatus !== 'all' 
                        ? 'No tenants match your search criteria' 
                        : 'No tenants found'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create Tenant Modal */}
        {showCreateModal && (
          <CreateTenantModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadTenants();
            }}
          />
        )}

        {/* Tenant Details Modal */}
        {showDetailsModal && selectedTenant && (
          <TenantDetailsModal
            tenant={selectedTenant}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedTenant(null);
            }}
          />
        )}
      </Layout>
    </ProtectedRoute>
  );
}

// Create Tenant Modal Component
function CreateTenantModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    subscriptionPlan: 'BASIC',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tenantData = {
        businessName: formData.businessName,
        contactInfo: {
          email: formData.email,
          phone: formData.phone,
          address: {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            zipCode: formData.zipCode,
          },
        },
        subscriptionPlan: formData.subscriptionPlan,
        adminUser: {
          firstName: formData.adminFirstName,
          lastName: formData.adminLastName,
          email: formData.adminEmail,
          password: formData.adminPassword,
        },
      };

      const result = await systemTenantService.createTenant(tenantData);
      if (result.success) {
        toast.success('Tenant created successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to create tenant');
      }
    } catch (error) {
      console.error('Failed to create tenant:', error);
      toast.error('Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Tenant</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Business Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  name="businessName"
                  required
                  className="input"
                  value={formData.businessName}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="street"
                  required
                  className="input"
                  value={formData.street}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  className="input"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  name="state"
                  required
                  className="input"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  name="country"
                  required
                  className="input"
                  value={formData.country}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code *
                </label>
                <input
                  type="text"
                  name="zipCode"
                  required
                  className="input"
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan *
            </label>
            <select
              name="subscriptionPlan"
              required
              className="input"
              value={formData.subscriptionPlan}
              onChange={handleChange}
            >
              <option value="BASIC">Basic - $29/month</option>
              <option value="PREMIUM">Premium - $79/month</option>
              <option value="ENTERPRISE">Enterprise - $199/month</option>
            </select>
          </div>

          {/* Admin User */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="adminFirstName"
                  required
                  className="input"
                  value={formData.adminFirstName}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="adminLastName"
                  required
                  className="input"
                  value={formData.adminLastName}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Email *
                </label>
                <input
                  type="email"
                  name="adminEmail"
                  required
                  className="input"
                  value={formData.adminEmail}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Admin Password *
                </label>
                <input
                  type="password"
                  name="adminPassword"
                  required
                  minLength="8"
                  className="input"
                  value={formData.adminPassword}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Tenant Details Modal Component
function TenantDetailsModal({ tenant, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Tenant Details</h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Business Name</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.businessName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{tenant.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.contactInfo?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{tenant.contactInfo?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Subscription Plan</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.subscriptionPlan === 'ENTERPRISE' ? 'bg-orange-100 text-orange-800' :
                    tenant.subscriptionPlan === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {tenant.subscriptionPlan}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          {tenant.contactInfo?.address && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="text-sm text-gray-900">
                <p>{tenant.contactInfo.address.street}</p>
                <p>{tenant.contactInfo.address.city}, {tenant.contactInfo.address.state} {tenant.contactInfo.address.zipCode}</p>
                <p>{tenant.contactInfo.address.country}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Timeline</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(tenant.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(tenant.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
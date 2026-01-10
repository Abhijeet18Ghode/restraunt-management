'use client';

import { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { tenantService } from '../services/tenantService';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Users,
  Settings,
  Search,
  Filter,
} from 'lucide-react';

export default function OutletsPage() {
  const { currentTenant } = useTenant();
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load outlets
  const loadOutlets = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);
      const outletsData = await tenantService.getOutlets(currentTenant.id);
      setOutlets(outletsData || []);
    } catch (error) {
      console.error('Failed to load outlets:', error);
      // Set empty array instead of fallback data to show proper empty state
      setOutlets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutlets();
  }, [currentTenant]);

  // Filter outlets
  const filteredOutlets = outlets.filter(outlet => {
    const matchesSearch = outlet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         outlet.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && outlet.isActive) ||
                         (filterStatus === 'inactive' && !outlet.isActive);
    return matchesSearch && matchesFilter;
  });

  const handleCreateOutlet = () => {
    setSelectedOutlet(null);
    setShowCreateModal(true);
  };

  const handleEditOutlet = (outlet) => {
    setSelectedOutlet(outlet);
    setShowEditModal(true);
  };

  const handleDeleteOutlet = async (outletId) => {
    if (!confirm('Are you sure you want to delete this outlet?')) return;

    try {
      await tenantService.deleteOutlet(currentTenant.id, outletId);
      await loadOutlets();
    } catch (error) {
      console.error('Failed to delete outlet:', error);
      alert('Failed to delete outlet. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Outlets Management</h1>
          <p className="text-gray-600">Manage your restaurant outlets and locations</p>
        </div>
        <button
          onClick={handleCreateOutlet}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Add New Outlet</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search outlets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Outlets</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Outlets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOutlets.map((outlet) => (
          <OutletCard
            key={outlet.id}
            outlet={outlet}
            onEdit={handleEditOutlet}
            onDelete={handleDeleteOutlet}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredOutlets.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No outlets found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating your first outlet.'
            }
          </p>
          {!searchTerm && filterStatus === 'all' && (
            <div className="mt-6">
              <button
                onClick={handleCreateOutlet}
                className="btn-primary"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Outlet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <OutletModal
          outlet={selectedOutlet}
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedOutlet(null);
          }}
          onSave={loadOutlets}
          tenantId={currentTenant?.id}
        />
      )}
    </div>
  );
}

/**
 * Outlet Card Component
 */
function OutletCard({ outlet, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Building2 className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{outlet.name}</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                outlet.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {outlet.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(outlet)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(outlet.id)}
              className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <span>{outlet.address}</span>
          </div>
          {outlet.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              <span>{outlet.phone}</span>
            </div>
          )}
          {outlet.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              <span>{outlet.email}</span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Created: {new Date(outlet.createdAt).toLocaleDateString()}</span>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <Users className="h-4 w-4 mr-1" />
                Staff: 0
              </span>
              <button className="text-primary-600 hover:text-primary-700">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Outlet Modal Component
 */
function OutletModal({ outlet, isOpen, onClose, onSave, tenantId }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    managerId: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (outlet) {
      setFormData({
        name: outlet.name || '',
        address: outlet.address || '',
        phone: outlet.phone || '',
        email: outlet.email || '',
        managerId: outlet.managerId || '',
        isActive: outlet.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        managerId: '',
        isActive: true,
      });
    }
  }, [outlet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      setLoading(true);
      
      if (outlet) {
        await tenantService.updateOutlet(tenantId, outlet.id, formData);
      } else {
        await tenantService.createOutlet(tenantId, formData);
      }
      
      await onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save outlet:', error);
      alert('Failed to save outlet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {outlet ? 'Edit Outlet' : 'Create New Outlet'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Outlet Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Enter outlet name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input"
              rows={3}
              placeholder="Enter full address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+1-234-567-8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="outlet@restaurant.com"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active outlet
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (outlet ? 'Update Outlet' : 'Create Outlet')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
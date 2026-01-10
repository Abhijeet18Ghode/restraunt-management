'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import Select from '../UI/Select';

const SupplierManager = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    paymentTerms: '',
    deliveryTime: '',
    minimumOrder: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getSuppliers();
      setSuppliers(response.data || []);
    } catch (err) {
      setError('Failed to load suppliers');
      console.error('Suppliers loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await inventoryService.updateSupplier(editingSupplier.id, formData);
      } else {
        await inventoryService.createSupplier(formData);
      }
      
      await loadSuppliers();
      handleCloseModal();
    } catch (err) {
      setError(editingSupplier ? 'Failed to update supplier' : 'Failed to create supplier');
      console.error('Supplier save error:', err);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      zipCode: supplier.zipCode || '',
      country: supplier.country || '',
      paymentTerms: supplier.paymentTerms || '',
      deliveryTime: supplier.deliveryTime || '',
      minimumOrder: supplier.minimumOrder || '',
      status: supplier.status || 'active',
      notes: supplier.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (supplierId) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    
    try {
      await inventoryService.deleteSupplier(supplierId);
      await loadSuppliers();
    } catch (err) {
      setError('Failed to delete supplier');
      console.error('Supplier delete error:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      paymentTerms: '',
      deliveryTime: '',
      minimumOrder: '',
      status: 'active',
      notes: ''
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredAndSortedSuppliers = suppliers
    .filter(supplier => 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortBy]?.toLowerCase() || '';
      const bValue = b[sortBy]?.toLowerCase() || '';
      return aValue.localeCompare(bValue);
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'suspended': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
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
        <h2 className="text-2xl font-bold text-gray-900">Supplier Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Supplier
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Suppliers
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, contact, or email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Name</option>
              <option value="contactPerson">Contact Person</option>
              <option value="status">Status</option>
              <option value="createdAt">Date Added</option>
            </select>
          </div>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(supplier.status)}`}>
                {supplier.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600">
              {supplier.contactPerson && (
                <div>
                  <span className="font-medium">Contact:</span> {supplier.contactPerson}
                </div>
              )}
              {supplier.email && (
                <div>
                  <span className="font-medium">Email:</span> {supplier.email}
                </div>
              )}
              {supplier.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {supplier.phone}
                </div>
              )}
              {supplier.deliveryTime && (
                <div>
                  <span className="font-medium">Delivery:</span> {supplier.deliveryTime} days
                </div>
              )}
              {supplier.minimumOrder && (
                <div>
                  <span className="font-medium">Min Order:</span> ${supplier.minimumOrder}
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleEdit(supplier)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(supplier.id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAndSortedSuppliers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No suppliers found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Supplier
          </button>
        </div>
      )}

      {/* Add/Edit Supplier Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(value) => handleInputChange('name', value)}
              required
            />
            
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(value) => handleInputChange('contactPerson', value)}
            />
            
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
            />
            
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(value) => handleInputChange('phone', value)}
            />
          </div>

          <TextArea
            label="Address"
            value={formData.address}
            onChange={(value) => handleInputChange('address', value)}
            rows={2}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(value) => handleInputChange('city', value)}
            />
            
            <Input
              label="State"
              value={formData.state}
              onChange={(value) => handleInputChange('state', value)}
            />
            
            <Input
              label="Zip Code"
              value={formData.zipCode}
              onChange={(value) => handleInputChange('zipCode', value)}
            />
          </div>

          <Input
            label="Country"
            value={formData.country}
            onChange={(value) => handleInputChange('country', value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Payment Terms (days)"
              type="number"
              value={formData.paymentTerms}
              onChange={(value) => handleInputChange('paymentTerms', value)}
            />
            
            <Input
              label="Delivery Time (days)"
              type="number"
              value={formData.deliveryTime}
              onChange={(value) => handleInputChange('deliveryTime', value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Minimum Order ($)"
              type="number"
              step="0.01"
              value={formData.minimumOrder}
              onChange={(value) => handleInputChange('minimumOrder', value)}
            />
            
            <Select
              label="Status"
              value={formData.status}
              onChange={(value) => handleInputChange('status', value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' }
              ]}
            />
          </div>

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(value) => handleInputChange('notes', value)}
            rows={3}
          />

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
              {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupplierManager;
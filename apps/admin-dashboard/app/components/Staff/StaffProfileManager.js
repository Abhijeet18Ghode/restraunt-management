'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';
import { User, Mail, Phone, MapPin, Calendar, Shield, Clock } from 'lucide-react';

const StaffProfileManager = ({ outletId = null }) => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    hireDate: '',
    employeeId: '',
    role: '',
    department: '',
    hourlyRate: '',
    salary: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    notes: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, [outletId, selectedRole, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [staffResponse, rolesResponse] = await Promise.all([
        staffService.getStaffMembers(
          outletId, 
          selectedRole === 'all' ? null : selectedRole,
          selectedStatus === 'all' ? null : selectedStatus
        ),
        staffService.getAvailableRoles()
      ]);

      setStaffMembers(staffResponse.data || []);
      setAvailableRoles(rolesResponse.data || []);
    } catch (err) {
      setError('Failed to load staff data');
      console.error('Staff loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await staffService.updateStaffMember(editingStaff.id, formData);
      } else {
        await staffService.createStaffMember(formData);
      }
      
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(editingStaff ? 'Failed to update staff member' : 'Failed to create staff member');
      console.error('Staff save error:', err);
    }
  };

  const handleEdit = (staff) => {
    setEditingStaff(staff);
    setFormData({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      email: staff.email || '',
      phone: staff.phone || '',
      address: staff.address || '',
      dateOfBirth: staff.dateOfBirth ? new Date(staff.dateOfBirth).toISOString().split('T')[0] : '',
      hireDate: staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : '',
      employeeId: staff.employeeId || '',
      role: staff.role || '',
      department: staff.department || '',
      hourlyRate: staff.hourlyRate || '',
      salary: staff.salary || '',
      emergencyContact: {
        name: staff.emergencyContact?.name || '',
        phone: staff.emergencyContact?.phone || '',
        relationship: staff.emergencyContact?.relationship || ''
      },
      notes: staff.notes || '',
      isActive: staff.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (staffId) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      await staffService.deleteStaffMember(staffId);
      await loadData();
    } catch (err) {
      setError('Failed to delete staff member');
      console.error('Staff delete error:', err);
    }
  };

  const handleToggleStatus = async (staffId, currentStatus) => {
    try {
      if (currentStatus) {
        await staffService.deactivateStaffMember(staffId);
      } else {
        await staffService.activateStaffMember(staffId);
      }
      await loadData();
    } catch (err) {
      setError('Failed to update staff status');
      console.error('Staff status error:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      hireDate: '',
      employeeId: '',
      role: '',
      department: '',
      hourlyRate: '',
      salary: '',
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      },
      notes: '',
      isActive: true
    });
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getRoleColor = (role) => {
    const colors = {
      'manager': 'text-purple-600 bg-purple-50',
      'supervisor': 'text-blue-600 bg-blue-50',
      'server': 'text-green-600 bg-green-50',
      'cook': 'text-orange-600 bg-orange-50',
      'cashier': 'text-yellow-600 bg-yellow-50',
      'cleaner': 'text-gray-600 bg-gray-50'
    };
    return colors[role?.toLowerCase()] || 'text-gray-600 bg-gray-50';
  };

  const filteredStaffMembers = staffMembers.filter(staff => 
    staff.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Staff Member
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
              Search Staff
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Filter
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              {availableRoles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaffMembers.map((staff) => (
          <div key={staff.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {staff.firstName} {staff.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">ID: {staff.employeeId}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(staff.isActive)}`}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2 text-gray-600">
                <Shield className="w-4 h-4" />
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(staff.role)}`}>
                  {staff.role}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <Mail className="w-4 h-4" />
                <span>{staff.email}</span>
              </div>
              
              {staff.phone && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{staff.phone}</span>
                </div>
              )}
              
              {staff.hireDate && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Hired: {new Date(staff.hireDate).toLocaleDateString()}</span>
                </div>
              )}
              
              {staff.department && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{staff.department}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleEdit(staff)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                  staff.isActive 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {staff.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => handleDelete(staff.id)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded text-sm font-medium hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredStaffMembers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No staff members found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Staff Member
          </button>
        </div>
      )}

      {/* Add/Edit Staff Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
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
              
              <Input
                label="Employee ID"
                value={formData.employeeId}
                onChange={(value) => handleInputChange('employeeId', value)}
                required
              />
            </div>

            <div className="mt-4">
              <TextArea
                label="Address"
                value={formData.address}
                onChange={(value) => handleInputChange('address', value)}
                rows={2}
              />
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Role"
                value={formData.role}
                onChange={(value) => handleInputChange('role', value)}
                options={availableRoles.map(role => ({
                  value: role.name,
                  label: role.name
                }))}
                required
              />
              
              <Input
                label="Department"
                value={formData.department}
                onChange={(value) => handleInputChange('department', value)}
              />
              
              <Input
                label="Hire Date"
                type="date"
                value={formData.hireDate}
                onChange={(value) => handleInputChange('hireDate', value)}
                required
              />
              
              <Input
                label="Hourly Rate ($)"
                type="number"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(value) => handleInputChange('hourlyRate', value)}
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Contact Name"
                value={formData.emergencyContact.name}
                onChange={(value) => handleInputChange('emergencyContact.name', value)}
              />
              
              <Input
                label="Contact Phone"
                value={formData.emergencyContact.phone}
                onChange={(value) => handleInputChange('emergencyContact.phone', value)}
              />
              
              <Input
                label="Relationship"
                value={formData.emergencyContact.relationship}
                onChange={(value) => handleInputChange('emergencyContact.relationship', value)}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <TextArea
              label="Notes"
              value={formData.notes}
              onChange={(value) => handleInputChange('notes', value)}
              rows={3}
              placeholder="Additional notes about the staff member..."
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
              {editingStaff ? 'Update Staff Member' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffProfileManager;
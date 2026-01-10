'use client';

import { useState, useEffect } from 'react';
import { staffService } from '../../services/staffService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import TextArea from '../UI/TextArea';
import { Shield, Users, Settings, Eye, Edit, Trash2 } from 'lucide-react';

const RoleManager = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    level: 1,
    isActive: true
  });

  // Available permissions for role assignment
  const availablePermissions = [
    // Dashboard
    { id: 'dashboard.view', name: 'View Dashboard', category: 'Dashboard' },
    { id: 'dashboard.analytics', name: 'View Analytics', category: 'Dashboard' },
    
    // Staff Management
    { id: 'staff.view', name: 'View Staff', category: 'Staff' },
    { id: 'staff.create', name: 'Create Staff', category: 'Staff' },
    { id: 'staff.edit', name: 'Edit Staff', category: 'Staff' },
    { id: 'staff.delete', name: 'Delete Staff', category: 'Staff' },
    { id: 'staff.attendance.view', name: 'View Attendance', category: 'Staff' },
    { id: 'staff.attendance.manage', name: 'Manage Attendance', category: 'Staff' },
    { id: 'staff.schedules.view', name: 'View Schedules', category: 'Staff' },
    { id: 'staff.schedules.manage', name: 'Manage Schedules', category: 'Staff' },
    { id: 'staff.payroll.view', name: 'View Payroll', category: 'Staff' },
    { id: 'staff.payroll.manage', name: 'Manage Payroll', category: 'Staff' },
    
    // Menu Management
    { id: 'menu.view', name: 'View Menu', category: 'Menu' },
    { id: 'menu.create', name: 'Create Menu Items', category: 'Menu' },
    { id: 'menu.edit', name: 'Edit Menu Items', category: 'Menu' },
    { id: 'menu.delete', name: 'Delete Menu Items', category: 'Menu' },
    { id: 'menu.pricing.view', name: 'View Pricing', category: 'Menu' },
    { id: 'menu.pricing.edit', name: 'Edit Pricing', category: 'Menu' },
    
    // Inventory
    { id: 'inventory.view', name: 'View Inventory', category: 'Inventory' },
    { id: 'inventory.manage', name: 'Manage Inventory', category: 'Inventory' },
    { id: 'inventory.reports', name: 'View Inventory Reports', category: 'Inventory' },
    { id: 'inventory.suppliers', name: 'Manage Suppliers', category: 'Inventory' },
    { id: 'inventory.purchase_orders', name: 'Manage Purchase Orders', category: 'Inventory' },
    
    // Orders & POS
    { id: 'orders.view', name: 'View Orders', category: 'Orders' },
    { id: 'orders.create', name: 'Create Orders', category: 'Orders' },
    { id: 'orders.edit', name: 'Edit Orders', category: 'Orders' },
    { id: 'orders.cancel', name: 'Cancel Orders', category: 'Orders' },
    { id: 'pos.access', name: 'Access POS', category: 'POS' },
    { id: 'pos.refunds', name: 'Process Refunds', category: 'POS' },
    
    // Customers
    { id: 'customers.view', name: 'View Customers', category: 'Customers' },
    { id: 'customers.manage', name: 'Manage Customers', category: 'Customers' },
    { id: 'customers.loyalty', name: 'Manage Loyalty Program', category: 'Customers' },
    
    // Reports & Analytics
    { id: 'reports.view', name: 'View Reports', category: 'Reports' },
    { id: 'reports.export', name: 'Export Reports', category: 'Reports' },
    { id: 'analytics.view', name: 'View Analytics', category: 'Analytics' },
    { id: 'analytics.advanced', name: 'Advanced Analytics', category: 'Analytics' },
    
    // Settings
    { id: 'settings.view', name: 'View Settings', category: 'Settings' },
    { id: 'settings.manage', name: 'Manage Settings', category: 'Settings' },
    { id: 'settings.security', name: 'Security Settings', category: 'Settings' },
    { id: 'settings.integrations', name: 'Manage Integrations', category: 'Settings' },
    
    // System Admin
    { id: 'admin.users', name: 'Manage Users', category: 'Admin' },
    { id: 'admin.roles', name: 'Manage Roles', category: 'Admin' },
    { id: 'admin.system', name: 'System Administration', category: 'Admin' }
  ];

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await staffService.getAvailableRoles();
      setRoles(response.data || []);
    } catch (err) {
      setError('Failed to load roles');
      console.error('Roles loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await staffService.updateRole(editingRole.id, formData);
      } else {
        await staffService.createRole(formData);
      }
      
      await loadRoles();
      handleCloseModal();
    } catch (err) {
      setError(editingRole ? 'Failed to update role' : 'Failed to create role');
      console.error('Role save error:', err);
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name || '',
      description: role.description || '',
      permissions: role.permissions || [],
      level: role.level || 1,
      isActive: role.isActive !== false
    });
    setShowModal(true);
  };

  const handleDelete = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await staffService.deleteRole(roleId);
      await loadRoles();
    } catch (err) {
      setError('Failed to delete role');
      console.error('Role delete error:', err);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: [],
      level: 1,
      isActive: true
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const getRoleLevelColor = (level) => {
    const colors = {
      1: 'text-gray-600 bg-gray-50',
      2: 'text-blue-600 bg-blue-50',
      3: 'text-green-600 bg-green-50',
      4: 'text-yellow-600 bg-yellow-50',
      5: 'text-purple-600 bg-purple-50'
    };
    return colors[level] || colors[1];
  };

  const getRoleLevelName = (level) => {
    const names = {
      1: 'Basic',
      2: 'Standard',
      3: 'Advanced',
      4: 'Manager',
      5: 'Admin'
    };
    return names[level] || 'Basic';
  };

  const groupPermissionsByCategory = () => {
    const grouped = {};
    availablePermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    });
    return grouped;
  };

  const filteredRoles = roles.filter(role => 
    role.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedPermissions = groupPermissionsByCategory();

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
        <h2 className="text-2xl font-bold text-gray-900">Role Management</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Role
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Roles
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div key={role.id} className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleLevelColor(role.level)}`}>
                    Level {role.level} - {getRoleLevelName(role.level)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-600">{role.description}</p>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{role.userCount || 0} users assigned</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Settings className="w-4 h-4" />
                <span>{role.permissions?.length || 0} permissions</span>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => handleEdit(role)}
                className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No roles found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Role
          </button>
        </div>
      )}

      {/* Create/Edit Role Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingRole ? 'Edit Role' : 'Create New Role'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Role Name"
              value={formData.name}
              onChange={(value) => handleInputChange('name', value)}
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role Level
              </label>
              <select
                value={formData.level}
                onChange={(e) => handleInputChange('level', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>Level 1 - Basic</option>
                <option value={2}>Level 2 - Standard</option>
                <option value={3}>Level 3 - Advanced</option>
                <option value={4}>Level 4 - Manager</option>
                <option value={5}>Level 5 - Admin</option>
              </select>
            </div>
          </div>

          <TextArea
            label="Description"
            value={formData.description}
            onChange={(value) => handleInputChange('description', value)}
            rows={3}
            placeholder="Describe the role and its responsibilities..."
          />

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {Object.entries(groupedPermissions).map(([category, permissions]) => (
                <div key={category} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissions.map((permission) => (
                      <label key={permission.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{permission.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
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
              {editingRole ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoleManager;
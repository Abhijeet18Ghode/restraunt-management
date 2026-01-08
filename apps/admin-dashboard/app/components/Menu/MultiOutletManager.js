'use client';

import { useState, useEffect } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Select from '../UI/Select';
import Modal from '../UI/Modal';
import PermissionGate from '../Auth/PermissionGate';
import { useRoleManager } from '../Auth/RoleManager';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  Building2,
  Copy,
  Sync,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  Globe,
  MapPin,
} from 'lucide-react';

export default function MultiOutletManager({ 
  items = [], 
  categories = [],
  onItemsUpdate 
}) {
  const [outlets, setOutlets] = useState([]);
  const [selectedSourceOutlet, setSelectedSourceOutlet] = useState('');
  const [selectedTargetOutlets, setSelectedTargetOutlets] = useState([]);
  const [syncMode, setSyncMode] = useState('copy'); // 'copy', 'sync', 'template'
  const [syncOptions, setSyncOptions] = useState({
    includeCategories: true,
    includeItems: true,
    includePricing: true,
    includeAvailability: false,
    overwriteExisting: false,
  });
  
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [syncProgress, setSyncProgress] = useState(null);

  const { selectedOutlet, tenant } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  useEffect(() => {
    loadOutlets();
  }, [tenant]);

  const loadOutlets = async () => {
    try {
      // In a real implementation, this would fetch from the tenant service
      const mockOutlets = [
        {
          id: '1',
          name: 'Main Branch',
          address: '123 Main St, Downtown',
          isActive: true,
          menuItemCount: 45,
        },
        {
          id: '2', 
          name: 'Mall Location',
          address: '456 Mall Ave, Shopping Center',
          isActive: true,
          menuItemCount: 38,
        },
        {
          id: '3',
          name: 'Airport Branch',
          address: '789 Airport Rd, Terminal 2',
          isActive: true,
          menuItemCount: 25,
        },
      ];
      
      setOutlets(mockOutlets);
      setSelectedSourceOutlet(selectedOutlet?.id || mockOutlets[0]?.id);
    } catch (error) {
      console.error('Failed to load outlets:', error);
      setError('Failed to load outlet information');
    }
  };

  const handleSync = async () => {
    if (!selectedSourceOutlet || selectedTargetOutlets.length === 0) {
      setError('Please select source and target outlets');
      return;
    }

    setLoading(true);
    setError('');
    setSyncProgress({ current: 0, total: selectedTargetOutlets.length });

    try {
      for (let i = 0; i < selectedTargetOutlets.length; i++) {
        const targetOutletId = selectedTargetOutlets[i];
        
        setSyncProgress({ current: i + 1, total: selectedTargetOutlets.length });
        
        // Simulate sync operation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // In a real implementation, this would call the appropriate API
        switch (syncMode) {
          case 'copy':
            await copyMenuToOutlet(selectedSourceOutlet, targetOutletId);
            break;
          case 'sync':
            await syncMenuWithOutlet(selectedSourceOutlet, targetOutletId);
            break;
          case 'template':
            await applyTemplateToOutlet(selectedSourceOutlet, targetOutletId);
            break;
        }
      }

      setSuccess(`Successfully ${syncMode === 'copy' ? 'copied' : 'synced'} menu to ${selectedTargetOutlets.length} outlet(s)`);
      setShowSyncModal(false);
      setSyncProgress(null);
      
      setTimeout(() => setSuccess(''), 5000);

    } catch (error) {
      console.error('Sync failed:', error);
      setError(error.message || 'Failed to sync menu');
      setSyncProgress(null);
    } finally {
      setLoading(false);
    }
  };

  const copyMenuToOutlet = async (sourceId, targetId) => {
    // Implementation would copy menu items from source to target
    console.log(`Copying menu from ${sourceId} to ${targetId}`);
  };

  const syncMenuWithOutlet = async (sourceId, targetId) => {
    // Implementation would sync menu items between outlets
    console.log(`Syncing menu between ${sourceId} and ${targetId}`);
  };

  const applyTemplateToOutlet = async (templateId, targetId) => {
    // Implementation would apply menu template to target outlet
    console.log(`Applying template ${templateId} to ${targetId}`);
  };

  const getOutletById = (id) => outlets.find(outlet => outlet.id === id);

  const toggleTargetOutlet = (outletId) => {
    setSelectedTargetOutlets(prev => 
      prev.includes(outletId)
        ? prev.filter(id => id !== outletId)
        : [...prev, outletId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Multi-Outlet Management</h2>
          <p className="text-sm text-gray-500">
            Manage menu consistency across multiple restaurant locations
          </p>
        </div>
        
        <PermissionGate permission={PERMISSIONS.MENU_BULK_MANAGE}>
          <Button onClick={() => setShowSyncModal(true)}>
            <RefreshCw  className="h-4 w-4 mr-2" />
            Sync Menus
          </Button>
        </PermissionGate>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Outlets Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {outlets.map((outlet) => (
          <Card key={outlet.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <Building2 className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {outlet.name}
                  </h3>
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <MapPin className="h-3 w-3 mr-1" />
                    {outlet.address}
                  </p>
                </div>
              </div>
              {outlet.id === selectedOutlet?.id && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  Current
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Menu Items:</span>
                <span className="font-medium">{outlet.menuItemCount}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  outlet.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {outlet.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex space-x-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                View Menu
              </Button>
              <PermissionGate permission={PERMISSIONS.MENU_BULK_MANAGE}>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </PermissionGate>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="p-4 h-auto flex-col">
            <Copy className="h-6 w-6 mb-2 text-blue-500" />
            <span className="font-medium">Copy Menu</span>
            <span className="text-xs text-gray-500 mt-1">
              Copy entire menu to another outlet
            </span>
          </Button>

          <Button variant="outline" className="p-4 h-auto flex-col">
            <RefreshCw  className="h-6 w-6 mb-2 text-green-500" />
            <span className="font-medium">Sync Pricing</span>
            <span className="text-xs text-gray-500 mt-1">
              Synchronize prices across outlets
            </span>
          </Button>

          <Button variant="outline" className="p-4 h-auto flex-col">
            <Globe className="h-6 w-6 mb-2 text-purple-500" />
            <span className="font-medium">Global Template</span>
            <span className="text-xs text-gray-500 mt-1">
              Create standardized menu template
            </span>
          </Button>
        </div>
      </Card>

      {/* Sync Modal */}
      <Modal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync Menu Across Outlets"
        size="lg"
      >
        <div className="space-y-6">
          {/* Sync Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Mode
            </label>
            <Select
              value={syncMode}
              onChange={(e) => setSyncMode(e.target.value)}
            >
              <option value="copy">Copy Menu</option>
              <option value="sync">Sync Changes</option>
              <option value="template">Apply Template</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {syncMode === 'copy' && 'Copy complete menu from source to target outlets'}
              {syncMode === 'sync' && 'Synchronize changes between outlets'}
              {syncMode === 'template' && 'Apply standardized template to outlets'}
            </p>
          </div>

          {/* Source Outlet Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Outlet
            </label>
            <Select
              value={selectedSourceOutlet}
              onChange={(e) => setSelectedSourceOutlet(e.target.value)}
            >
              {outlets.map(outlet => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name} ({outlet.menuItemCount} items)
                </option>
              ))}
            </Select>
          </div>

          {/* Target Outlets Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Outlets
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {outlets
                .filter(outlet => outlet.id !== selectedSourceOutlet)
                .map(outlet => (
                  <label key={outlet.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedTargetOutlets.includes(outlet.id)}
                      onChange={() => toggleTargetOutlet(outlet.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {outlet.name}
                    </span>
                  </label>
                ))}
            </div>
          </div>

          {/* Sync Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync Options
            </label>
            <div className="space-y-2">
              {Object.entries({
                includeCategories: 'Include Categories',
                includeItems: 'Include Menu Items',
                includePricing: 'Include Pricing',
                includeAvailability: 'Include Availability Status',
                overwriteExisting: 'Overwrite Existing Items',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={syncOptions[key]}
                    onChange={(e) => setSyncOptions({
                      ...syncOptions,
                      [key]: e.target.checked
                    })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Progress Indicator */}
          {syncProgress && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Syncing outlets...
                </span>
                <span className="text-sm text-blue-700">
                  {syncProgress.current} of {syncProgress.total}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(syncProgress.current / syncProgress.total) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}

          {/* Preview */}
          {selectedSourceOutlet && selectedTargetOutlets.length > 0 && !syncProgress && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
              <div className="flex items-center text-sm text-gray-600">
                <span>{getOutletById(selectedSourceOutlet)?.name}</span>
                <ArrowRight className="h-4 w-4 mx-2" />
                <span>
                  {selectedTargetOutlets.length} outlet{selectedTargetOutlets.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setShowSyncModal(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSync}
              disabled={loading || !selectedSourceOutlet || selectedTargetOutlets.length === 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Syncing...
                </>
              ) : (
                `${syncMode === 'copy' ? 'Copy' : 'Sync'} Menu`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
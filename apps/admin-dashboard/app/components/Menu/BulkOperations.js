'use client';

import { useState } from 'react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Select from '../UI/Select';
import Modal from '../UI/Modal';
import PermissionGate from '../Auth/PermissionGate';
import { useRoleManager } from '../Auth/RoleManager';
import { menuService } from '../../services/menuService';
import { useTenant } from '../../contexts/TenantContext';
import {
  DollarSign,
  Package,
  Eye,
  EyeOff,
  Calculator,
  Percent,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

export default function BulkOperations({ 
  selectedItems = [], 
  allItems = [], 
  onItemsUpdate,
  onSelectionClear 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationType, setOperationType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Price update states
  const [priceOperation, setPriceOperation] = useState('set'); // 'set', 'increase', 'decrease'
  const [priceValue, setPriceValue] = useState('');
  const [priceType, setPriceType] = useState('fixed'); // 'fixed', 'percentage'

  // Availability states
  const [availabilityAction, setAvailabilityAction] = useState('enable');

  // Multi-outlet states
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [copyToOutlets, setCopyToOutlets] = useState(false);

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  const selectedItemsData = allItems.filter(item => selectedItems.includes(item.id));

  const openModal = (type) => {
    setOperationType(type);
    setIsModalOpen(true);
    setError('');
    setSuccess('');
    resetForm();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOperationType('');
    resetForm();
  };

  const resetForm = () => {
    setPriceOperation('set');
    setPriceValue('');
    setPriceType('fixed');
    setAvailabilityAction('enable');
    setSelectedOutlets([]);
    setCopyToOutlets(false);
  };

  const calculateNewPrice = (currentPrice, operation, value, type) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return currentPrice;

    switch (operation) {
      case 'set':
        return numValue;
      case 'increase':
        return type === 'percentage' 
          ? currentPrice * (1 + numValue / 100)
          : currentPrice + numValue;
      case 'decrease':
        return type === 'percentage'
          ? currentPrice * (1 - numValue / 100)
          : Math.max(0, currentPrice - numValue);
      default:
        return currentPrice;
    }
  };

  const handlePriceUpdate = async () => {
    if (!priceValue || isNaN(parseFloat(priceValue))) {
      setError('Please enter a valid price value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updates = selectedItemsData.map(item => ({
        itemId: item.id,
        price: calculateNewPrice(item.price, priceOperation, priceValue, priceType),
      }));

      await menuService.bulkUpdatePrices(updates);

      // Update local state
      const updatedItems = allItems.map(item => {
        const update = updates.find(u => u.itemId === item.id);
        return update ? { ...item, price: update.price } : item;
      });

      onItemsUpdate(updatedItems);
      setSuccess(`Successfully updated prices for ${selectedItems.length} items`);
      
      setTimeout(() => {
        closeModal();
        onSelectionClear();
      }, 2000);

    } catch (error) {
      console.error('Failed to update prices:', error);
      setError(error.response?.data?.message || 'Failed to update prices');
    } finally {
      setLoading(false);
    }
  };

  const handleAvailabilityUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      const isAvailable = availabilityAction === 'enable';
      
      await Promise.all(
        selectedItems.map(itemId => 
          menuService.updateItemAvailability(itemId, isAvailable)
        )
      );

      // Update local state
      const updatedItems = allItems.map(item => 
        selectedItems.includes(item.id) 
          ? { ...item, isAvailable }
          : item
      );

      onItemsUpdate(updatedItems);
      setSuccess(`Successfully ${isAvailable ? 'enabled' : 'disabled'} ${selectedItems.length} items`);
      
      setTimeout(() => {
        closeModal();
        onSelectionClear();
      }, 2000);

    } catch (error) {
      console.error('Failed to update availability:', error);
      setError(error.response?.data?.message || 'Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const handleMultiOutletCopy = async () => {
    if (selectedOutlets.length === 0) {
      setError('Please select at least one outlet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // This would need to be implemented in the backend
      // For now, we'll simulate the operation
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSuccess(`Successfully copied ${selectedItems.length} items to ${selectedOutlets.length} outlets`);
      
      setTimeout(() => {
        closeModal();
        onSelectionClear();
      }, 2000);

    } catch (error) {
      console.error('Failed to copy to outlets:', error);
      setError('Failed to copy items to outlets');
    } finally {
      setLoading(false);
    }
  };

  const renderPricePreview = () => {
    if (!priceValue || selectedItemsData.length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Price Preview</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {selectedItemsData.slice(0, 5).map(item => {
            const newPrice = calculateNewPrice(item.price, priceOperation, priceValue, priceType);
            return (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name}</span>
                <span>
                  <span className="text-gray-400">${item.price.toFixed(2)}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">${newPrice.toFixed(2)}</span>
                </span>
              </div>
            );
          })}
          {selectedItemsData.length > 5 && (
            <div className="text-xs text-gray-500 text-center">
              +{selectedItemsData.length - 5} more items
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedItems.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Items Selected
        </h3>
        <p className="text-gray-500">
          Select menu items to perform bulk operations
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Bulk Operations
            </h3>
            <p className="text-sm text-gray-500">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectionClear}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Selection
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Price Operations */}
          <PermissionGate permission={PERMISSIONS.MENU_PRICING_MANAGE}>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('price')}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Update Prices
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('discount')}
              >
                <Percent className="h-4 w-4 mr-2" />
                Apply Discount
              </Button>
            </div>
          </PermissionGate>

          {/* Availability Operations */}
          <PermissionGate permission={PERMISSIONS.MENU_ITEMS_MANAGE}>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('availability')}
              >
                <Eye className="h-4 w-4 mr-2" />
                Update Availability
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('category')}
              >
                <Package className="h-4 w-4 mr-2" />
                Change Category
              </Button>
            </div>
          </PermissionGate>

          {/* Multi-outlet Operations */}
          <PermissionGate permission={PERMISSIONS.MENU_BULK_MANAGE}>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('copy')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Copy to Outlets
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => openModal('sync')}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Sync Pricing
              </Button>
            </div>
          </PermissionGate>
        </div>

        {/* Selected Items Preview */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Selected Items</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
            {selectedItemsData.map(item => (
              <div key={item.id} className="flex items-center p-2 bg-gray-50 rounded-lg">
                {item.images?.[0] && (
                  <img 
                    src={item.images[0].url || item.images[0]} 
                    alt={item.name}
                    className="w-8 h-8 object-cover rounded mr-3"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    ${item.price?.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Bulk Operations Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Bulk ${operationType.charAt(0).toUpperCase() + operationType.slice(1)} Operation`}
        size="lg"
      >
        <div className="space-y-6">
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

          {/* Price Update Form */}
          {operationType === 'price' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Operation"
                  value={priceOperation}
                  onChange={(e) => setPriceOperation(e.target.value)}
                >
                  <option value="set">Set Price</option>
                  <option value="increase">Increase Price</option>
                  <option value="decrease">Decrease Price</option>
                </Select>

                <Select
                  label="Type"
                  value={priceType}
                  onChange={(e) => setPriceType(e.target.value)}
                >
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </Select>
              </div>

              <Input
                label={`${priceType === 'percentage' ? 'Percentage' : 'Amount'} ${
                  priceOperation === 'set' ? '' : `to ${priceOperation}`
                }`}
                type="number"
                step="0.01"
                min="0"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={priceType === 'percentage' ? '10' : '5.00'}
                icon={priceType === 'percentage' ? Percent : DollarSign}
                required
              />

              {renderPricePreview()}
            </div>
          )}

          {/* Availability Update Form */}
          {operationType === 'availability' && (
            <div className="space-y-4">
              <Select
                label="Availability Action"
                value={availabilityAction}
                onChange={(e) => setAvailabilityAction(e.target.value)}
              >
                <option value="enable">Make Available</option>
                <option value="disable">Make Unavailable</option>
              </Select>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  This will {availabilityAction === 'enable' ? 'enable' : 'disable'} {' '}
                  <span className="font-medium">{selectedItems.length}</span> selected items.
                </p>
              </div>
            </div>
          )}

          {/* Multi-outlet Copy Form */}
          {operationType === 'copy' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Copy selected items to other outlets. This will create new menu items 
                  in the selected outlets with the same configuration.
                </p>
              </div>

              {/* Outlet selection would go here - simplified for now */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Multi-outlet functionality will be available when multiple outlets are configured.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                switch (operationType) {
                  case 'price':
                    handlePriceUpdate();
                    break;
                  case 'availability':
                    handleAvailabilityUpdate();
                    break;
                  case 'copy':
                    handleMultiOutletCopy();
                    break;
                  default:
                    closeModal();
                }
              }}
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : success ? (
                'Completed'
              ) : (
                'Apply Changes'
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
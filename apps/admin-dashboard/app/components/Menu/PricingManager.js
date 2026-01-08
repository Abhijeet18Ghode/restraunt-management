'use client';

import { useState, useEffect } from 'react';
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
  TrendingUp,
  TrendingDown,
  Calculator,
  History,
  AlertCircle,
  CheckCircle,
  Edit,
  Save,
  X,
} from 'lucide-react';

export default function PricingManager({ items = [], onItemsUpdate }) {
  const [editingPrices, setEditingPrices] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [showHistory, setShowHistory] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pricing rules state
  const [pricingRules, setPricingRules] = useState([]);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const { selectedOutlet } = useTenant();
  const { PERMISSIONS } = useRoleManager();

  useEffect(() => {
    loadPricingData();
  }, [selectedOutlet]);

  const loadPricingData = async () => {
    try {
      // Load pricing history and rules
      // This would be implemented in the backend
      setPriceHistory({});
      setPricingRules([]);
    } catch (error) {
      console.error('Failed to load pricing data:', error);
    }
  };

  const startEditing = (itemId, currentPrice) => {
    setEditingPrices({
      ...editingPrices,
      [itemId]: currentPrice.toString()
    });
  };

  const cancelEditing = (itemId) => {
    const { [itemId]: removed, ...rest } = editingPrices;
    setEditingPrices(rest);
  };

  const savePrice = async (itemId) => {
    const newPrice = parseFloat(editingPrices[itemId]);
    
    if (isNaN(newPrice) || newPrice < 0) {
      setError('Please enter a valid price');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await menuService.updateItemPrice(itemId, newPrice);
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, price: newPrice } : item
      );
      
      onItemsUpdate(updatedItems);
      cancelEditing(itemId);
      setSuccess('Price updated successfully');
      
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Failed to update price:', error);
      setError(error.response?.data?.message || 'Failed to update price');
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceChange = (currentPrice, previousPrice) => {
    if (!previousPrice) return null;
    
    const change = currentPrice - previousPrice;
    const percentage = (change / previousPrice) * 100;
    
    return {
      amount: change,
      percentage: percentage,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same'
    };
  };

  const getPriceChangeIcon = (direction) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-500" />;
    }
  };

  const showPriceHistory = (item) => {
    setSelectedItem(item);
    setShowHistory(true);
  };

  const applyPricingRule = async (rule) => {
    setLoading(true);
    setError('');

    try {
      // Apply pricing rule logic
      // This would be implemented based on the rule type
      setSuccess(`Applied pricing rule: ${rule.name}`);
      
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Failed to apply pricing rule:', error);
      setError('Failed to apply pricing rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Pricing Management</h2>
          <p className="text-sm text-gray-500">
            Manage menu item pricing and apply pricing rules
          </p>
        </div>
        
        <PermissionGate permission={PERMISSIONS.MENU_PRICING_MANAGE}>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowRulesModal(true)}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Pricing Rules
            </Button>
          </div>
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

      {/* Pricing Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price Change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const isEditing = editingPrices.hasOwnProperty(item.id);
                const priceChange = calculatePriceChange(item.price, item.previousPrice);

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.images?.[0] && (
                          <img 
                            src={item.images[0].url || item.images[0]} 
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.description?.substring(0, 50)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editingPrices[item.id]}
                            onChange={(e) => setEditingPrices({
                              ...editingPrices,
                              [item.id]: e.target.value
                            })}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => savePrice(item.id)}
                            disabled={loading}
                          >
                            <Save className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelEditing(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-semibold text-gray-900">
                            ${item.price?.toFixed(2)}
                          </span>
                          <PermissionGate permission={PERMISSIONS.MENU_PRICING_MANAGE}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditing(item.id, item.price)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </PermissionGate>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {priceChange && (
                        <div className="flex items-center space-x-1">
                          {getPriceChangeIcon(priceChange.direction)}
                          <span className={`text-sm ${
                            priceChange.direction === 'up' ? 'text-green-600' :
                            priceChange.direction === 'down' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {priceChange.direction !== 'same' && (
                              <>
                                ${Math.abs(priceChange.amount).toFixed(2)} 
                                ({Math.abs(priceChange.percentage).toFixed(1)}%)
                              </>
                            )}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => showPriceHistory(item)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Price History Modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        title={`Price History - ${selectedItem?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="text-center py-8">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Price history tracking will be available in the next update
            </p>
          </div>
        </div>
      </Modal>

      {/* Pricing Rules Modal */}
      <Modal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        title="Pricing Rules"
        size="lg"
      >
        <div className="space-y-6">
          <div className="text-center py-8">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Automated Pricing Rules
            </h3>
            <p className="text-gray-500">
              Set up automated pricing rules based on cost, competition, and demand
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Cost-Plus Pricing</h4>
              <p className="text-sm text-gray-500 mb-3">
                Automatically set prices based on ingredient costs plus margin
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Dynamic Pricing</h4>
              <p className="text-sm text-gray-500 mb-3">
                Adjust prices based on demand, time of day, and inventory levels
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Competitor Pricing</h4>
              <p className="text-sm text-gray-500 mb-3">
                Monitor and match competitor prices automatically
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium text-gray-900 mb-2">Promotional Pricing</h4>
              <p className="text-sm text-gray-500 mb-3">
                Schedule automatic discounts and promotional pricing
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Configure
              </Button>
            </Card>
          </div>
        </div>
      </Modal>
    </div>
  );
}
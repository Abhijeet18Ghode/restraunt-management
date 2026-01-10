'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';

const StockTransferManager = ({ outletId = null }) => {
  const [transfers, setTransfers] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    fromOutletId: '',
    toOutletId: '',
    expectedDate: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, [outletId, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersResponse, outletsResponse, itemsResponse] = await Promise.all([
        inventoryService.getStockTransfers(outletId, selectedStatus === 'all' ? null : selectedStatus),
        // Note: This would need an outlets service
        Promise.resolve({ data: [
          { id: '1', name: 'Main Branch', address: '123 Main St' },
          { id: '2', name: 'Downtown Branch', address: '456 Downtown Ave' },
          { id: '3', name: 'Mall Branch', address: '789 Mall Blvd' }
        ]}),
        inventoryService.getInventoryItems(outletId)
      ]);

      setTransfers(transfersResponse.data || []);
      setOutlets(outletsResponse.data || []);
      setInventoryItems(itemsResponse.data || []);
    } catch (err) {
      setError('Failed to load stock transfer data');
      console.error('Stock transfer loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const transferData = {
        ...formData,
        totalItems: formData.items.length,
        totalQuantity: formData.items.reduce((sum, item) => sum + item.quantity, 0)
      };

      if (editingTransfer) {
        await inventoryService.updateStockTransfer(editingTransfer.id, transferData);
      } else {
        await inventoryService.createStockTransfer(transferData);
      }
      
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(editingTransfer ? 'Failed to update stock transfer' : 'Failed to create stock transfer');
      console.error('Stock transfer save error:', err);
    }
  };

  const handleApprove = async (transferId) => {
    try {
      await inventoryService.approveStockTransfer(transferId);
      await loadData();
    } catch (err) {
      setError('Failed to approve stock transfer');
      console.error('Stock transfer approval error:', err);
    }
  };

  const handleReceive = async (transferId, receivedItems) => {
    try {
      await inventoryService.receiveStockTransfer(transferId, receivedItems);
      await loadData();
    } catch (err) {
      setError('Failed to receive stock transfer');
      console.error('Stock transfer receive error:', err);
    }
  };

  const handleEdit = (transfer) => {
    setEditingTransfer(transfer);
    setFormData({
      fromOutletId: transfer.fromOutletId || '',
      toOutletId: transfer.toOutletId || '',
      expectedDate: transfer.expectedDate ? 
        new Date(transfer.expectedDate).toISOString().split('T')[0] : '',
      notes: transfer.notes || '',
      items: transfer.items || []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransfer(null);
    setFormData({
      fromOutletId: '',
      toOutletId: '',
      expectedDate: '',
      notes: '',
      items: []
    });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTransferItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        inventoryItemId: '',
        quantity: 0,
        notes: ''
      }]
    }));
  };

  const updateTransferItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeTransferItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-blue-600 bg-blue-50';
      case 'in_transit': return 'text-purple-600 bg-purple-50';
      case 'received': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredTransfers = transfers.filter(transfer => 
    transfer.transferNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.fromOutlet?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transfer.toOutlet?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h2 className="text-2xl font-bold text-gray-900">Stock Transfers</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Transfer
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Transfers
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by transfer number or outlet..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
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
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="in_transit">In Transit</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Transfers Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transfer #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  From / To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransfers.map((transfer) => (
                <tr key={transfer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {transfer.transferNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>From: {transfer.fromOutlet?.name || 'Unknown'}</div>
                      <div>To: {transfer.toOutlet?.name || 'Unknown'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transfer.status)}`}>
                      {transfer.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transfer.totalItems || 0} items
                    <div className="text-sm text-gray-500">
                      {transfer.totalQuantity || 0} units
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transfer.expectedDate ? 
                      new Date(transfer.expectedDate).toLocaleDateString() : 
                      'Not set'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleEdit(transfer)}
                      >
                        View
                      </button>
                      {transfer.status === 'pending' && (
                        <button 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleApprove(transfer.id)}
                        >
                          Approve
                        </button>
                      )}
                      {transfer.status === 'in_transit' && (
                        <button 
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => {/* Handle receive modal */}}
                        >
                          Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransfers.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No stock transfers found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Transfer
          </button>
        </div>
      )}

      {/* Create/Edit Stock Transfer Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingTransfer ? 'Edit Stock Transfer' : 'Create Stock Transfer'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="From Outlet"
              value={formData.fromOutletId}
              onChange={(value) => handleInputChange('fromOutletId', value)}
              options={outlets.map(outlet => ({
                value: outlet.id,
                label: outlet.name
              }))}
              required
            />
            
            <Select
              label="To Outlet"
              value={formData.toOutletId}
              onChange={(value) => handleInputChange('toOutletId', value)}
              options={outlets.filter(outlet => outlet.id !== formData.fromOutletId).map(outlet => ({
                value: outlet.id,
                label: outlet.name
              }))}
              required
            />
            
            <Input
              label="Expected Date"
              type="date"
              value={formData.expectedDate}
              onChange={(value) => handleInputChange('expectedDate', value)}
            />
          </div>

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(value) => handleInputChange('notes', value)}
            rows={2}
          />

          {/* Transfer Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Transfer Items</h3>
              <button
                type="button"
                onClick={addTransferItem}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      label="Item"
                      value={item.inventoryItemId}
                      onChange={(value) => updateTransferItem(index, 'inventoryItemId', value)}
                      options={inventoryItems.map(invItem => ({
                        value: invItem.id,
                        label: `${invItem.name} (${invItem.sku || 'No SKU'})`
                      }))}
                      required
                    />
                    
                    <Input
                      label="Quantity"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(value) => updateTransferItem(index, 'quantity', parseInt(value) || 0)}
                      required
                    />
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeTransferItem(index)}
                        className="w-full bg-red-50 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <Input
                      label="Item Notes"
                      value={item.notes}
                      onChange={(value) => updateTransferItem(index, 'notes', value)}
                      placeholder="Special instructions for this item..."
                    />
                  </div>
                </div>
              ))}
            </div>

            {formData.items.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    Total Items: {formData.items.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Quantity: {formData.items.reduce((sum, item) => sum + (item.quantity || 0), 0)} units
                  </div>
                </div>
              </div>
            )}
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
              disabled={formData.items.length === 0}
            >
              {editingTransfer ? 'Update Transfer' : 'Create Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StockTransferManager;
'use client';

import { useState, useEffect } from 'react';
import { inventoryService } from '../../services/inventoryService';
import Modal from '../UI/Modal';
import Input from '../UI/Input';
import Select from '../UI/Select';
import TextArea from '../UI/TextArea';

const PurchaseOrderManager = ({ outletId = null }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    notes: '',
    items: []
  });

  useEffect(() => {
    loadData();
  }, [outletId, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersResponse, suppliersResponse, itemsResponse] = await Promise.all([
        inventoryService.getPurchaseOrders(selectedStatus === 'all' ? null : selectedStatus, outletId),
        inventoryService.getSuppliers(),
        inventoryService.getInventoryItems(outletId)
      ]);

      setPurchaseOrders(ordersResponse.data || []);
      setSuppliers(suppliersResponse.data || []);
      setInventoryItems(itemsResponse.data || []);
    } catch (err) {
      setError('Failed to load purchase order data');
      console.error('Purchase order loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const orderData = {
        ...formData,
        outletId,
        totalAmount: calculateTotalAmount()
      };

      if (editingOrder) {
        await inventoryService.updatePurchaseOrder(editingOrder.id, orderData);
      } else {
        await inventoryService.createPurchaseOrder(orderData);
      }
      
      await loadData();
      handleCloseModal();
    } catch (err) {
      setError(editingOrder ? 'Failed to update purchase order' : 'Failed to create purchase order');
      console.error('Purchase order save error:', err);
    }
  };

  const handleApprove = async (orderId) => {
    try {
      await inventoryService.approvePurchaseOrder(orderId);
      await loadData();
    } catch (err) {
      setError('Failed to approve purchase order');
      console.error('Purchase order approval error:', err);
    }
  };

  const handleReceive = async (orderId, receivedItems) => {
    try {
      await inventoryService.receivePurchaseOrder(orderId, receivedItems);
      await loadData();
    } catch (err) {
      setError('Failed to receive purchase order');
      console.error('Purchase order receive error:', err);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order);
    setFormData({
      supplierId: order.supplierId || '',
      expectedDeliveryDate: order.expectedDeliveryDate ? 
        new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
      notes: order.notes || '',
      items: order.items || []
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOrder(null);
    setFormData({
      supplierId: '',
      expectedDeliveryDate: '',
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

  const addOrderItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        inventoryItemId: '',
        quantity: 0,
        unitPrice: 0,
        notes: ''
      }]
    }));
  };

  const updateOrderItem = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeOrderItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotalAmount = () => {
    return formData.items.reduce((total, item) => 
      total + (item.quantity * item.unitPrice), 0
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-blue-600 bg-blue-50';
      case 'ordered': return 'text-purple-600 bg-purple-50';
      case 'received': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredOrders = purchaseOrders.filter(order => 
    order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Purchase Order
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
              Search Orders
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order number or supplier..."
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
              <option value="ordered">Ordered</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.orderNumber}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.supplier?.name || 'Unknown Supplier'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.totalAmount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.expectedDeliveryDate ? 
                      new Date(order.expectedDeliveryDate).toLocaleDateString() : 
                      'Not set'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleEdit(order)}
                      >
                        View
                      </button>
                      {order.status === 'pending' && (
                        <button 
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleApprove(order.id)}
                        >
                          Approve
                        </button>
                      )}
                      {order.status === 'ordered' && (
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

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No purchase orders found</div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Purchase Order
          </button>
        </div>
      )}

      {/* Create/Edit Purchase Order Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Supplier"
              value={formData.supplierId}
              onChange={(value) => handleInputChange('supplierId', value)}
              options={suppliers.map(supplier => ({
                value: supplier.id,
                label: supplier.name
              }))}
              required
            />
            
            <Input
              label="Expected Delivery Date"
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={(value) => handleInputChange('expectedDeliveryDate', value)}
            />
          </div>

          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(value) => handleInputChange('notes', value)}
            rows={2}
          />

          {/* Order Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Order Items</h3>
              <button
                type="button"
                onClick={addOrderItem}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Select
                      label="Item"
                      value={item.inventoryItemId}
                      onChange={(value) => updateOrderItem(index, 'inventoryItemId', value)}
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
                      onChange={(value) => updateOrderItem(index, 'quantity', parseInt(value) || 0)}
                      required
                    />
                    
                    <Input
                      label="Unit Price ($)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(value) => updateOrderItem(index, 'unitPrice', parseFloat(value) || 0)}
                      required
                    />
                    
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
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
                      onChange={(value) => updateOrderItem(index, 'notes', value)}
                      placeholder="Special instructions for this item..."
                    />
                  </div>
                  
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {formData.items.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-right">
                  <div className="text-lg font-semibold text-gray-900">
                    Total Amount: ${calculateTotalAmount().toFixed(2)}
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
              {editingOrder ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseOrderManager;
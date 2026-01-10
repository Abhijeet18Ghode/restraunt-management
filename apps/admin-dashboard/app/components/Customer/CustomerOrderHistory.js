'use client';

import { useState, useEffect } from 'react';
import CustomerService from '../../services/customerService';
import { 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  Clock, 
  Star,
  Eye,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Utensils,
  MapPin
} from 'lucide-react';

const CustomerOrderHistory = ({ customerId, customerName }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const customerService = new CustomerService();

  useEffect(() => {
    if (customerId) {
      loadOrderHistory();
    }
  }, [customerId, currentPage, filterStatus, sortBy]);

  const loadOrderHistory = async () => {
    try {
      setLoading(true);
      const response = await customerService.getCustomerOrderHistory(
        customerId, 
        currentPage, 
        10
      );
      
      setOrders(response.data || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError('Failed to load order history');
      console.error('Order history loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'delivered': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getOrderTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'dine_in': return <Utensils className="w-4 h-4" />;
      case 'takeaway': return <Package className="w-4 h-4" />;
      case 'delivery': return <MapPin className="w-4 h-4" />;
      default: return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatOrderType = (type) => {
    return type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const calculateOrderStats = () => {
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const completedOrders = orders.filter(order => order.status?.toLowerCase() === 'completed').length;
    
    return {
      totalOrders,
      totalSpent,
      averageOrderValue,
      completedOrders
    };
  };

  const stats = calculateOrderStats();

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
        <h3 className="text-xl font-bold text-gray-900">
          Order History - {customerName}
        </h3>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Order Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total Orders</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalOrders}</div>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Total Spent</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</div>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Average Order</div>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageOrderValue)}</div>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Completed</div>
              <div className="text-2xl font-bold text-gray-900">{stats.completedOrders}</div>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Orders</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="in_progress">In Progress</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadOrderHistory}
              className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900">Recent Orders</h4>
        </div>
        
        <div className="divide-y divide-gray-200">
          {orders.map((order) => (
            <div key={order.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getOrderTypeIcon(order.type)}
                    <div>
                      <div className="font-medium text-gray-900">
                        Order #{order.orderNumber || order.id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatOrderType(order.type)} • {formatDate(order.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(order.total)}
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                      {order.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => toggleOrderExpansion(order.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {expandedOrder === order.id ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Order Details */}
              {expandedOrder === order.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Order Items */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Order Items</h5>
                      <div className="space-y-2">
                        {order.items?.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.modifications && item.modifications.length > 0 && (
                                <div className="text-gray-500 text-xs">
                                  {item.modifications.join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div>{item.quantity}x {formatCurrency(item.price)}</div>
                              <div className="font-medium">{formatCurrency(item.quantity * item.price)}</div>
                            </div>
                          </div>
                        )) || (
                          <div className="text-gray-500 text-sm">No items details available</div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Order Summary</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span>{formatCurrency(order.subtotal)}</span>
                        </div>
                        {order.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tax:</span>
                            <span>{formatCurrency(order.tax)}</span>
                          </div>
                        )}
                        {order.tip > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tip:</span>
                            <span>{formatCurrency(order.tip)}</span>
                          </div>
                        )}
                        {order.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{formatCurrency(order.discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-2">
                          <span>Total:</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>

                      {/* Additional Order Info */}
                      <div className="mt-4 space-y-2 text-sm">
                        {order.table && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Utensils className="w-4 h-4" />
                            <span>Table: {order.table}</span>
                          </div>
                        )}
                        {order.estimatedTime && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>Estimated: {order.estimatedTime} mins</span>
                          </div>
                        )}
                        {order.specialInstructions && (
                          <div className="text-gray-600">
                            <span className="font-medium">Special Instructions:</span>
                            <div className="mt-1 text-gray-500">{order.specialInstructions}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex space-x-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>View Full Details</span>
                    </button>
                    {order.status?.toLowerCase() === 'completed' && (
                      <button className="text-green-600 hover:text-green-800 text-sm font-medium">
                        Reorder
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 text-lg">No orders found</div>
            <div className="text-gray-400 text-sm">This customer hasn't placed any orders yet</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderHistory;
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { posService } from '../services/posService';
import TouchButton from '../components/UI/TouchButton';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  LogOut,
  Store
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const { user, logout, outletId } = useAuth();

  useEffect(() => {
    if (outletId) {
      loadOrders();
      
      // Refresh orders every 30 seconds
      const interval = setInterval(loadOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [outletId]);

  // Update time every second for accurate timing
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadOrders = async () => {
    try {
      const kotData = await posService.getKOTs(outletId);
      setOrders(kotData.filter(kot => kot.status !== 'completed'));
    } catch (error) {
      console.error('Failed to load kitchen orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (kotId, newStatus) => {
    try {
      await posService.updateKOTStatus(kotId, newStatus);
      await loadOrders(); // Refresh the list
      toast.success(`Order marked as ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'kitchen-order-pending';
      case 'preparing':
        return 'kitchen-order-preparing';
      case 'ready':
        return 'kitchen-order-ready';
      default:
        return 'kitchen-order-pending';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'New Order';
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready';
      default:
        return 'Unknown';
    }
  };

  const getElapsedTime = (createdAt) => {
    const elapsed = Math.floor((currentTime - new Date(createdAt)) / 1000 / 60);
    return elapsed;
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return null;
    }
  };

  const getNextStatusText = (currentStatus) => {
    switch (currentStatus) {
      case 'pending':
        return 'Start Preparing';
      case 'preparing':
        return 'Mark Ready';
      case 'ready':
        return 'Complete Order';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">Kitchen Display</h1>
                  <p className="text-sm text-gray-500">{user?.outletName}</p>
                </div>
              </div>

              <TouchButton
                variant="secondary"
                size="sm"
                onClick={loadOrders}
                className="flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </TouchButton>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">
                  {orders.length} active orders
                </div>
              </div>

              <TouchButton
                variant="secondary"
                size="sm"
                onClick={logout}
                className="p-2"
              >
                <LogOut className="h-4 w-4" />
              </TouchButton>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="p-6">
        {orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👨‍🍳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All caught up!</h2>
            <p className="text-gray-600">No orders in the kitchen right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map(order => {
              const elapsedMinutes = getElapsedTime(order.createdAt);
              const isUrgent = elapsedMinutes > 15;
              const nextStatus = getNextStatus(order.status);
              const nextStatusText = getNextStatusText(order.status);

              return (
                <div
                  key={order.id}
                  className={`kitchen-order-card ${getStatusColor(order.status)} ${
                    isUrgent ? 'ring-2 ring-red-500' : ''
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Order #{order.orderNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Table {order.tableNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {getStatusText(order.status)}
                      </div>
                      <div className={`text-sm mt-1 flex items-center ${
                        isUrgent ? 'text-red-600 font-bold' : 'text-gray-600'
                      }`}>
                        <Clock className="h-3 w-3 mr-1" />
                        {elapsedMinutes}m
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{item.name}</span>
                          {item.notes && (
                            <p className="text-xs text-gray-600 italic">{item.notes}</p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-700 ml-2">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Special Instructions */}
                  {order.specialInstructions && (
                    <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-800 mb-1">
                        Special Instructions:
                      </p>
                      <p className="text-sm text-yellow-700">{order.specialInstructions}</p>
                    </div>
                  )}

                  {/* Action Button */}
                  {nextStatus && (
                    <TouchButton
                      variant={order.status === 'ready' ? 'success' : 'primary'}
                      className="w-full"
                      onClick={() => updateOrderStatus(order.id, nextStatus)}
                    >
                      {order.status === 'ready' ? (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-2" />
                      )}
                      {nextStatusText}
                    </TouchButton>
                  )}

                  {/* Urgent Indicator */}
                  {isUrgent && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
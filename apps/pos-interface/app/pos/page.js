'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { useRouter } from 'next/navigation';
import MenuGrid from '../components/Menu/MenuGrid';
import OrderCart from '../components/Order/OrderCart';
import TableSelector from '../components/Tables/TableSelector';
import PaymentModal from '../components/Payment/PaymentModal';
import TouchButton from '../components/UI/TouchButton';
import { 
  LogOut, 
  Wifi, 
  WifiOff, 
  Users, 
  CreditCard,
  Settings,
  Clock,
  AlertCircle
} from 'lucide-react';
import { usePOS } from '../contexts/POSContext';
import toast, { Toaster } from 'react-hot-toast';

export default function POSPage() {
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { user, logout, loading } = useAuth();
  const { isOnline, pendingOrders } = useOffline();
  const { currentOrder, selectedTable } = usePOS();
  const router = useRouter();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handlePayment = () => {
    if (currentOrder.items.length === 0) {
      toast.error('Add items to the order first');
      return;
    }
    
    if (!selectedTable) {
      toast.error('Select a table first');
      setShowTableSelector(true);
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('Order completed successfully!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">POS System</h1>
                  <p className="text-sm text-gray-500">{user.outletName}</p>
                </div>
              </div>

              {/* Connection Status */}
              <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isOnline ? (
                  <Wifi className="h-4 w-4 mr-1" />
                ) : (
                  <WifiOff className="h-4 w-4 mr-1" />
                )}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {/* Pending Orders Alert */}
              {pendingOrders.length > 0 && (
                <div className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {pendingOrders.length} pending sync
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-4">
              {/* Current Time */}
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.role}</div>
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
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Menu Section */}
        <div className="flex-1 flex flex-col">
          <MenuGrid />
        </div>

        {/* Order Section */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
          <OrderCart />
          
          {/* Action Buttons */}
          <div className="flex-shrink-0 p-4 border-t border-gray-200 space-y-3">
            {/* Table Selection */}
            <TouchButton
              variant="secondary"
              className="w-full justify-between"
              onClick={() => setShowTableSelector(true)}
            >
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {selectedTable ? `Table ${selectedTable.number}` : 'Select Table'}
              </div>
              {selectedTable && (
                <div className="text-xs text-gray-500">
                  {selectedTable.capacity} seats
                </div>
              )}
            </TouchButton>

            {/* Payment Button */}
            <TouchButton
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handlePayment}
              disabled={currentOrder.items.length === 0}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Process Payment
              {currentOrder.total > 0 && (
                <span className="ml-2 font-bold">
                  ${currentOrder.total.toFixed(2)}
                </span>
              )}
            </TouchButton>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TableSelector
        isOpen={showTableSelector}
        onClose={() => setShowTableSelector(false)}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
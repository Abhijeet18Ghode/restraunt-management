'use client';

import { useState } from 'react';
import { usePOS } from '../../contexts/POSContext';
import { useOffline } from '../../contexts/OfflineContext';
import Modal from '../UI/Modal';
import TouchButton from '../UI/TouchButton';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Building2,
  Check,
  Printer 
} from 'lucide-react';
import toast from 'react-hot-toast';

const paymentMethods = [
  {
    id: 'cash',
    name: 'Cash',
    icon: Banknote,
    description: 'Cash payment',
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: CreditCard,
    description: 'Card payment',
  },
  {
    id: 'digital_wallet',
    name: 'Digital Wallet',
    icon: Smartphone,
    description: 'Mobile payment',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: Building2,
    description: 'Direct transfer',
  },
];

export default function PaymentModal({ isOpen, onClose, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  
  const { 
    currentOrder, 
    selectedTable, 
    processPayment,
    isProcessingPayment 
  } = usePOS();
  
  const { isOnline, addPendingOrder } = useOffline();

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!selectedTable) {
      toast.error('Please select a table');
      return;
    }

    if (selectedMethod === 'cash') {
      const received = parseFloat(cashReceived);
      if (!received || received < currentOrder.total) {
        toast.error('Cash received must be at least the order total');
        return;
      }
    }

    setProcessing(true);

    try {
      let result;
      
      if (isOnline) {
        // Process online
        result = await processPayment();
      } else {
        // Store for offline sync
        result = addPendingOrder({
          ...currentOrder,
          paymentMethod: selectedMethod,
          cashReceived: selectedMethod === 'cash' ? parseFloat(cashReceived) : null,
        });
        toast.success('Order saved for sync when online');
      }

      setCompletedOrder(result);
      setShowReceipt(true);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setCashReceived('');
    setShowReceipt(false);
    setCompletedOrder(null);
    onClose();
  };

  const calculateChange = () => {
    if (selectedMethod !== 'cash' || !cashReceived) return 0;
    const received = parseFloat(cashReceived);
    return Math.max(0, received - currentOrder.total);
  };

  const printReceipt = () => {
    // In a real implementation, this would interface with a receipt printer
    toast.success('Receipt sent to printer');
  };

  if (showReceipt && completedOrder) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Payment Successful"
        size="md"
      >
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-green-600" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Payment Completed
            </h3>
            <p className="text-gray-600">
              Order #{completedOrder.orderNumber || completedOrder.id}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Total Paid:</span>
              <span className="font-semibold">${currentOrder.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-semibold capitalize">{selectedMethod?.replace('_', ' ')}</span>
            </div>
            {selectedMethod === 'cash' && calculateChange() > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span className="font-semibold">${calculateChange().toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <TouchButton
              variant="secondary"
              onClick={printReceipt}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </TouchButton>
            <TouchButton
              variant="primary"
              onClick={handleClose}
              className="flex-1"
            >
              New Order
            </TouchButton>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Process Payment"
      size="lg"
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Table:</span>
              <span className="font-medium">{selectedTable?.number}</span>
            </div>
            <div className="flex justify-between">
              <span>Items:</span>
              <span className="font-medium">{currentOrder.items.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${currentOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>${currentOrder.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
              <span>Total:</span>
              <span className="text-primary-600">${currentOrder.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
              <p className="text-sm text-yellow-800">
                You're offline. Orders will be saved and synced when connection is restored.
              </p>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div>
          <h4 className="font-medium text-gray-900 mb-4">Select Payment Method</h4>
          <div className="grid grid-cols-2 gap-4">
            {paymentMethods.map(method => {
              const Icon = method.icon;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`payment-method-btn ${
                    selectedMethod === method.id ? 'payment-method-btn-selected' : ''
                  }`}
                >
                  <Icon className="h-8 w-8 mb-2 text-gray-600" />
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{method.name}</div>
                    <div className="text-xs text-gray-500">{method.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Payment Details */}
        {selectedMethod === 'cash' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cash Received
              </label>
              <input
                type="number"
                step="0.01"
                min={currentOrder.total}
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="input-touch"
                placeholder={`Minimum: $${currentOrder.total.toFixed(2)}`}
              />
            </div>
            
            {cashReceived && parseFloat(cashReceived) >= currentOrder.total && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-800 font-medium">Change to give:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${calculateChange().toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <TouchButton
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
            disabled={processing || isProcessingPayment}
          >
            Cancel
          </TouchButton>
          <TouchButton
            variant="primary"
            onClick={handlePayment}
            className="flex-1"
            loading={processing || isProcessingPayment}
            disabled={!selectedMethod || (selectedMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < currentOrder.total))}
          >
            Process Payment
          </TouchButton>
        </div>
      </div>
    </Modal>
  );
}
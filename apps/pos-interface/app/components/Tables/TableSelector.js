'use client';

import { useState, useEffect } from 'react';
import { usePOS } from '../../contexts/POSContext';
import { useAuth } from '../../contexts/AuthContext';
import { posService } from '../../services/posService';
import Modal from '../UI/Modal';
import TouchButton from '../UI/TouchButton';
import { Users, Clock } from 'lucide-react';

export default function TableSelector({ isOpen, onClose }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const { selectedTable, setTable } = usePOS();
  const { outletId } = useAuth();

  useEffect(() => {
    if (isOpen && outletId) {
      loadTables();
    }
  }, [isOpen, outletId]);

  const loadTables = async () => {
    try {
      setLoading(true);
      const tablesData = await posService.getTables(outletId);
      setTables(tablesData);
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (table) => {
    setTable(table);
    onClose();
  };

  const getTableStatusClass = (table) => {
    if (selectedTable?.id === table.id) {
      return 'table-btn-selected';
    }
    
    switch (table.status) {
      case 'available':
        return 'table-btn-available';
      case 'occupied':
        return 'table-btn-occupied';
      case 'reserved':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 focus:ring-yellow-500';
      case 'cleaning':
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-500';
      default:
        return 'table-btn-available';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      case 'cleaning':
        return 'Cleaning';
      default:
        return 'Unknown';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Table"
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Selection */}
          {selectedTable && (
            <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-primary-900">
                    Currently Selected: Table {selectedTable.number}
                  </h4>
                  <p className="text-sm text-primary-700">
                    Capacity: {selectedTable.capacity} guests
                  </p>
                </div>
                <TouchButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setTable(null)}
                >
                  Clear Selection
                </TouchButton>
              </div>
            </div>
          )}

          {/* Tables Grid */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {tables.map(table => (
              <button
                key={table.id}
                onClick={() => handleTableSelect(table)}
                disabled={table.status === 'occupied' && selectedTable?.id !== table.id}
                className={`table-btn ${getTableStatusClass(table)} ${
                  table.status === 'occupied' && selectedTable?.id !== table.id
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
              >
                <div className="text-lg font-bold mb-1">
                  {table.number}
                </div>
                <div className="text-xs">
                  <Users className="h-3 w-3 inline mr-1" />
                  {table.capacity}
                </div>
                <div className="text-xs mt-1">
                  {getStatusText(table.status)}
                </div>
                
                {table.status === 'occupied' && table.orderStartTime && (
                  <div className="text-xs mt-1 flex items-center justify-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {Math.floor((Date.now() - new Date(table.orderStartTime)) / 60000)}m
                  </div>
                )}
              </button>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🪑</div>
              <p className="text-lg font-medium">No tables available</p>
              <p className="text-sm">Contact your administrator to set up tables</p>
            </div>
          )}

          {/* Legend */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Table Status Legend:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
                Available
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
                Occupied
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                Reserved
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded mr-2"></div>
                Cleaning
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

/**
 * Inventory Status Indicator Component
 * Shows real-time inventory status for menu items
 */
export default function InventoryStatusIndicator({ 
  itemId, 
  currentStock = 0, 
  minStock = 5, 
  maxStock = 100,
  unit = 'units',
  showLabel = true,
  size = 'sm',
  className = ''
}) {
  const [status, setStatus] = useState('unknown');
  const [stockLevel, setStockLevel] = useState(currentStock);

  // Determine status based on stock levels
  useEffect(() => {
    if (stockLevel <= 0) {
      setStatus('out_of_stock');
    } else if (stockLevel <= minStock) {
      setStatus('low_stock');
    } else if (stockLevel >= maxStock * 0.8) {
      setStatus('in_stock');
    } else {
      setStatus('moderate_stock');
    }
  }, [stockLevel, minStock, maxStock]);

  // Update stock level when prop changes
  useEffect(() => {
    setStockLevel(currentStock);
  }, [currentStock]);

  const getStatusConfig = () => {
    switch (status) {
      case 'out_of_stock':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Out of Stock',
          description: 'Item is not available'
        };
      case 'low_stock':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Low Stock',
          description: `Only ${stockLevel} ${unit} remaining`
        };
      case 'moderate_stock':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Moderate Stock',
          description: `${stockLevel} ${unit} available`
        };
      case 'in_stock':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'In Stock',
          description: `${stockLevel} ${unit} available`
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const iconSize = sizeClasses[size] || sizeClasses.sm;

  if (!showLabel) {
    return (
      <div 
        className={`inline-flex items-center ${className}`}
        title={config.description}
      >
        <Icon className={`${iconSize} ${config.color}`} />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <Icon className={`${iconSize} ${config.color}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-gray-500">
          {stockLevel} {unit}
        </span>
      </div>
    </div>
  );
}

/**
 * Inventory Status Badge Component
 * Compact badge version for tables and lists
 */
export function InventoryStatusBadge({ 
  itemId, 
  currentStock = 0, 
  minStock = 5,
  className = ''
}) {
  const getStatusInfo = () => {
    if (currentStock <= 0) {
      return {
        label: 'Out',
        className: 'bg-red-100 text-red-800 border-red-200'
      };
    } else if (currentStock <= minStock) {
      return {
        label: 'Low',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      };
    } else {
      return {
        label: 'OK',
        className: 'bg-green-100 text-green-800 border-green-200'
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <span 
      className={`
        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border
        ${statusInfo.className} ${className}
      `}
      title={`${currentStock} units in stock`}
    >
      {statusInfo.label}
    </span>
  );
}

/**
 * Stock Level Progress Bar
 * Visual representation of stock levels
 */
export function StockLevelBar({ 
  currentStock = 0, 
  minStock = 5, 
  maxStock = 100,
  className = ''
}) {
  const percentage = Math.min((currentStock / maxStock) * 100, 100);
  
  const getBarColor = () => {
    if (currentStock <= 0) return 'bg-red-500';
    if (currentStock <= minStock) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{currentStock}</span>
        <span>{maxStock}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Min: {minStock}</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}
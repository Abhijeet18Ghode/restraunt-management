'use client';

import { useState, useEffect, useRef } from 'react';
import CustomerService from '../../services/customerService';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Star,
  Heart,
  Calendar,
  TrendingUp,
  X
} from 'lucide-react';

const CustomerSearch = ({ outletId, onCustomerSelect, placeholder = "Search customers..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const customerService = new CustomerService();

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, outletId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    try {
      setLoading(true);
      const response = await customerService.searchCustomers(outletId, searchTerm);
      setSearchResults(response.data || []);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Customer search error:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (!showResults || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleCustomerSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleCustomerSelect = (customer) => {
    setSearchTerm(`${customer.firstName} ${customer.lastName}`);
    setShowResults(false);
    setSelectedIndex(-1);
    if (onCustomerSelect) {
      onCustomerSelect(customer);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    if (onCustomerSelect) {
      onCustomerSelect(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getLoyaltyStatusColor = (status) => {
    switch (status) {
      case 'VIP': return 'text-purple-600 bg-purple-50';
      case 'Gold': return 'text-yellow-600 bg-yellow-50';
      case 'Silver': return 'text-gray-600 bg-gray-50';
      case 'Bronze': return 'text-orange-600 bg-orange-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((customer, index) => (
                <div
                  key={customer.id}
                  onClick={() => handleCustomerSelect(customer)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div className="flex items-center space-x-4">
                            {customer.email && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </div>
                          {customer.address?.city && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{customer.address.city}, {customer.address.state}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {customer.loyaltyStatus && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLoyaltyStatusColor(customer.loyaltyStatus)} mb-1`}>
                          {customer.loyaltyStatus}
                        </span>
                      )}
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex items-center space-x-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>{formatCurrency(customer.lifetimeValue)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3" />
                          <span>{customer.loyaltyPoints || 0} pts</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Customer Info */}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Customer since {formatDate(customer.createdAt)}</span>
                      </div>
                      {customer.lastOrderDate && (
                        <div className="flex items-center space-x-1">
                          <span>Last order: {formatDate(customer.lastOrderDate)}</span>
                        </div>
                      )}
                    </div>
                    
                    {customer.totalOrders && (
                      <div className="mt-1 text-xs text-gray-500">
                        {customer.totalOrders} orders • Avg: {formatCurrency(customer.averageOrderValue)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm.trim().length >= 2 && !loading ? (
            <div className="px-4 py-6 text-center text-gray-500">
              <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <div>No customers found</div>
              <div className="text-sm">Try searching with a different term</div>
            </div>
          ) : null}
          
          {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
            <div className="px-4 py-3 text-center text-gray-500 text-sm">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
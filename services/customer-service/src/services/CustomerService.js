const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Customer Management service for handling customer operations
 */
class CustomerService {
  constructor(dbManager) {
    this.db = dbManager;
    this.customerData = new Map(); // In-memory storage for demo
    this.orderHistory = new Map(); // Customer order history
  }

  /**
   * Create a new customer profile
   */
  async createCustomer(tenantId, customerData) {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth,
      address,
      preferences = {},
      source = 'DIRECT' // DIRECT, ONLINE, REFERRAL
    } = customerData;

    try {
      // Validate required fields
      if (!firstName || !lastName) {
        throw new ValidationError('First name and last name are required');
      }

      if (!email && !phone) {
        throw new ValidationError('Either email or phone number is required');
      }

      // Validate email format if provided
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new ValidationError('Invalid email format');
        }

        // Check if email already exists
        const existingCustomer = await this.findCustomerByEmail(tenantId, email);
        if (existingCustomer) {
          throw new ValidationError('Email already exists');
        }
      }

      // Validate phone format if provided
      if (phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(phone)) {
          throw new ValidationError('Invalid phone number format');
        }

        // Check if phone already exists
        const existingCustomer = await this.findCustomerByPhone(tenantId, phone);
        if (existingCustomer) {
          throw new ValidationError('Phone number already exists');
        }
      }

      // Generate customer ID
      const customerId = `customer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create customer record
      const customer = {
        id: customerId,
        tenantId,
        firstName,
        lastName,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address,
        preferences,
        source,
        isActive: true,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastOrderDate: null,
        loyaltyPoints: 0,
        loyaltyTier: 'BRONZE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store customer data
      const customerKey = `${tenantId}:${customerId}`;
      this.customerData.set(customerKey, customer);

      return createApiResponse(customer, 'Customer created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create customer', error.message);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(tenantId, customerId) {
    try {
      const customerKey = `${tenantId}:${customerId}`;
      const customer = this.customerData.get(customerKey);

      if (!customer) {
        throw new ResourceNotFoundError('Customer', customerId);
      }

      return createApiResponse(customer, 'Customer retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get customer', error.message);
    }
  }

  /**
   * Update customer profile
   */
  async updateCustomer(tenantId, customerId, updateData) {
    try {
      const customerKey = `${tenantId}:${customerId}`;
      const customer = this.customerData.get(customerKey);

      if (!customer) {
        throw new ResourceNotFoundError('Customer', customerId);
      }

      // Fields that can be updated
      const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 
        'address', 'preferences', 'isActive'
      ];

      // Validate email if being updated
      if (updateData.email && updateData.email !== customer.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.email)) {
          throw new ValidationError('Invalid email format');
        }

        const existingCustomer = await this.findCustomerByEmail(tenantId, updateData.email);
        if (existingCustomer && existingCustomer.id !== customerId) {
          throw new ValidationError('Email already exists');
        }
      }

      // Validate phone if being updated
      if (updateData.phone && updateData.phone !== customer.phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        if (!phoneRegex.test(updateData.phone)) {
          throw new ValidationError('Invalid phone number format');
        }

        const existingCustomer = await this.findCustomerByPhone(tenantId, updateData.phone);
        if (existingCustomer && existingCustomer.id !== customerId) {
          throw new ValidationError('Phone number already exists');
        }
      }

      // Update allowed fields
      const updatedCustomer = { ...customer };
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updatedCustomer[field] = updateData[field];
        }
      }

      updatedCustomer.updatedAt = new Date();

      // Store updated customer data
      this.customerData.set(customerKey, updatedCustomer);

      return createApiResponse(updatedCustomer, 'Customer updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to update customer', error.message);
    }
  }

  /**
   * Get all customers for tenant
   */
  async getAllCustomers(tenantId, filters = {}) {
    try {
      const allCustomers = [];
      
      for (const [key, customer] of this.customerData.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          // Apply filters
          let includeCustomer = true;
          
          if (filters.isActive !== undefined && customer.isActive !== filters.isActive) {
            includeCustomer = false;
          }
          
          if (filters.loyaltyTier && customer.loyaltyTier !== filters.loyaltyTier) {
            includeCustomer = false;
          }
          
          if (filters.source && customer.source !== filters.source) {
            includeCustomer = false;
          }

          if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
            const email = (customer.email || '').toLowerCase();
            const phone = (customer.phone || '').toLowerCase();
            
            if (!fullName.includes(searchTerm) && 
                !email.includes(searchTerm) && 
                !phone.includes(searchTerm)) {
              includeCustomer = false;
            }
          }

          if (includeCustomer) {
            allCustomers.push(customer);
          }
        }
      }

      // Sort by creation date (newest first)
      allCustomers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedCustomers = allCustomers.slice(startIndex, endIndex);

      return createApiResponse({
        customers: paginatedCustomers,
        total: allCustomers.length,
        page,
        limit,
        totalPages: Math.ceil(allCustomers.length / limit),
        filters: filters,
      }, 'Customers retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get customers', error.message);
    }
  }

  /**
   * Record customer order (updates customer statistics)
   */
  async recordCustomerOrder(tenantId, customerId, orderData) {
    const { orderId, orderValue, items = [], orderDate = new Date() } = orderData;

    try {
      const customerKey = `${tenantId}:${customerId}`;
      const customer = this.customerData.get(customerKey);

      if (!customer) {
        throw new ResourceNotFoundError('Customer', customerId);
      }

      // Update customer statistics
      customer.totalOrders += 1;
      customer.totalSpent += orderValue;
      customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
      customer.lastOrderDate = new Date(orderDate);
      customer.updatedAt = new Date();

      // Award loyalty points
      const pointsEarned = this.calculateLoyaltyPoints(orderValue, customer.loyaltyTier);
      customer.loyaltyPoints += pointsEarned;

      // Update loyalty tier
      customer.loyaltyTier = this.calculateLoyaltyTier(customer.loyaltyPoints);

      // Store order in history
      const orderHistoryKey = `${tenantId}:${customerId}`;
      if (!this.orderHistory.has(orderHistoryKey)) {
        this.orderHistory.set(orderHistoryKey, []);
      }
      
      const orderHistory = this.orderHistory.get(orderHistoryKey);
      orderHistory.push({
        orderId,
        orderValue,
        items,
        orderDate: new Date(orderDate),
        pointsEarned,
        loyaltyTierAtTime: customer.loyaltyTier,
      });

      // Keep only last 100 orders per customer
      if (orderHistory.length > 100) {
        orderHistory.splice(0, orderHistory.length - 100);
      }

      this.orderHistory.set(orderHistoryKey, orderHistory);
      this.customerData.set(customerKey, customer);

      return createApiResponse({
        customer,
        pointsEarned,
        newLoyaltyTier: customer.loyaltyTier,
      }, 'Customer order recorded successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to record customer order', error.message);
    }
  }

  /**
   * Get customer order history
   */
  async getCustomerOrderHistory(tenantId, customerId, limit = 20) {
    try {
      const customer = await this.getCustomerById(tenantId, customerId);
      
      const orderHistoryKey = `${tenantId}:${customerId}`;
      const orderHistory = this.orderHistory.get(orderHistoryKey) || [];

      // Sort by order date (newest first) and limit results
      const sortedHistory = orderHistory
        .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
        .slice(0, limit);

      return createApiResponse({
        customer: customer.data,
        orderHistory: sortedHistory,
        totalOrders: orderHistory.length,
      }, 'Customer order history retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get customer order history', error.message);
    }
  }

  /**
   * Find customer by email
   */
  async findCustomerByEmail(tenantId, email) {
    for (const [key, customer] of this.customerData.entries()) {
      if (key.startsWith(`${tenantId}:`) && customer.email === email) {
        return customer;
      }
    }
    return null;
  }

  /**
   * Find customer by phone
   */
  async findCustomerByPhone(tenantId, phone) {
    for (const [key, customer] of this.customerData.entries()) {
      if (key.startsWith(`${tenantId}:`) && customer.phone === phone) {
        return customer;
      }
    }
    return null;
  }

  /**
   * Search customers
   */
  async searchCustomers(tenantId, searchTerm, limit = 10) {
    try {
      const searchResults = [];
      const lowerSearchTerm = searchTerm.toLowerCase();
      
      for (const [key, customer] of this.customerData.entries()) {
        if (key.startsWith(`${tenantId}:`) && customer.isActive) {
          const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
          const email = (customer.email || '').toLowerCase();
          const phone = (customer.phone || '').toLowerCase();
          
          if (fullName.includes(lowerSearchTerm) || 
              email.includes(lowerSearchTerm) || 
              phone.includes(lowerSearchTerm)) {
            searchResults.push(customer);
          }
          
          if (searchResults.length >= limit) {
            break;
          }
        }
      }

      return createApiResponse({
        customers: searchResults,
        searchTerm,
        total: searchResults.length,
      }, 'Customer search completed successfully');
    } catch (error) {
      throw new DatabaseError('Failed to search customers', error.message);
    }
  }

  /**
   * Calculate loyalty points based on order value and tier
   */
  calculateLoyaltyPoints(orderValue, loyaltyTier) {
    const basePointsPerDollar = parseFloat(process.env.LOYALTY_POINTS_PER_DOLLAR) || 1;
    const tierMultipliers = {
      'BRONZE': 1,
      'SILVER': 1.5,
      'GOLD': 2,
      'PLATINUM': 2.5,
    };

    const multiplier = tierMultipliers[loyaltyTier] || 1;
    return Math.floor(orderValue * basePointsPerDollar * multiplier);
  }

  /**
   * Calculate loyalty tier based on total points
   */
  calculateLoyaltyTier(totalPoints) {
    const thresholds = (process.env.LOYALTY_TIER_THRESHOLDS || '100,500,1000,2000')
      .split(',')
      .map(t => parseInt(t));

    if (totalPoints >= thresholds[3]) return 'PLATINUM';
    if (totalPoints >= thresholds[2]) return 'GOLD';
    if (totalPoints >= thresholds[1]) return 'SILVER';
    return 'BRONZE';
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(tenantId, customerId) {
    try {
      const customer = await this.getCustomerById(tenantId, customerId);
      const orderHistoryKey = `${tenantId}:${customerId}`;
      const orderHistory = this.orderHistory.get(orderHistoryKey) || [];

      // Calculate analytics
      const analytics = {
        totalOrders: customer.data.totalOrders,
        totalSpent: customer.data.totalSpent,
        averageOrderValue: customer.data.averageOrderValue,
        loyaltyPoints: customer.data.loyaltyPoints,
        loyaltyTier: customer.data.loyaltyTier,
        lastOrderDate: customer.data.lastOrderDate,
        customerSince: customer.data.createdAt,
        daysSinceLastOrder: customer.data.lastOrderDate 
          ? Math.floor((new Date() - new Date(customer.data.lastOrderDate)) / (1000 * 60 * 60 * 24))
          : null,
        orderFrequency: this.calculateOrderFrequency(orderHistory),
        favoriteItems: this.calculateFavoriteItems(orderHistory),
        monthlySpending: this.calculateMonthlySpending(orderHistory),
      };

      return createApiResponse(analytics, 'Customer analytics retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get customer analytics', error.message);
    }
  }

  /**
   * Calculate order frequency
   */
  calculateOrderFrequency(orderHistory) {
    if (orderHistory.length < 2) return 0;

    const sortedOrders = orderHistory.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
    const firstOrder = new Date(sortedOrders[0].orderDate);
    const lastOrder = new Date(sortedOrders[sortedOrders.length - 1].orderDate);
    const daysBetween = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24);

    return daysBetween > 0 ? Math.round((orderHistory.length / daysBetween) * 30 * 100) / 100 : 0; // Orders per month
  }

  /**
   * Calculate favorite items
   */
  calculateFavoriteItems(orderHistory) {
    const itemCounts = {};
    
    orderHistory.forEach(order => {
      order.items.forEach(item => {
        const itemName = item.name || item.itemName;
        if (itemName) {
          itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
        }
      });
    });

    return Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * Calculate monthly spending
   */
  calculateMonthlySpending(orderHistory) {
    const monthlySpending = {};
    
    orderHistory.forEach(order => {
      const monthKey = new Date(order.orderDate).toISOString().slice(0, 7); // YYYY-MM
      monthlySpending[monthKey] = (monthlySpending[monthKey] || 0) + order.orderValue;
    });

    return Object.entries(monthlySpending)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }));
  }
}

module.exports = CustomerService;
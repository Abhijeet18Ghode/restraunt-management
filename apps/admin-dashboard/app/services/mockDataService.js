// Mock Data Service for real-time-like data
class MockDataService {
  constructor() {
    this.initializeData();
    this.startRealTimeUpdates();
  }

  initializeData() {
    // Mock Menu Items
    this.menuItems = [
      {
        id: 1,
        name: 'Margherita Pizza',
        category: 'Pizza',
        price: 12.99,
        description: 'Fresh tomatoes, mozzarella, basil',
        isAvailable: true,
        preparationTime: 15,
        ingredients: ['tomatoes', 'mozzarella', 'basil'],
        allergens: ['dairy', 'gluten'],
        calories: 280,
        image: '/images/margherita-pizza.jpg'
      },
      {
        id: 2,
        name: 'Caesar Salad',
        category: 'Salads',
        price: 8.99,
        description: 'Romaine lettuce, parmesan, croutons',
        isAvailable: true,
        preparationTime: 8,
        ingredients: ['romaine', 'parmesan', 'croutons'],
        allergens: ['dairy', 'gluten'],
        calories: 180,
        image: '/images/caesar-salad.jpg'
      },
      {
        id: 3,
        name: 'Grilled Salmon',
        category: 'Main Course',
        price: 18.99,
        description: 'Atlantic salmon with herbs',
        isAvailable: false,
        preparationTime: 20,
        ingredients: ['salmon', 'herbs', 'lemon'],
        allergens: ['fish'],
        calories: 350,
        image: '/images/grilled-salmon.jpg'
      }
    ];

    // Mock Inventory Items
    this.inventoryItems = [
      {
        id: 1,
        name: 'Tomatoes',
        category: 'Vegetables',
        currentStock: 45,
        minStock: 20,
        maxStock: 100,
        unit: 'kg',
        costPerUnit: 2.50,
        supplier: 'Fresh Farms Co.',
        expiryDate: '2026-01-15',
        lastRestocked: '2026-01-03'
      },
      {
        id: 2,
        name: 'Mozzarella Cheese',
        category: 'Dairy',
        currentStock: 12,
        minStock: 15,
        maxStock: 50,
        unit: 'kg',
        costPerUnit: 8.99,
        supplier: 'Dairy Fresh Ltd.',
        expiryDate: '2026-01-12',
        lastRestocked: '2026-01-02'
      },
      {
        id: 3,
        name: 'Salmon Fillets',
        category: 'Seafood',
        currentStock: 8,
        minStock: 10,
        maxStock: 30,
        unit: 'pieces',
        costPerUnit: 12.50,
        supplier: 'Ocean Fresh Seafood',
        expiryDate: '2026-01-08',
        lastRestocked: '2026-01-05'
      }
    ];

    // Mock Orders
    this.orders = [
      {
        id: 'ORD-001',
        customerName: 'John Doe',
        customerPhone: '+1-555-0101',
        items: [
          { id: 1, name: 'Margherita Pizza', quantity: 2, price: 12.99 },
          { id: 2, name: 'Caesar Salad', quantity: 1, price: 8.99 }
        ],
        total: 34.97,
        status: 'preparing',
        orderType: 'dine-in',
        tableNumber: 5,
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        estimatedTime: 20
      },
      {
        id: 'ORD-002',
        customerName: 'Jane Smith',
        customerPhone: '+1-555-0102',
        items: [
          { id: 3, name: 'Grilled Salmon', quantity: 1, price: 18.99 }
        ],
        total: 18.99,
        status: 'completed',
        orderType: 'takeaway',
        createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
      }
    ];

    // Mock Staff
    this.staff = [
      {
        id: 1,
        name: 'Alice Johnson',
        email: 'alice@restaurant.com',
        role: 'chef',
        department: 'kitchen',
        shift: 'morning',
        status: 'active',
        hourlyRate: 18.50,
        hireDate: '2023-03-15',
        phone: '+1-555-0201'
      },
      {
        id: 2,
        name: 'Bob Wilson',
        email: 'bob@restaurant.com',
        role: 'waiter',
        department: 'service',
        shift: 'evening',
        status: 'active',
        hourlyRate: 15.00,
        hireDate: '2023-06-20',
        phone: '+1-555-0202'
      }
    ];

    // Mock Analytics Data
    this.analyticsData = {
      dailySales: {
        today: 1250.75,
        yesterday: 1180.50,
        change: 5.95
      },
      weeklyOrders: [
        { day: 'Mon', orders: 45 },
        { day: 'Tue', orders: 52 },
        { day: 'Wed', orders: 38 },
        { day: 'Thu', orders: 61 },
        { day: 'Fri', orders: 78 },
        { day: 'Sat', orders: 95 },
        { day: 'Sun', orders: 67 }
      ],
      topItems: [
        { name: 'Margherita Pizza', orders: 45, revenue: 584.55 },
        { name: 'Caesar Salad', orders: 32, revenue: 287.68 },
        { name: 'Grilled Salmon', orders: 28, revenue: 531.72 }
      ]
    };
  }

  startRealTimeUpdates() {
    // Simulate real-time updates every 30 seconds
    setInterval(() => {
      this.updateAnalytics();
      this.updateOrderStatuses();
      this.updateInventoryLevels();
    }, 30000);
  }

  updateAnalytics() {
    // Simulate changing sales data
    this.analyticsData.dailySales.today += Math.random() * 50;
    
    // Update weekly orders with small random changes
    this.analyticsData.weeklyOrders = this.analyticsData.weeklyOrders.map(day => ({
      ...day,
      orders: Math.max(0, day.orders + Math.floor(Math.random() * 6) - 3)
    }));
  }

  updateOrderStatuses() {
    // Simulate order status changes
    this.orders.forEach(order => {
      if (order.status === 'preparing' && Math.random() > 0.7) {
        order.status = 'ready';
        order.readyAt = new Date().toISOString();
      } else if (order.status === 'ready' && Math.random() > 0.8) {
        order.status = 'completed';
        order.completedAt = new Date().toISOString();
      }
    });
  }

  updateInventoryLevels() {
    // Simulate inventory consumption
    this.inventoryItems.forEach(item => {
      if (Math.random() > 0.8) {
        item.currentStock = Math.max(0, item.currentStock - Math.floor(Math.random() * 3));
      }
    });
  }

  // API Methods
  async getMenuItems() {
    await this.simulateDelay();
    return {
      success: true,
      data: this.menuItems,
      total: this.menuItems.length
    };
  }

  async getInventoryItems() {
    await this.simulateDelay();
    return {
      success: true,
      data: this.inventoryItems,
      total: this.inventoryItems.length
    };
  }

  async getOrders(status = null) {
    await this.simulateDelay();
    let filteredOrders = this.orders;
    
    if (status) {
      filteredOrders = this.orders.filter(order => order.status === status);
    }
    
    return {
      success: true,
      data: filteredOrders,
      total: filteredOrders.length
    };
  }

  async getStaff() {
    await this.simulateDelay();
    return {
      success: true,
      data: this.staff,
      total: this.staff.length
    };
  }

  async getAnalytics() {
    await this.simulateDelay();
    return {
      success: true,
      data: this.analyticsData
    };
  }

  async createOrder(orderData) {
    await this.simulateDelay();
    const newOrder = {
      id: `ORD-${String(this.orders.length + 1).padStart(3, '0')}`,
      ...orderData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    this.orders.unshift(newOrder);
    return {
      success: true,
      data: newOrder
    };
  }

  async updateInventoryItem(id, updateData) {
    await this.simulateDelay();
    const itemIndex = this.inventoryItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return {
        success: false,
        error: 'Item not found'
      };
    }
    
    this.inventoryItems[itemIndex] = {
      ...this.inventoryItems[itemIndex],
      ...updateData
    };
    
    return {
      success: true,
      data: this.inventoryItems[itemIndex]
    };
  }

  simulateDelay(ms = 200) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const mockDataService = new MockDataService();
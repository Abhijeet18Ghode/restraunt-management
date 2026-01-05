const CustomerService = require('../../src/services/CustomerService');
const { DatabaseManager } = require('@rms/shared');

describe('CustomerService', () => {
  let customerService;
  let mockDbManager;

  beforeEach(() => {
    mockDbManager = new DatabaseManager();
    customerService = new CustomerService(mockDbManager);
  });

  afterEach(() => {
    // Clear in-memory data
    customerService.customerData.clear();
    customerService.orderHistory.clear();
  });

  describe('createCustomer', () => {
    const validCustomerData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      dateOfBirth: '1990-01-01',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
      },
      preferences: {
        dietaryRestrictions: ['vegetarian'],
        favoriteItems: ['pasta'],
      },
      source: 'DIRECT',
    };

    test('should create customer successfully', async () => {
      const result = await customerService.createCustomer('tenant-1', validCustomerData);

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe(validCustomerData.firstName);
      expect(result.data.lastName).toBe(validCustomerData.lastName);
      expect(result.data.email).toBe(validCustomerData.email);
      expect(result.data.phone).toBe(validCustomerData.phone);
      expect(result.data.isActive).toBe(true);
      expect(result.data.totalOrders).toBe(0);
      expect(result.data.totalSpent).toBe(0);
      expect(result.data.loyaltyPoints).toBe(0);
      expect(result.data.loyaltyTier).toBe('BRONZE');
    });

    test('should throw validation error for missing required fields', async () => {
      const invalidData = { email: 'test@example.com' };

      await expect(
        customerService.createCustomer('tenant-1', invalidData)
      ).rejects.toThrow('First name and last name are required');
    });

    test('should throw validation error when both email and phone are missing', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(
        customerService.createCustomer('tenant-1', invalidData)
      ).rejects.toThrow('Either email or phone number is required');
    });

    test('should throw validation error for invalid email format', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      };

      await expect(
        customerService.createCustomer('tenant-1', invalidData)
      ).rejects.toThrow('Invalid email format');
    });

    test('should throw validation error for invalid phone format', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: 'invalid-phone',
      };

      await expect(
        customerService.createCustomer('tenant-1', invalidData)
      ).rejects.toThrow('Invalid phone number format');
    });

    test('should throw validation error for duplicate email', async () => {
      await customerService.createCustomer('tenant-1', validCustomerData);

      await expect(
        customerService.createCustomer('tenant-1', validCustomerData)
      ).rejects.toThrow('Email already exists');
    });

    test('should throw validation error for duplicate phone', async () => {
      const customerData1 = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      };

      const customerData2 = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
      };

      await customerService.createCustomer('tenant-1', customerData1);

      await expect(
        customerService.createCustomer('tenant-1', customerData2)
      ).rejects.toThrow('Phone number already exists');
    });

    test('should create customer with only email', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };

      const result = await customerService.createCustomer('tenant-1', customerData);

      expect(result.success).toBe(true);
      expect(result.data.email).toBe(customerData.email);
      expect(result.data.phone).toBeUndefined();
    });

    test('should create customer with only phone', async () => {
      const customerData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      };

      const result = await customerService.createCustomer('tenant-1', customerData);

      expect(result.success).toBe(true);
      expect(result.data.phone).toBe(customerData.phone);
      expect(result.data.email).toBeUndefined();
    });
  });

  describe('updateCustomer', () => {
    let customerId;

    beforeEach(async () => {
      const result = await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
      customerId = result.data.id;
    });

    test('should update customer successfully', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        preferences: { favoriteItems: ['pizza'] },
      };

      const result = await customerService.updateCustomer('tenant-1', customerId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.firstName).toBe('Jane');
      expect(result.data.lastName).toBe('Smith');
      expect(result.data.email).toBe('jane@example.com');
      expect(result.data.preferences.favoriteItems).toEqual(['pizza']);
    });

    test('should throw error for non-existent customer', async () => {
      await expect(
        customerService.updateCustomer('tenant-1', 'non-existent-id', { firstName: 'Jane' })
      ).rejects.toThrow('Customer not found');
    });

    test('should throw validation error for invalid email', async () => {
      await expect(
        customerService.updateCustomer('tenant-1', customerId, { email: 'invalid-email' })
      ).rejects.toThrow('Invalid email format');
    });

    test('should throw validation error for duplicate email', async () => {
      // Create another customer
      await customerService.createCustomer('tenant-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
      });

      await expect(
        customerService.updateCustomer('tenant-1', customerId, { email: 'jane@example.com' })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('recordCustomerOrder', () => {
    let customerId;

    beforeEach(async () => {
      const result = await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      customerId = result.data.id;
    });

    test('should record customer order successfully', async () => {
      const orderData = {
        orderId: 'order-123',
        orderValue: 25.50,
        items: [
          { name: 'Pizza', quantity: 1, price: 15.00 },
          { name: 'Soda', quantity: 2, price: 5.25 },
        ],
      };

      const result = await customerService.recordCustomerOrder('tenant-1', customerId, orderData);

      expect(result.success).toBe(true);
      expect(result.data.customer.totalOrders).toBe(1);
      expect(result.data.customer.totalSpent).toBe(25.50);
      expect(result.data.customer.averageOrderValue).toBe(25.50);
      expect(result.data.pointsEarned).toBeGreaterThan(0);
      expect(result.data.customer.loyaltyPoints).toBeGreaterThan(0);
    });

    test('should update loyalty tier based on points', async () => {
      // Record multiple orders to accumulate points
      for (let i = 0; i < 5; i++) {
        await customerService.recordCustomerOrder('tenant-1', customerId, {
          orderId: `order-${i}`,
          orderValue: 50.00,
          items: [],
        });
      }

      const customerResult = await customerService.getCustomerById('tenant-1', customerId);
      const customer = customerResult.data;

      expect(customer.totalOrders).toBe(5);
      expect(customer.totalSpent).toBe(250.00);
      expect(customer.loyaltyPoints).toBeGreaterThanOrEqual(100); // Should have enough for SILVER
      expect(['SILVER', 'GOLD', 'PLATINUM']).toContain(customer.loyaltyTier);
    });

    test('should throw error for non-existent customer', async () => {
      await expect(
        customerService.recordCustomerOrder('tenant-1', 'non-existent-id', {
          orderId: 'order-123',
          orderValue: 25.50,
        })
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('getAllCustomers', () => {
    beforeEach(async () => {
      // Create multiple customers
      await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        source: 'DIRECT',
      });

      await customerService.createCustomer('tenant-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        source: 'ONLINE',
      });

      await customerService.createCustomer('tenant-1', {
        firstName: 'Bob',
        lastName: 'Johnson',
        phone: '+1234567890',
        source: 'REFERRAL',
      });
    });

    test('should get all customers', async () => {
      const result = await customerService.getAllCustomers('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(3);
      expect(result.data.total).toBe(3);
      expect(result.data.page).toBe(1);
    });

    test('should filter customers by source', async () => {
      const result = await customerService.getAllCustomers('tenant-1', { source: 'ONLINE' });

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].source).toBe('ONLINE');
    });

    test('should search customers by name', async () => {
      const result = await customerService.getAllCustomers('tenant-1', { search: 'jane' });

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].firstName).toBe('Jane');
    });

    test('should search customers by email', async () => {
      const result = await customerService.getAllCustomers('tenant-1', { search: 'john@example.com' });

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].email).toBe('john@example.com');
    });

    test('should paginate results', async () => {
      const result = await customerService.getAllCustomers('tenant-1', { page: 1, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(2);
      expect(result.data.totalPages).toBe(2);
    });
  });

  describe('searchCustomers', () => {
    beforeEach(async () => {
      await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      });

      await customerService.createCustomer('tenant-1', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+0987654321',
      });
    });

    test('should search customers by name', async () => {
      const result = await customerService.searchCustomers('tenant-1', 'john');

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].firstName).toBe('John');
    });

    test('should search customers by email', async () => {
      const result = await customerService.searchCustomers('tenant-1', 'jane.smith');

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].email).toBe('jane.smith@example.com');
    });

    test('should search customers by phone', async () => {
      const result = await customerService.searchCustomers('tenant-1', '1234567890');

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
      expect(result.data.customers[0].phone).toBe('+1234567890');
    });

    test('should limit search results', async () => {
      const result = await customerService.searchCustomers('tenant-1', 'example.com', 1);

      expect(result.success).toBe(true);
      expect(result.data.customers).toHaveLength(1);
    });
  });

  describe('getCustomerAnalytics', () => {
    let customerId;

    beforeEach(async () => {
      const result = await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      customerId = result.data.id;

      // Record some orders
      await customerService.recordCustomerOrder('tenant-1', customerId, {
        orderId: 'order-1',
        orderValue: 25.00,
        items: [{ name: 'Pizza', quantity: 1 }],
      });

      await customerService.recordCustomerOrder('tenant-1', customerId, {
        orderId: 'order-2',
        orderValue: 15.00,
        items: [{ name: 'Burger', quantity: 1 }],
      });
    });

    test('should get customer analytics', async () => {
      const result = await customerService.getCustomerAnalytics('tenant-1', customerId);

      expect(result.success).toBe(true);
      expect(result.data.totalOrders).toBe(2);
      expect(result.data.totalSpent).toBe(40.00);
      expect(result.data.averageOrderValue).toBe(20.00);
      expect(result.data.loyaltyPoints).toBeGreaterThan(0);
      expect(result.data.favoriteItems).toBeDefined();
      expect(result.data.monthlySpending).toBeDefined();
    });

    test('should calculate favorite items correctly', async () => {
      // Record more orders with same items
      await customerService.recordCustomerOrder('tenant-1', customerId, {
        orderId: 'order-3',
        orderValue: 25.00,
        items: [{ name: 'Pizza', quantity: 2 }],
      });

      const result = await customerService.getCustomerAnalytics('tenant-1', customerId);

      expect(result.data.favoriteItems).toHaveLength(2);
      expect(result.data.favoriteItems[0].name).toBe('Pizza');
      expect(result.data.favoriteItems[0].count).toBe(3); // 1 + 2
    });
  });

  describe('loyalty calculations', () => {
    test('should calculate loyalty points correctly', () => {
      const points1 = customerService.calculateLoyaltyPoints(100, 'BRONZE');
      const points2 = customerService.calculateLoyaltyPoints(100, 'SILVER');
      const points3 = customerService.calculateLoyaltyPoints(100, 'GOLD');

      expect(points1).toBe(100); // 100 * 1 * 1
      expect(points2).toBe(150); // 100 * 1 * 1.5
      expect(points3).toBe(200); // 100 * 1 * 2
    });

    test('should calculate loyalty tier correctly', () => {
      expect(customerService.calculateLoyaltyTier(50)).toBe('BRONZE');
      expect(customerService.calculateLoyaltyTier(150)).toBe('SILVER');
      expect(customerService.calculateLoyaltyTier(600)).toBe('GOLD');
      expect(customerService.calculateLoyaltyTier(1500)).toBe('PLATINUM');
    });
  });

  describe('findCustomerByEmail', () => {
    beforeEach(async () => {
      await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    test('should find customer by email', async () => {
      const customer = await customerService.findCustomerByEmail('tenant-1', 'john@example.com');

      expect(customer).toBeDefined();
      expect(customer.email).toBe('john@example.com');
      expect(customer.firstName).toBe('John');
    });

    test('should return null for non-existent email', async () => {
      const customer = await customerService.findCustomerByEmail('tenant-1', 'nonexistent@example.com');

      expect(customer).toBeNull();
    });

    test('should not find customer from different tenant', async () => {
      const customer = await customerService.findCustomerByEmail('tenant-2', 'john@example.com');

      expect(customer).toBeNull();
    });
  });

  describe('findCustomerByPhone', () => {
    beforeEach(async () => {
      await customerService.createCustomer('tenant-1', {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
      });
    });

    test('should find customer by phone', async () => {
      const customer = await customerService.findCustomerByPhone('tenant-1', '+1234567890');

      expect(customer).toBeDefined();
      expect(customer.phone).toBe('+1234567890');
      expect(customer.firstName).toBe('John');
    });

    test('should return null for non-existent phone', async () => {
      const customer = await customerService.findCustomerByPhone('tenant-1', '+0000000000');

      expect(customer).toBeNull();
    });
  });
});
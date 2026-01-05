const DeliveryPartnerService = require('../../src/services/DeliveryPartnerService');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('Delivery Partner Integration Tests', () => {
  let deliveryService;

  beforeEach(() => {
    deliveryService = new DeliveryPartnerService();
    jest.clearAllMocks();
  });

  describe('Uber Eats Integration', () => {
    const mockOrderData = {
      id: 'order-123',
      restaurant: {
        address: '123 Main St, City, State 12345'
      },
      customer: {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
        address: '456 Oak Ave, City, State 12345'
      },
      items: [
        {
          name: 'Burger',
          quantity: 2,
          price: 12.99,
          total: 25.98,
          notes: 'No onions'
        }
      ],
      total: 25.98,
      currency: 'USD',
      pickupInstructions: 'Call when arrived',
      deliveryInstructions: 'Leave at door'
    };

    test('should create order with Uber Eats successfully', async () => {
      const mockResponse = {
        data: {
          id: 'uber-order-456',
          status: 'accepted',
          estimated_delivery_time: '2024-01-05T19:30:00Z',
          tracking_url: 'https://uber.com/track/uber-order-456'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await deliveryService.createOrder('uber', mockOrderData);

      expect(result.success).toBe(true);
      expect(result.partnerId).toBe('uber');
      expect(result.partnerOrderId).toBe('uber-order-456');
      expect(result.status).toBe('accepted');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.objectContaining({
          external_reference_id: 'order-123',
          pickup_address: '123 Main St, City, State 12345',
          dropoff_address: '456 Oak Ave, City, State 12345'
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should handle Uber Eats API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error: Invalid credentials'));

      const result = await deliveryService.createOrder('uber', mockOrderData);

      expect(result.success).toBe(false);
      expect(result.partnerId).toBe('uber');
      expect(result.error).toContain('API Error');
    });

    test('should update order status with Uber Eats', async () => {
      const mockResponse = {
        data: {
          status: 'in_progress'
        }
      };

      mockedAxios.patch.mockResolvedValue(mockResponse);

      const result = await deliveryService.updateOrderStatus('uber', 'uber-order-456', 'in_progress');

      expect(result.success).toBe(true);
      expect(result.status).toBe('in_progress');
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        expect.stringContaining('/orders/uber-order-456'),
        { status: 'in_progress' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer')
          })
        })
      );
    });

    test('should get order status from Uber Eats', async () => {
      const mockResponse = {
        data: {
          status: 'delivered',
          estimated_delivery_time: '2024-01-05T19:30:00Z',
          actual_delivery_time: '2024-01-05T19:25:00Z',
          driver: {
            name: 'Driver Name',
            phone: '+1987654321'
          },
          tracking_url: 'https://uber.com/track/uber-order-456'
        }
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await deliveryService.getOrderStatus('uber', 'uber-order-456');

      expect(result.success).toBe(true);
      expect(result.status).toBe('delivered');
      expect(result.driverInfo).toEqual({
        name: 'Driver Name',
        phone: '+1987654321'
      });
    });

    test('should cancel order with Uber Eats', async () => {
      const mockResponse = {
        data: {
          status: 'cancelled'
        }
      };

      mockedAxios.delete.mockResolvedValue(mockResponse);

      const result = await deliveryService.cancelOrder('uber', 'uber-order-456', 'Customer requested');

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(result.reason).toBe('Customer requested');
    });
  });

  describe('DoorDash Integration', () => {
    const mockOrderData = {
      id: 'order-789',
      restaurant: {
        address: '789 Restaurant St, City, State 12345'
      },
      customer: {
        name: 'Jane Smith',
        phone: '+1555666777',
        email: 'jane@example.com',
        address: '321 Customer Ave, City, State 12345'
      },
      items: [
        {
          name: 'Pizza',
          quantity: 1,
          price: 18.99,
          total: 18.99
        }
      ],
      total: 18.99,
      pickupWindowStart: '2024-01-05T18:00:00Z',
      pickupWindowEnd: '2024-01-05T18:15:00Z',
      deliveryWindowStart: '2024-01-05T18:30:00Z',
      deliveryWindowEnd: '2024-01-05T18:45:00Z'
    };

    test('should create order with DoorDash successfully', async () => {
      const mockResponse = {
        data: {
          id: 'doordash-order-789',
          status: 'confirmed',
          estimated_delivery_time: '2024-01-05T18:40:00Z',
          tracking_url: 'https://doordash.com/track/doordash-order-789'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await deliveryService.createOrder('doordash', mockOrderData);

      expect(result.success).toBe(true);
      expect(result.partnerId).toBe('doordash');
      expect(result.partnerOrderId).toBe('doordash-order-789');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/orders'),
        expect.objectContaining({
          external_reference_id: 'order-789',
          pickup_window_start: '2024-01-05T18:00:00Z',
          pickup_window_end: '2024-01-05T18:15:00Z',
          dropoff_window_start: '2024-01-05T18:30:00Z',
          dropoff_window_end: '2024-01-05T18:45:00Z'
        }),
        expect.any(Object)
      );
    });

    test('should handle DoorDash service unavailable', async () => {
      // Simulate DoorDash being disabled
      deliveryService.partners.doordash.enabled = false;

      const result = await deliveryService.createOrder('doordash', mockOrderData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('Multiple Partner Integration', () => {
    test('should get available partners correctly', () => {
      // Mock environment variables
      process.env.UBER_EATS_ENABLED = 'true';
      process.env.DOORDASH_ENABLED = 'true';
      process.env.GRUBHUB_ENABLED = 'false';

      const service = new DeliveryPartnerService();
      const partners = service.getAvailablePartners();

      expect(partners).toHaveLength(2);
      expect(partners.map(p => p.id)).toContain('uber');
      expect(partners.map(p => p.id)).toContain('doordash');
      expect(partners.map(p => p.id)).not.toContain('grubhub');
    });

    test('should transform order data correctly for different partners', () => {
      const orderData = {
        id: 'test-order',
        restaurant: { address: 'Restaurant Address' },
        customer: { 
          name: 'Test Customer',
          phone: '+1234567890',
          email: 'test@example.com',
          address: 'Customer Address'
        },
        items: [{ name: 'Item', quantity: 1, price: 10, total: 10 }],
        total: 10,
        scheduledPickupTime: '2024-01-05T18:00:00Z',
        pickupWindowStart: '2024-01-05T18:00:00Z',
        pickupWindowEnd: '2024-01-05T18:15:00Z',
        restaurant: { grubhubId: 'gh-123' },
        deliveryFee: 2.99,
        tipAmount: 3.00
      };

      // Test Uber transformation
      const uberData = deliveryService.transformOrderData('uber', orderData);
      expect(uberData.pickup_time).toBe('2024-01-05T18:00:00Z');

      // Test DoorDash transformation
      const doordashData = deliveryService.transformOrderData('doordash', orderData);
      expect(doordashData.pickup_window_start).toBe('2024-01-05T18:00:00Z');
      expect(doordashData.pickup_window_end).toBe('2024-01-05T18:15:00Z');

      // Test Grubhub transformation
      const grubhubData = deliveryService.transformOrderData('grubhub', orderData);
      expect(grubhubData.restaurant_id).toBe('gh-123');
      expect(grubhubData.delivery_fee).toBe(2.99);
      expect(grubhubData.tip_amount).toBe(3.00);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network timeouts', async () => {
      mockedAxios.post.mockRejectedValue(new Error('timeout of 10000ms exceeded'));

      const result = await deliveryService.createOrder('uber', {
        id: 'test-order',
        restaurant: { address: 'Test' },
        customer: { name: 'Test', address: 'Test' },
        items: [],
        total: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle invalid partner ID', async () => {
      const result = await deliveryService.createOrder('invalid-partner', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    test('should handle API rate limiting', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      });

      const result = await deliveryService.createOrder('uber', {
        id: 'test-order',
        restaurant: { address: 'Test' },
        customer: { name: 'Test', address: 'Test' },
        items: [],
        total: 0
      });

      expect(result.success).toBe(false);
    });
  });
});
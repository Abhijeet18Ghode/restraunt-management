const NotificationService = require('../../src/services/NotificationService');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('twilio');
jest.mock('axios');

const mockedNodemailer = nodemailer;
const mockedTwilio = twilio;
const mockedAxios = axios;

describe('Notification Service Integration Tests', () => {
  let notificationService;
  let mockEmailTransporter;
  let mockSmsClient;

  beforeEach(() => {
    // Mock email transporter
    mockEmailTransporter = {
      sendMail: jest.fn()
    };
    mockedNodemailer.createTransporter.mockReturnValue(mockEmailTransporter);

    // Mock SMS client
    mockSmsClient = {
      messages: {
        create: jest.fn()
      }
    };
    mockedTwilio.mockReturnValue(mockSmsClient);

    notificationService = new NotificationService();
    jest.clearAllMocks();
  });

  describe('Email Notifications', () => {
    test('should send order confirmation email successfully', async () => {
      const mockEmailResult = {
        messageId: 'email-123@example.com'
      };

      mockEmailTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await notificationService.sendEmail(
        'customer@example.com',
        'orderConfirmation',
        {
          orderNumber: 'ORD-001',
          total: '25.98',
          estimatedTime: '30 minutes',
          items: [
            { name: 'Burger', quantity: 2, total: '25.98' }
          ]
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-123@example.com');
      expect(result.type).toBe('email');

      expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@example.com',
          subject: 'Order Confirmation - ORD-001',
          html: expect.stringContaining('Order Confirmation')
        })
      );
    });

    test('should send low stock alert email successfully', async () => {
      const mockEmailResult = {
        messageId: 'email-456@example.com'
      };

      mockEmailTransporter.sendMail.mockResolvedValue(mockEmailResult);

      const result = await notificationService.sendEmail(
        'manager@restaurant.com',
        'lowStock',
        {
          itemName: 'Tomatoes',
          currentStock: 5,
          minimumStock: 20
        }
      );

      expect(result.success).toBe(true);
      expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'manager@restaurant.com',
          subject: 'Low Stock Alert - Tomatoes',
          html: expect.stringContaining('Low Stock Alert')
        })
      );
    });

    test('should handle email sending errors gracefully', async () => {
      mockEmailTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await notificationService.sendEmail(
        'customer@example.com',
        'orderConfirmation',
        { orderNumber: 'ORD-002' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP connection failed');
      expect(result.type).toBe('email');
    });

    test('should handle invalid email template', async () => {
      const result = await notificationService.sendEmail(
        'customer@example.com',
        'invalidTemplate',
        { data: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email template not found');
    });

    test('should send bulk emails successfully', async () => {
      mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'bulk-email' });

      const recipients = [
        { email: 'customer1@example.com', name: 'Customer 1' },
        { email: 'customer2@example.com', name: 'Customer 2' },
        { email: 'customer3@example.com', name: 'Customer 3' }
      ];

      const result = await notificationService.sendBulkEmail(
        recipients,
        'orderConfirmation',
        { orderNumber: 'BULK-001' }
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockEmailTransporter.sendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('SMS Notifications', () => {
    beforeEach(() => {
      process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
      process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
      process.env.TWILIO_PHONE_NUMBER = '+1234567890';
    });

    test('should send order ready SMS successfully', async () => {
      const mockSmsResult = {
        sid: 'sms-123'
      };

      mockSmsClient.messages.create.mockResolvedValue(mockSmsResult);

      const result = await notificationService.sendSMS(
        '+1555666777',
        'orderReady',
        { orderNumber: 'ORD-003' }
      );

      expect(result.success).toBe(true);
      expect(result.sid).toBe('sms-123');
      expect(result.type).toBe('sms');

      expect(mockSmsClient.messages.create).toHaveBeenCalledWith({
        body: 'Your order ORD-003 is ready for pickup/delivery!',
        from: '+1234567890',
        to: '+1555666777'
      });
    });

    test('should send staff schedule SMS successfully', async () => {
      const mockSmsResult = {
        sid: 'sms-456'
      };

      mockSmsClient.messages.create.mockResolvedValue(mockSmsResult);

      const result = await notificationService.sendSMS(
        '+1777888999',
        'staffSchedule',
        {
          shift: '9:00 AM - 5:00 PM',
          date: '2024-01-06'
        }
      );

      expect(result.success).toBe(true);
      expect(mockSmsClient.messages.create).toHaveBeenCalledWith({
        body: 'Schedule reminder: You are scheduled to work 9:00 AM - 5:00 PM on 2024-01-06.',
        from: '+1234567890',
        to: '+1777888999'
      });
    });

    test('should handle SMS sending errors gracefully', async () => {
      mockSmsClient.messages.create.mockRejectedValue(new Error('Invalid phone number'));

      const result = await notificationService.sendSMS(
        'invalid-phone',
        'orderReady',
        { orderNumber: 'ORD-004' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number');
      expect(result.type).toBe('sms');
    });

    test('should handle missing Twilio credentials', async () => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;

      const result = await notificationService.sendSMS(
        '+1555666777',
        'orderReady',
        { orderNumber: 'ORD-005' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Twilio credentials not configured');
    });

    test('should send bulk SMS successfully', async () => {
      mockSmsClient.messages.create.mockResolvedValue({ sid: 'bulk-sms' });

      const recipients = [
        { phone: '+1111111111', name: 'Customer 1' },
        { phone: '+2222222222', name: 'Customer 2' },
        { phone: '+3333333333', name: 'Customer 3' }
      ];

      const result = await notificationService.sendBulkSMS(
        recipients,
        'orderReady',
        { orderNumber: 'BULK-SMS-001' }
      );

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockSmsClient.messages.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('Push Notifications', () => {
    beforeEach(() => {
      process.env.FIREBASE_SERVER_KEY = 'test-firebase-key';
      process.env.PUSH_NOTIFICATIONS_ENABLED = 'true';
    });

    test('should send push notifications successfully', async () => {
      const mockResponse = { data: { success: 1, failure: 0 } };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const deviceTokens = ['token1', 'token2', 'token3'];
      const result = await notificationService.sendPushNotification(
        deviceTokens,
        'orderReady',
        {
          title: 'Order Ready',
          message: 'Your order is ready for pickup',
          customData: { orderId: 'ORD-006' }
        }
      );

      expect(result.success).toBe(true);
      expect(result.total).toBe(3);
      expect(result.type).toBe('push');
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    test('should handle push notification errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Firebase authentication failed'));

      const result = await notificationService.sendPushNotification(
        ['token1'],
        'orderReady',
        { title: 'Test', message: 'Test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Firebase authentication failed');
    });

    test('should handle disabled push notifications', async () => {
      process.env.PUSH_NOTIFICATIONS_ENABLED = 'false';

      const service = new NotificationService();
      const result = await service.sendPushNotification(
        ['token1'],
        'orderReady',
        { title: 'Test', message: 'Test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Push notifications not configured');
    });
  });

  describe('Multi-Channel Notifications', () => {
    test('should send multi-channel notifications successfully', async () => {
      mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'email-multi' });
      mockSmsClient.messages.create.mockResolvedValue({ sid: 'sms-multi' });
      mockedAxios.post.mockResolvedValue({ data: { success: 1 } });

      const recipients = [
        {
          id: 'customer-1',
          email: 'customer1@example.com',
          phone: '+1111111111',
          deviceTokens: ['token1']
        }
      ];

      const results = await notificationService.sendMultiChannel(
        recipients,
        'orderConfirmation',
        { orderNumber: 'MULTI-001' },
        ['email', 'sms', 'push']
      );

      expect(results).toHaveLength(1);
      expect(results[0].recipient).toBe('customer-1');
      expect(results[0].results).toHaveLength(3);

      // Check that all channels were attempted
      expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
      expect(mockSmsClient.messages.create).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    test('should handle partial failures in multi-channel notifications', async () => {
      mockEmailTransporter.sendMail.mockResolvedValue({ messageId: 'email-success' });
      mockSmsClient.messages.create.mockRejectedValue(new Error('SMS failed'));

      const recipients = [
        {
          id: 'customer-2',
          email: 'customer2@example.com',
          phone: '+2222222222'
        }
      ];

      const results = await notificationService.sendMultiChannel(
        recipients,
        'orderReady',
        { orderNumber: 'MULTI-002' },
        ['email', 'sms']
      );

      expect(results).toHaveLength(1);
      expect(results[0].results).toHaveLength(2);
      
      // Email should succeed, SMS should fail
      expect(results[0].results[0].success).toBe(true);
      expect(results[0].results[1].success).toBe(false);
    });
  });

  describe('Template Variable Replacement', () => {
    test('should replace template variables correctly', () => {
      const template = 'Order #{orderNumber} total is ${total}';
      const data = { orderNumber: 'ORD-007', total: '29.99' };

      const result = notificationService.replaceTemplateVariables(template, data);

      expect(result).toBe('Order ORD-007 total is 29.99');
    });

    test('should handle missing template variables', () => {
      const template = 'Order #{orderNumber} for #{customerName}';
      const data = { orderNumber: 'ORD-008' };

      const result = notificationService.replaceTemplateVariables(template, data);

      expect(result).toBe('Order ORD-008 for #{customerName}');
    });

    test('should generate email content correctly', async () => {
      const data = {
        orderNumber: 'ORD-009',
        total: '35.50',
        estimatedTime: '25 minutes',
        items: [
          { name: 'Pizza', quantity: 1, total: '18.99' },
          { name: 'Salad', quantity: 2, total: '16.51' }
        ]
      };

      const content = await notificationService.generateEmailContent('order-confirmation', data);

      expect(content).toContain('Order Confirmation');
      expect(content).toContain('ORD-009');
      expect(content).toContain('$35.50');
      expect(content).toContain('Pizza x 1');
      expect(content).toContain('Salad x 2');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network timeouts', async () => {
      mockEmailTransporter.sendMail.mockRejectedValue(new Error('timeout of 30000ms exceeded'));

      const result = await notificationService.sendEmail(
        'customer@example.com',
        'orderConfirmation',
        { orderNumber: 'TIMEOUT-001' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle service unavailable errors', async () => {
      mockSmsClient.messages.create.mockRejectedValue({
        status: 503,
        message: 'Service temporarily unavailable'
      });

      const result = await notificationService.sendSMS(
        '+1555666777',
        'orderReady',
        { orderNumber: 'SERVICE-DOWN-001' }
      );

      expect(result.success).toBe(false);
    });

    test('should handle rate limiting gracefully', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      });

      const result = await notificationService.sendPushNotification(
        ['token1'],
        'orderReady',
        { title: 'Test', message: 'Test' }
      );

      expect(result.success).toBe(false);
    });
  });
});
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { io } = require('socket.io-client');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    // Email configuration
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('Email transporter initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email transporter:', error.message);
      this.emailTransporter = null;
    }

    // SMS configuration (only initialize if credentials are provided)
    try {
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
          process.env.TWILIO_ACCOUNT_SID !== 'AC6bebf583a645194204b32f3286d59ebc' &&
          process.env.TWILIO_AUTH_TOKEN !== 'c56278c8dd5efc02b4ed8531425f8e49') {
        this.smsClient = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        console.log('Twilio SMS client initialized successfully');
      } else {
        console.warn('Twilio credentials not provided or using placeholder values. SMS functionality will be disabled.');
        this.smsClient = null;
      }
    } catch (error) {
      console.error('Failed to initialize Twilio client:', error.message);
      this.smsClient = null;
    }

    // Push notification configuration (Firebase)
    this.pushConfig = {
      serverKey: process.env.FIREBASE_SERVER_KEY,
      enabled: process.env.PUSH_NOTIFICATIONS_ENABLED === 'true'
    };

    // WebSocket connection for real-time notifications
    this.wsClient = null;
    this.connectToWebSocket();

    // Notification templates
    this.templates = {
      orderConfirmation: {
        email: {
          subject: 'Order Confirmation - #{orderNumber}',
          template: 'order-confirmation'
        },
        sms: 'Your order #{orderNumber} has been confirmed. Total: ${total}. Estimated delivery: #{estimatedTime}.'
      },
      orderReady: {
        email: {
          subject: 'Your Order is Ready - #{orderNumber}',
          template: 'order-ready'
        },
        sms: 'Your order #{orderNumber} is ready for pickup/delivery!'
      },
      orderDelivered: {
        email: {
          subject: 'Order Delivered - #{orderNumber}',
          template: 'order-delivered'
        },
        sms: 'Your order #{orderNumber} has been delivered. Thank you for choosing us!'
      },
      lowStock: {
        email: {
          subject: 'Low Stock Alert - #{itemName}',
          template: 'low-stock-alert'
        },
        sms: 'LOW STOCK ALERT: #{itemName} is running low. Current stock: #{currentStock}'
      },
      staffSchedule: {
        email: {
          subject: 'Your Schedule for #{date}',
          template: 'staff-schedule'
        },
        sms: 'Schedule reminder: You are scheduled to work #{shift} on #{date}.'
      }
    };
  }

  connectToWebSocket() {
    try {
      const wsUrl = process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3010';
      this.wsClient = io(wsUrl, {
        auth: {
          token: process.env.SERVICE_JWT_TOKEN,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.wsClient.on('connect', () => {
        logger.info('Connected to WebSocket service for notifications');
      });

      this.wsClient.on('disconnect', (reason) => {
        logger.warn('Disconnected from WebSocket service', { reason });
      });

      this.wsClient.on('connect_error', (error) => {
        logger.error('WebSocket connection error', { error: error.message });
      });

    } catch (error) {
      logger.error('Failed to connect to WebSocket service', { error: error.message });
    }
  }

  // Real-time notification methods
  async sendRealtimeNotification(tenantId, outletId, userId, notification) {
    try {
      if (!this.wsClient || !this.wsClient.connected) {
        logger.warn('WebSocket not connected, skipping real-time notification');
        return { success: false, error: 'WebSocket not connected' };
      }

      const notificationData = {
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        priority: notification.priority || 'medium',
        category: notification.category || 'general',
        data: notification.data || {},
        timestamp: new Date().toISOString(),
      };

      if (userId) {
        // Send to specific user
        this.wsClient.emit('notification:send_to_user', {
          userId,
          notification: notificationData,
        });
      } else if (outletId) {
        // Send to all users in outlet
        this.wsClient.emit('notification:send_to_outlet', {
          outletId,
          notification: notificationData,
        });
      } else if (tenantId) {
        // Send to all users in tenant
        this.wsClient.emit('notification:send_to_tenant', {
          tenantId,
          notification: notificationData,
        });
      }

      logger.info('Real-time notification sent', {
        tenantId,
        outletId,
        userId,
        type: notification.type,
      });

      return { success: true, type: 'realtime' };
    } catch (error) {
      logger.error('Failed to send real-time notification', { error: error.message });
      return { success: false, error: error.message, type: 'realtime' };
    }
  }

  async sendEmail(to, templateType, data, options = {}) {
    try {
      const template = this.templates[templateType]?.email;
      if (!template) {
        throw new Error(`Email template not found: ${templateType}`);
      }

      const subject = this.replaceTemplateVariables(template.subject, data);
      const htmlContent = await this.generateEmailContent(template.template, data);

      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@restaurant.com',
        to,
        subject,
        html: htmlContent,
        ...options
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      logger.info('Email sent successfully:', {
        to,
        templateType,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        type: 'email'
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message,
        type: 'email'
      };
    }
  }

  async sendSMS(to, templateType, data) {
    try {
      if (!this.smsClient) {
        throw new Error('SMS service not available - Twilio credentials not configured or invalid');
      }

      const template = this.templates[templateType]?.sms;
      if (!template) {
        throw new Error(`SMS template not found: ${templateType}`);
      }

      const message = this.replaceTemplateVariables(template, data);

      const result = await this.smsClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });

      logger.info('SMS sent successfully:', {
        to,
        templateType,
        sid: result.sid
      });

      return {
        success: true,
        sid: result.sid,
        type: 'sms'
      };
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error.message,
        type: 'sms'
      };
    }
  }

  async sendPushNotification(deviceTokens, templateType, data) {
    try {
      if (!this.pushConfig.enabled || !this.pushConfig.serverKey) {
        throw new Error('Push notifications not configured');
      }

      // This is a simplified implementation
      // In production, you would use Firebase Admin SDK
      const axios = require('axios');
      
      const notification = {
        title: data.title || 'Restaurant Notification',
        body: data.message || 'You have a new notification',
        data: data.customData || {}
      };

      const promises = deviceTokens.map(token => 
        axios.post('https://fcm.googleapis.com/fcm/send', {
          to: token,
          notification
        }, {
          headers: {
            'Authorization': `key=${this.pushConfig.serverKey}`,
            'Content-Type': 'application/json'
          }
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;

      logger.info('Push notifications sent:', {
        templateType,
        total: deviceTokens.length,
        successful,
        failed: deviceTokens.length - successful
      });

      return {
        success: true,
        total: deviceTokens.length,
        successful,
        failed: deviceTokens.length - successful,
        type: 'push'
      };
    } catch (error) {
      logger.error('Failed to send push notifications:', error);
      return {
        success: false,
        error: error.message,
        type: 'push'
      };
    }
  }

  async sendMultiChannel(recipients, templateType, data, channels = ['email']) {
    const results = [];

    for (const recipient of recipients) {
      const recipientResults = [];

      if (channels.includes('email') && recipient.email) {
        const emailResult = await this.sendEmail(recipient.email, templateType, data);
        recipientResults.push(emailResult);
      }

      if (channels.includes('sms') && recipient.phone) {
        const smsResult = await this.sendSMS(recipient.phone, templateType, data);
        recipientResults.push(smsResult);
      }

      if (channels.includes('push') && recipient.deviceTokens) {
        const pushResult = await this.sendPushNotification(recipient.deviceTokens, templateType, data);
        recipientResults.push(pushResult);
      }

      results.push({
        recipient: recipient.id || recipient.email || recipient.phone,
        results: recipientResults
      });
    }

    return results;
  }

  replaceTemplateVariables(template, data) {
    let result = template;
    
    // Replace #{variable} patterns
    result = result.replace(/#\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });

    // Replace ${variable} patterns
    result = result.replace(/\$\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });

    return result;
  }

  async generateEmailContent(templateName, data) {
    // In a real implementation, you would load HTML templates from files
    // For now, we'll generate basic HTML content
    const templates = {
      'order-confirmation': `
        <h2>Order Confirmation</h2>
        <p>Thank you for your order!</p>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Total:</strong> $${data.total}</p>
        <p><strong>Estimated Delivery:</strong> ${data.estimatedTime}</p>
        <h3>Items:</h3>
        <ul>
          ${data.items?.map(item => `<li>${item.name} x ${item.quantity} - $${item.total}</li>`).join('') || ''}
        </ul>
      `,
      'order-ready': `
        <h2>Your Order is Ready!</h2>
        <p>Order Number: ${data.orderNumber}</p>
        <p>Your order is ready for ${data.deliveryType === 'pickup' ? 'pickup' : 'delivery'}.</p>
      `,
      'order-delivered': `
        <h2>Order Delivered</h2>
        <p>Your order ${data.orderNumber} has been successfully delivered.</p>
        <p>Thank you for choosing us!</p>
      `,
      'low-stock-alert': `
        <h2>Low Stock Alert</h2>
        <p><strong>Item:</strong> ${data.itemName}</p>
        <p><strong>Current Stock:</strong> ${data.currentStock}</p>
        <p><strong>Minimum Stock:</strong> ${data.minimumStock}</p>
        <p>Please reorder soon to avoid stockouts.</p>
      `,
      'staff-schedule': `
        <h2>Your Schedule</h2>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Shift:</strong> ${data.shift}</p>
        <p><strong>Location:</strong> ${data.location}</p>
      `
    };

    return templates[templateName] || `<p>Notification: ${JSON.stringify(data)}</p>`;
  }

  // Bulk notification methods
  async sendBulkEmail(recipients, templateType, data) {
    const results = await Promise.allSettled(
      recipients.map(recipient => 
        this.sendEmail(recipient.email, templateType, { ...data, ...recipient })
      )
    );

    return {
      total: recipients.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
    };
  }

  async sendBulkSMS(recipients, templateType, data) {
    const results = await Promise.allSettled(
      recipients.map(recipient => 
        this.sendSMS(recipient.phone, templateType, { ...data, ...recipient })
      )
    );

    return {
      total: recipients.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || !r.value.success).length
    };
  }
}

module.exports = NotificationService;
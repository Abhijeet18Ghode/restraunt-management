const express = require('express');
const DeliveryPartnerService = require('../services/DeliveryPartnerService');
const AccountingService = require('../services/AccountingService');
const NotificationService = require('../services/NotificationService');
const logger = require('../utils/logger');

const router = express.Router();
const deliveryService = new DeliveryPartnerService();
const accountingService = new AccountingService();
const notificationService = new NotificationService();

// Delivery Partner Integration Routes
router.get('/delivery/partners', (req, res) => {
  try {
    const partners = deliveryService.getAvailablePartners();
    res.json({
      success: true,
      partners
    });
  } catch (error) {
    logger.error('Failed to get delivery partners:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/delivery/orders', async (req, res) => {
  try {
    const { partnerId, orderData } = req.body;
    
    if (!partnerId || !orderData) {
      return res.status(400).json({
        success: false,
        error: 'Partner ID and order data are required'
      });
    }

    const result = await deliveryService.createOrder(partnerId, orderData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to create delivery order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.patch('/delivery/orders/:partnerId/:partnerOrderId', async (req, res) => {
  try {
    const { partnerId, partnerOrderId } = req.params;
    const { status } = req.body;

    const result = await deliveryService.updateOrderStatus(partnerId, partnerOrderId, status);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to update delivery order status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/delivery/orders/:partnerId/:partnerOrderId', async (req, res) => {
  try {
    const { partnerId, partnerOrderId } = req.params;

    const result = await deliveryService.getOrderStatus(partnerId, partnerOrderId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to get delivery order status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.delete('/delivery/orders/:partnerId/:partnerOrderId', async (req, res) => {
  try {
    const { partnerId, partnerOrderId } = req.params;
    const { reason } = req.body;

    const result = await deliveryService.cancelOrder(partnerId, partnerOrderId, reason);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to cancel delivery order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Accounting Integration Routes
router.get('/accounting/integrations', (req, res) => {
  try {
    const integrations = accountingService.getAvailableIntegrations();
    res.json({
      success: true,
      integrations
    });
  } catch (error) {
    logger.error('Failed to get accounting integrations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/accounting/export/sales', async (req, res) => {
  try {
    const { integrationId, salesData, dateRange } = req.body;
    
    if (!integrationId || !salesData) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID and sales data are required'
      });
    }

    const result = await accountingService.exportSalesData(integrationId, salesData, dateRange);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to export sales data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/accounting/export/expenses', async (req, res) => {
  try {
    const { integrationId, expenseData, dateRange } = req.body;
    
    if (!integrationId || !expenseData) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID and expense data are required'
      });
    }

    const result = await accountingService.exportExpenseData(integrationId, expenseData, dateRange);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to export expense data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/accounting/customers', async (req, res) => {
  try {
    const { integrationId, customerData } = req.body;
    
    if (!integrationId || !customerData) {
      return res.status(400).json({
        success: false,
        error: 'Integration ID and customer data are required'
      });
    }

    const result = await accountingService.createCustomer(integrationId, customerData);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to create customer in accounting system:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Notification Service Routes
router.post('/notifications/email', async (req, res) => {
  try {
    const { to, templateType, data, options } = req.body;
    
    if (!to || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Recipient, template type, and data are required'
      });
    }

    const result = await notificationService.sendEmail(to, templateType, data, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to send email notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/notifications/sms', async (req, res) => {
  try {
    const { to, templateType, data } = req.body;
    
    if (!to || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Recipient, template type, and data are required'
      });
    }

    const result = await notificationService.sendSMS(to, templateType, data);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to send SMS notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/notifications/push', async (req, res) => {
  try {
    const { deviceTokens, templateType, data } = req.body;
    
    if (!deviceTokens || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Device tokens, template type, and data are required'
      });
    }

    const result = await notificationService.sendPushNotification(deviceTokens, templateType, data);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    logger.error('Failed to send push notification:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/notifications/multi-channel', async (req, res) => {
  try {
    const { recipients, templateType, data, channels } = req.body;
    
    if (!recipients || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Recipients, template type, and data are required'
      });
    }

    const results = await notificationService.sendMultiChannel(recipients, templateType, data, channels);
    
    res.json({
      success: true,
      results
    });
  } catch (error) {
    logger.error('Failed to send multi-channel notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/notifications/bulk/email', async (req, res) => {
  try {
    const { recipients, templateType, data } = req.body;
    
    if (!recipients || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Recipients, template type, and data are required'
      });
    }

    const result = await notificationService.sendBulkEmail(recipients, templateType, data);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to send bulk email notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/notifications/bulk/sms', async (req, res) => {
  try {
    const { recipients, templateType, data } = req.body;
    
    if (!recipients || !templateType || !data) {
      return res.status(400).json({
        success: false,
        error: 'Recipients, template type, and data are required'
      });
    }

    const result = await notificationService.sendBulkSMS(recipients, templateType, data);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Failed to send bulk SMS notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
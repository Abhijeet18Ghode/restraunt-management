const axios = require('axios');
const logger = require('../utils/logger');

class DeliveryPartnerService {
  constructor() {
    this.partners = {
      uber: {
        name: 'Uber Eats',
        baseUrl: process.env.UBER_EATS_API_URL || 'https://api.uber.com/v1/eats',
        apiKey: process.env.UBER_EATS_API_KEY,
        enabled: process.env.UBER_EATS_ENABLED === 'true'
      },
      doordash: {
        name: 'DoorDash',
        baseUrl: process.env.DOORDASH_API_URL || 'https://openapi.doordash.com',
        apiKey: process.env.DOORDASH_API_KEY,
        enabled: process.env.DOORDASH_ENABLED === 'true'
      },
      grubhub: {
        name: 'Grubhub',
        baseUrl: process.env.GRUBHUB_API_URL || 'https://api-gtm.grubhub.com',
        apiKey: process.env.GRUBHUB_API_KEY,
        enabled: process.env.GRUBHUB_ENABLED === 'true'
      }
    };
  }

  async createOrder(partnerId, orderData) {
    try {
      const partner = this.partners[partnerId];
      if (!partner || !partner.enabled) {
        throw new Error(`Delivery partner ${partnerId} is not available`);
      }

      const transformedOrder = this.transformOrderData(partnerId, orderData);
      
      const response = await axios.post(
        `${partner.baseUrl}/orders`,
        transformedOrder,
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`Order created with ${partner.name}:`, {
        partnerId,
        orderId: response.data.id,
        status: response.data.status
      });

      return {
        success: true,
        partnerId,
        partnerOrderId: response.data.id,
        status: response.data.status,
        estimatedDeliveryTime: response.data.estimated_delivery_time,
        trackingUrl: response.data.tracking_url
      };
    } catch (error) {
      logger.error(`Failed to create order with ${partnerId}:`, error);
      return {
        success: false,
        partnerId,
        error: error.message
      };
    }
  }

  async updateOrderStatus(partnerId, partnerOrderId, status) {
    try {
      const partner = this.partners[partnerId];
      if (!partner || !partner.enabled) {
        throw new Error(`Delivery partner ${partnerId} is not available`);
      }

      const response = await axios.patch(
        `${partner.baseUrl}/orders/${partnerOrderId}`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info(`Order status updated with ${partner.name}:`, {
        partnerId,
        partnerOrderId,
        status: response.data.status
      });

      return {
        success: true,
        partnerId,
        partnerOrderId,
        status: response.data.status
      };
    } catch (error) {
      logger.error(`Failed to update order status with ${partnerId}:`, error);
      return {
        success: false,
        partnerId,
        partnerOrderId,
        error: error.message
      };
    }
  }

  async cancelOrder(partnerId, partnerOrderId, reason) {
    try {
      const partner = this.partners[partnerId];
      if (!partner || !partner.enabled) {
        throw new Error(`Delivery partner ${partnerId} is not available`);
      }

      const response = await axios.delete(
        `${partner.baseUrl}/orders/${partnerOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`,
            'Content-Type': 'application/json'
          },
          data: { reason },
          timeout: 10000
        }
      );

      logger.info(`Order cancelled with ${partner.name}:`, {
        partnerId,
        partnerOrderId,
        reason
      });

      return {
        success: true,
        partnerId,
        partnerOrderId,
        status: 'cancelled',
        reason
      };
    } catch (error) {
      logger.error(`Failed to cancel order with ${partnerId}:`, error);
      return {
        success: false,
        partnerId,
        partnerOrderId,
        error: error.message
      };
    }
  }

  async getOrderStatus(partnerId, partnerOrderId) {
    try {
      const partner = this.partners[partnerId];
      if (!partner || !partner.enabled) {
        throw new Error(`Delivery partner ${partnerId} is not available`);
      }

      const response = await axios.get(
        `${partner.baseUrl}/orders/${partnerOrderId}`,
        {
          headers: {
            'Authorization': `Bearer ${partner.apiKey}`
          },
          timeout: 10000
        }
      );

      return {
        success: true,
        partnerId,
        partnerOrderId,
        status: response.data.status,
        estimatedDeliveryTime: response.data.estimated_delivery_time,
        actualDeliveryTime: response.data.actual_delivery_time,
        driverInfo: response.data.driver,
        trackingUrl: response.data.tracking_url
      };
    } catch (error) {
      logger.error(`Failed to get order status from ${partnerId}:`, error);
      return {
        success: false,
        partnerId,
        partnerOrderId,
        error: error.message
      };
    }
  }

  transformOrderData(partnerId, orderData) {
    // Transform internal order format to partner-specific format
    const baseOrder = {
      external_reference_id: orderData.id,
      pickup_address: orderData.restaurant.address,
      dropoff_address: orderData.customer.address,
      items: orderData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        special_instructions: item.notes
      })),
      total_amount: orderData.total,
      currency: orderData.currency || 'USD',
      pickup_instructions: orderData.pickupInstructions,
      dropoff_instructions: orderData.deliveryInstructions,
      customer: {
        name: orderData.customer.name,
        phone: orderData.customer.phone,
        email: orderData.customer.email
      }
    };

    // Partner-specific transformations
    switch (partnerId) {
      case 'uber':
        return {
          ...baseOrder,
          pickup_time: orderData.scheduledPickupTime,
          dropoff_time: orderData.scheduledDeliveryTime
        };
      
      case 'doordash':
        return {
          ...baseOrder,
          pickup_window_start: orderData.pickupWindowStart,
          pickup_window_end: orderData.pickupWindowEnd,
          dropoff_window_start: orderData.deliveryWindowStart,
          dropoff_window_end: orderData.deliveryWindowEnd
        };
      
      case 'grubhub':
        return {
          ...baseOrder,
          restaurant_id: orderData.restaurant.grubhubId,
          delivery_fee: orderData.deliveryFee,
          tip_amount: orderData.tipAmount
        };
      
      default:
        return baseOrder;
    }
  }

  getAvailablePartners() {
    return Object.entries(this.partners)
      .filter(([_, partner]) => partner.enabled)
      .map(([id, partner]) => ({
        id,
        name: partner.name,
        enabled: partner.enabled
      }));
  }
}

module.exports = DeliveryPartnerService;
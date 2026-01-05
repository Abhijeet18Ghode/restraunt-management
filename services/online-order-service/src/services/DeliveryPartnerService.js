const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Delivery Partner Integration service for managing delivery partners
 */
class DeliveryPartnerService {
  constructor(dbManager) {
    this.db = dbManager;
    this.deliveryPartners = new Map(); // In-memory storage for demo
    this.activeDeliveries = new Map();
  }

  /**
   * Register a new delivery partner
   */
  async registerDeliveryPartner(tenantId, partnerData) {
    const { 
      name, 
      contactInfo, 
      vehicleType, 
      licenseNumber, 
      serviceAreas,
      isActive = true 
    } = partnerData;

    try {
      if (!name || !contactInfo || !vehicleType) {
        throw new ValidationError('Name, contact info, and vehicle type are required');
      }

      const partnerId = `partner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const partner = {
        id: partnerId,
        tenantId,
        name,
        contactInfo,
        vehicleType,
        licenseNumber,
        serviceAreas: serviceAreas || [],
        isActive,
        rating: 0,
        totalDeliveries: 0,
        currentStatus: 'AVAILABLE',
        registeredAt: new Date(),
      };

      const partnerKey = `${tenantId}:${partnerId}`;
      this.deliveryPartners.set(partnerKey, partner);

      return createApiResponse(partner, 'Delivery partner registered successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to register delivery partner', error.message);
    }
  }

  /**
   * Assign delivery partner to order
   */
  async assignDeliveryPartner(tenantId, orderId, deliveryAddress) {
    try {
      // Find available delivery partners
      const availablePartners = await this.getAvailablePartners(tenantId, deliveryAddress);
      
      if (availablePartners.length === 0) {
        throw new ValidationError('No delivery partners available for this area');
      }

      // Select best partner based on rating and proximity
      const selectedPartner = this.selectBestPartner(availablePartners, deliveryAddress);
      
      // Create delivery assignment
      const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const delivery = {
        id: deliveryId,
        orderId,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        partnerContact: selectedPartner.contactInfo,
        deliveryAddress,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(deliveryAddress),
      };

      this.activeDeliveries.set(deliveryId, delivery);

      // Update partner status
      const partnerKey = `${tenantId}:${selectedPartner.id}`;
      const partner = this.deliveryPartners.get(partnerKey);
      if (partner) {
        partner.currentStatus = 'BUSY';
      }

      return createApiResponse({
        deliveryId,
        partnerId: selectedPartner.id,
        partnerName: selectedPartner.name,
        partnerContact: selectedPartner.contactInfo,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
      }, 'Delivery partner assigned successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to assign delivery partner', error.message);
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(tenantId, deliveryId, status, statusData = {}) {
    try {
      const delivery = this.activeDeliveries.get(deliveryId);
      if (!delivery) {
        throw new ResourceNotFoundError('Delivery', deliveryId);
      }

      const validStatuses = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Update delivery status
      delivery.status = status;
      delivery.updatedAt = new Date();

      // Add status-specific data
      if (status === 'PICKED_UP') {
        delivery.pickedUpAt = new Date();
      } else if (status === 'IN_TRANSIT') {
        delivery.inTransitAt = new Date();
        delivery.currentLocation = statusData.currentLocation;
      } else if (status === 'DELIVERED') {
        delivery.deliveredAt = new Date();
        delivery.deliveryProof = statusData.deliveryProof;
        
        // Update partner status and stats
        await this.updatePartnerStats(tenantId, delivery.partnerId, 'DELIVERED');
      } else if (status === 'CANCELLED') {
        delivery.cancelledAt = new Date();
        delivery.cancellationReason = statusData.reason;
        
        // Make partner available again
        await this.updatePartnerStatus(tenantId, delivery.partnerId, 'AVAILABLE');
      }

      return createApiResponse(delivery, `Delivery status updated to ${status}`);
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update delivery status', error.message);
    }
  }

  /**
   * Get delivery tracking information
   */
  async getDeliveryTracking(tenantId, deliveryId) {
    try {
      const delivery = this.activeDeliveries.get(deliveryId);
      if (!delivery) {
        throw new ResourceNotFoundError('Delivery', deliveryId);
      }

      const trackingInfo = {
        deliveryId: delivery.id,
        orderId: delivery.orderId,
        status: delivery.status,
        partnerName: delivery.partnerName,
        partnerContact: delivery.partnerContact,
        estimatedDeliveryTime: delivery.estimatedDeliveryTime,
        currentLocation: delivery.currentLocation,
        timeline: this.buildDeliveryTimeline(delivery),
      };

      return createApiResponse(trackingInfo, 'Delivery tracking retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get delivery tracking', error.message);
    }
  }

  /**
   * Get available delivery partners for area
   */
  async getAvailablePartners(tenantId, deliveryAddress) {
    const availablePartners = [];
    
    for (const [key, partner] of this.deliveryPartners.entries()) {
      if (key.startsWith(`${tenantId}:`) && 
          partner.isActive && 
          partner.currentStatus === 'AVAILABLE') {
        
        // Check if partner serves this area
        const servesArea = await this.checkServiceArea(partner, deliveryAddress);
        if (servesArea) {
          availablePartners.push(partner);
        }
      }
    }

    return availablePartners;
  }

  /**
   * Select best delivery partner based on criteria
   */
  selectBestPartner(availablePartners, deliveryAddress) {
    // Sort by rating (descending) and total deliveries (ascending for load balancing)
    return availablePartners.sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating; // Higher rating first
      }
      return a.totalDeliveries - b.totalDeliveries; // Lower delivery count first
    })[0];
  }

  /**
   * Check if partner serves the delivery area
   */
  async checkServiceArea(partner, deliveryAddress) {
    // In a real system, this would check geographic boundaries
    // For now, assume all partners serve all areas
    return true;
  }

  /**
   * Calculate estimated delivery time
   */
  calculateEstimatedDeliveryTime(deliveryAddress) {
    // Base delivery time + distance factor
    const baseTime = 30; // 30 minutes base
    const distanceFactor = Math.floor(Math.random() * 20); // 0-20 minutes based on distance
    
    const estimatedMinutes = baseTime + distanceFactor;
    const estimatedTime = new Date(Date.now() + (estimatedMinutes * 60 * 1000));
    
    return estimatedTime;
  }

  /**
   * Update partner statistics
   */
  async updatePartnerStats(tenantId, partnerId, action) {
    const partnerKey = `${tenantId}:${partnerId}`;
    const partner = this.deliveryPartners.get(partnerKey);
    
    if (partner) {
      if (action === 'DELIVERED') {
        partner.totalDeliveries += 1;
        partner.currentStatus = 'AVAILABLE';
        
        // Update rating (simplified - in real system would be based on customer feedback)
        const newRating = Math.min(5, partner.rating + 0.1);
        partner.rating = Math.round(newRating * 10) / 10;
      }
    }
  }

  /**
   * Update partner status
   */
  async updatePartnerStatus(tenantId, partnerId, status) {
    const partnerKey = `${tenantId}:${partnerId}`;
    const partner = this.deliveryPartners.get(partnerKey);
    
    if (partner) {
      partner.currentStatus = status;
      partner.updatedAt = new Date();
    }
  }

  /**
   * Build delivery timeline for tracking
   */
  buildDeliveryTimeline(delivery) {
    const timeline = [];
    
    if (delivery.assignedAt) {
      timeline.push({
        status: 'ASSIGNED',
        timestamp: delivery.assignedAt,
        description: `Order assigned to ${delivery.partnerName}`,
      });
    }
    
    if (delivery.pickedUpAt) {
      timeline.push({
        status: 'PICKED_UP',
        timestamp: delivery.pickedUpAt,
        description: 'Order picked up from restaurant',
      });
    }
    
    if (delivery.inTransitAt) {
      timeline.push({
        status: 'IN_TRANSIT',
        timestamp: delivery.inTransitAt,
        description: 'Order is on the way',
      });
    }
    
    if (delivery.deliveredAt) {
      timeline.push({
        status: 'DELIVERED',
        timestamp: delivery.deliveredAt,
        description: 'Order delivered successfully',
      });
    }
    
    if (delivery.cancelledAt) {
      timeline.push({
        status: 'CANCELLED',
        timestamp: delivery.cancelledAt,
        description: `Delivery cancelled: ${delivery.cancellationReason}`,
      });
    }
    
    return timeline;
  }

  /**
   * Get partner performance metrics
   */
  async getPartnerMetrics(tenantId, partnerId) {
    try {
      const partnerKey = `${tenantId}:${partnerId}`;
      const partner = this.deliveryPartners.get(partnerKey);
      
      if (!partner) {
        throw new ResourceNotFoundError('Delivery Partner', partnerId);
      }

      const metrics = {
        partnerId: partner.id,
        name: partner.name,
        rating: partner.rating,
        totalDeliveries: partner.totalDeliveries,
        currentStatus: partner.currentStatus,
        registeredAt: partner.registeredAt,
        // Additional metrics would be calculated from delivery history
        averageDeliveryTime: 35, // minutes
        onTimeDeliveryRate: 0.92, // 92%
        customerRating: partner.rating,
      };

      return createApiResponse(metrics, 'Partner metrics retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get partner metrics', error.message);
    }
  }
}

module.exports = DeliveryPartnerService;
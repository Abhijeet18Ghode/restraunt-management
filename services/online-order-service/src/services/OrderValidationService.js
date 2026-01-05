const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Order Validation and Scheduling service for online orders
 */
class OrderValidationService {
  constructor(dbManager) {
    this.db = dbManager;
    this.inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002';
    this.menuServiceUrl = process.env.MENU_SERVICE_URL || 'http://localhost:3001';
  }

  /**
   * Validate online order before processing
   */
  async validateOrder(tenantId, orderData) {
    const validationResults = {
      isValid: true,
      errors: [],
      warnings: [],
      validatedItems: [],
    };

    try {
      // 1. Validate store hours
      const storeHoursValidation = await this.validateStoreHours(tenantId, orderData.outletId, orderData.scheduledTime);
      if (!storeHoursValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(...storeHoursValidation.errors);
      }

      // 2. Validate inventory availability
      const inventoryValidation = await this.validateInventoryAvailability(tenantId, orderData.items);
      if (!inventoryValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(...inventoryValidation.errors);
      }
      validationResults.warnings.push(...inventoryValidation.warnings);
      validationResults.validatedItems = inventoryValidation.validatedItems;

      // 3. Validate promotion code
      if (orderData.promotionCode) {
        const promotionValidation = await this.validatePromotionCode(tenantId, orderData.promotionCode, orderData);
        if (!promotionValidation.isValid) {
          validationResults.isValid = false;
          validationResults.errors.push(...promotionValidation.errors);
        }
      }

      // 4. Validate delivery area (for delivery orders)
      if (orderData.orderType === 'DELIVERY') {
        const deliveryValidation = await this.validateDeliveryArea(tenantId, orderData.outletId, orderData.deliveryAddress);
        if (!deliveryValidation.isValid) {
          validationResults.isValid = false;
          validationResults.errors.push(...deliveryValidation.errors);
        }
      }

      // 5. Validate minimum order amount
      const minimumOrderValidation = await this.validateMinimumOrderAmount(tenantId, orderData);
      if (!minimumOrderValidation.isValid) {
        validationResults.isValid = false;
        validationResults.errors.push(...minimumOrderValidation.errors);
      }

      return createApiResponse(validationResults, 
        validationResults.isValid ? 'Order validation passed' : 'Order validation failed'
      );
    } catch (error) {
      throw new DatabaseError('Failed to validate order', error.message);
    }
  }

  /**
   * Validate store operating hours
   */
  async validateStoreHours(tenantId, outletId, scheduledTime = null) {
    const result = { isValid: true, errors: [] };

    try {
      // Get store hours for the outlet
      const storeHours = await this.getStoreHours(tenantId, outletId);
      
      const orderTime = scheduledTime ? new Date(scheduledTime) : new Date();
      const currentTime = new Date();
      
      // Check if ordering for past time
      if (scheduledTime && orderTime < currentTime) {
        result.isValid = false;
        result.errors.push('Cannot schedule order for past time');
        return result;
      }

      // Get day of week (0 = Sunday, 1 = Monday, etc.)
      const dayOfWeek = orderTime.getDay();
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      const dayHours = storeHours[dayName];
      
      // Check if store is closed on this day
      if (!dayHours || dayHours.isClosed) {
        result.isValid = false;
        result.errors.push(`Store is closed on ${dayName}`);
        return result;
      }

      // Check if order time is within operating hours
      const orderHour = orderTime.getHours();
      const orderMinute = orderTime.getMinutes();
      const orderTimeInMinutes = orderHour * 60 + orderMinute;

      const [openHour, openMinute] = dayHours.openTime.split(':').map(Number);
      const [closeHour, closeMinute] = dayHours.closeTime.split(':').map(Number);
      
      const openTimeInMinutes = openHour * 60 + openMinute;
      const closeTimeInMinutes = closeHour * 60 + closeMinute;

      if (orderTimeInMinutes < openTimeInMinutes || orderTimeInMinutes > closeTimeInMinutes) {
        result.isValid = false;
        result.errors.push(`Store is closed at the requested time. Operating hours: ${dayHours.openTime} - ${dayHours.closeTime}`);
      }

      // Check advance ordering limits (e.g., can't order more than 7 days in advance)
      const maxAdvanceDays = 7;
      const maxAdvanceTime = new Date(currentTime.getTime() + (maxAdvanceDays * 24 * 60 * 60 * 1000));
      
      if (scheduledTime && orderTime > maxAdvanceTime) {
        result.isValid = false;
        result.errors.push(`Cannot schedule order more than ${maxAdvanceDays} days in advance`);
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate store hours');
      return result;
    }
  }

  /**
   * Validate inventory availability for order items
   */
  async validateInventoryAvailability(tenantId, items) {
    const result = { 
      isValid: true, 
      errors: [], 
      warnings: [],
      validatedItems: []
    };

    try {
      for (const item of items) {
        const itemValidation = {
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          requestedQuantity: item.quantity,
          availableQuantity: 0,
          isAvailable: false,
          stockLevel: 'unknown',
        };

        // Check inventory availability
        const inventoryCheck = await this.checkInventoryAvailability(tenantId, item.menuItemId, item.quantity);
        
        itemValidation.availableQuantity = inventoryCheck.availableQuantity;
        itemValidation.isAvailable = inventoryCheck.isAvailable;
        itemValidation.stockLevel = inventoryCheck.stockLevel;

        if (!inventoryCheck.isAvailable) {
          result.isValid = false;
          if (inventoryCheck.availableQuantity === 0) {
            result.errors.push(`${item.menuItemName} is out of stock`);
          } else {
            result.errors.push(`${item.menuItemName}: Only ${inventoryCheck.availableQuantity} available, requested ${item.quantity}`);
          }
        } else if (inventoryCheck.stockLevel === 'low') {
          result.warnings.push(`${item.menuItemName} is running low on stock`);
        }

        result.validatedItems.push(itemValidation);
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate inventory availability');
      return result;
    }
  }

  /**
   * Validate promotion code
   */
  async validatePromotionCode(tenantId, promotionCode, orderData) {
    const result = { isValid: true, errors: [] };

    try {
      // Get promotion details
      const promotion = await this.getPromotionDetails(tenantId, promotionCode);
      
      if (!promotion) {
        result.isValid = false;
        result.errors.push('Invalid promotion code');
        return result;
      }

      // Check if promotion is active
      const currentTime = new Date();
      if (promotion.startDate && currentTime < new Date(promotion.startDate)) {
        result.isValid = false;
        result.errors.push('Promotion has not started yet');
        return result;
      }

      if (promotion.endDate && currentTime > new Date(promotion.endDate)) {
        result.isValid = false;
        result.errors.push('Promotion has expired');
        return result;
      }

      // Check minimum order amount
      const orderSubtotal = orderData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      if (promotion.minOrderAmount && orderSubtotal < promotion.minOrderAmount) {
        result.isValid = false;
        result.errors.push(`Minimum order amount of ₹${promotion.minOrderAmount} required for this promotion`);
        return result;
      }

      // Check usage limits
      if (promotion.usageLimit && promotion.usedCount >= promotion.usageLimit) {
        result.isValid = false;
        result.errors.push('Promotion usage limit exceeded');
        return result;
      }

      // Check customer-specific limits
      if (orderData.customerId && promotion.perCustomerLimit) {
        const customerUsage = await this.getCustomerPromotionUsage(tenantId, orderData.customerId, promotionCode);
        if (customerUsage >= promotion.perCustomerLimit) {
          result.isValid = false;
          result.errors.push('You have reached the usage limit for this promotion');
          return result;
        }
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate promotion code');
      return result;
    }
  }

  /**
   * Validate delivery area
   */
  async validateDeliveryArea(tenantId, outletId, deliveryAddress) {
    const result = { isValid: true, errors: [] };

    try {
      // Get delivery zones for the outlet
      const deliveryZones = await this.getDeliveryZones(tenantId, outletId);
      
      if (!deliveryZones || deliveryZones.length === 0) {
        result.isValid = false;
        result.errors.push('Delivery not available from this outlet');
        return result;
      }

      // Check if delivery address is within service area
      const isInServiceArea = await this.checkDeliveryArea(deliveryAddress, deliveryZones);
      
      if (!isInServiceArea) {
        result.isValid = false;
        result.errors.push('Delivery not available to this address');
        return result;
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate delivery area');
      return result;
    }
  }

  /**
   * Validate minimum order amount
   */
  async validateMinimumOrderAmount(tenantId, orderData) {
    const result = { isValid: true, errors: [] };

    try {
      const minimumOrderConfig = await this.getMinimumOrderConfig(tenantId, orderData.outletId, orderData.orderType);
      
      if (minimumOrderConfig && minimumOrderConfig.minimumAmount) {
        const orderSubtotal = orderData.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        
        if (orderSubtotal < minimumOrderConfig.minimumAmount) {
          result.isValid = false;
          result.errors.push(`Minimum order amount of ₹${minimumOrderConfig.minimumAmount} required for ${orderData.orderType.toLowerCase()} orders`);
        }
      }

      return result;
    } catch (error) {
      result.isValid = false;
      result.errors.push('Failed to validate minimum order amount');
      return result;
    }
  }

  /**
   * Get store hours for outlet
   */
  async getStoreHours(tenantId, outletId) {
    // In a real system, this would query the database
    // For now, return default hours
    return {
      monday: { openTime: '09:00', closeTime: '22:00', isClosed: false },
      tuesday: { openTime: '09:00', closeTime: '22:00', isClosed: false },
      wednesday: { openTime: '09:00', closeTime: '22:00', isClosed: false },
      thursday: { openTime: '09:00', closeTime: '22:00', isClosed: false },
      friday: { openTime: '09:00', closeTime: '23:00', isClosed: false },
      saturday: { openTime: '09:00', closeTime: '23:00', isClosed: false },
      sunday: { openTime: '10:00', closeTime: '22:00', isClosed: false },
    };
  }

  /**
   * Check inventory availability for menu item
   */
  async checkInventoryAvailability(tenantId, menuItemId, requestedQuantity) {
    // In a real system, this would call the inventory service API
    // For now, simulate inventory check
    const mockInventory = {
      availableQuantity: Math.floor(Math.random() * 50) + 10, // Random between 10-60
      stockLevel: Math.random() > 0.8 ? 'low' : 'normal', // 20% chance of low stock
    };

    return {
      isAvailable: mockInventory.availableQuantity >= requestedQuantity,
      availableQuantity: mockInventory.availableQuantity,
      stockLevel: mockInventory.stockLevel,
    };
  }

  /**
   * Get promotion details
   */
  async getPromotionDetails(tenantId, promotionCode) {
    // In a real system, this would query the promotions table
    const mockPromotions = {
      'WELCOME10': {
        code: 'WELCOME10',
        type: 'percentage',
        value: 10,
        minOrderAmount: 100,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        usageLimit: 1000,
        usedCount: 50,
        perCustomerLimit: 1,
        isActive: true,
      },
      'FLAT50': {
        code: 'FLAT50',
        type: 'fixed',
        value: 50,
        minOrderAmount: 200,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        usageLimit: 500,
        usedCount: 100,
        perCustomerLimit: 3,
        isActive: true,
      },
    };

    return mockPromotions[promotionCode] || null;
  }

  /**
   * Get customer promotion usage count
   */
  async getCustomerPromotionUsage(tenantId, customerId, promotionCode) {
    // In a real system, this would query the order history
    return Math.floor(Math.random() * 3); // Random usage count 0-2
  }

  /**
   * Get delivery zones for outlet
   */
  async getDeliveryZones(tenantId, outletId) {
    // In a real system, this would query the delivery zones table
    return [
      { name: 'Zone 1', radius: 5, coordinates: { lat: 12.9716, lng: 77.5946 } },
      { name: 'Zone 2', radius: 3, coordinates: { lat: 12.9716, lng: 77.5946 } },
    ];
  }

  /**
   * Check if address is within delivery area
   */
  async checkDeliveryArea(deliveryAddress, deliveryZones) {
    // In a real system, this would use geocoding and distance calculation
    // For now, simulate area check
    return Math.random() > 0.1; // 90% chance address is in service area
  }

  /**
   * Get minimum order configuration
   */
  async getMinimumOrderConfig(tenantId, outletId, orderType) {
    // In a real system, this would query the outlet configuration
    const configs = {
      'DELIVERY': { minimumAmount: 150 },
      'PICKUP': { minimumAmount: 50 },
    };

    return configs[orderType] || null;
  }
}

module.exports = OrderValidationService;
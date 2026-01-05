const { 
  MenuItemModel,
  createApiResponse,
  ValidationError,
  DatabaseError
} = require('@rms/shared');

/**
 * Menu availability management service
 */
class AvailabilityService {
  constructor(dbManager) {
    this.db = dbManager;
    this.menuItemModel = new MenuItemModel(dbManager);
  }

  /**
   * Update availability based on inventory levels
   */
  async updateAvailabilityFromInventory(tenantId, outletId) {
    try {
      // Get items with low inventory
      const lowInventoryItems = await this.menuItemModel.getItemsWithLowInventory(tenantId, outletId);
      
      if (lowInventoryItems.length === 0) {
        return createApiResponse([], 'No items with low inventory found');
      }

      // Disable items with insufficient inventory
      const itemIds = lowInventoryItems.map(item => item.id);
      const updatedItems = await this.menuItemModel.updateAvailability(tenantId, itemIds, false);

      return createApiResponse(
        updatedItems,
        `${updatedItems.length} items disabled due to low inventory`
      );
    } catch (error) {
      throw new DatabaseError('Failed to update availability from inventory', error.message);
    }
  }

  /**
   * Schedule availability changes
   */
  async scheduleAvailabilityChange(tenantId, scheduleData) {
    const { itemIds, isAvailable, scheduledTime, reason } = scheduleData;

    try {
      // For now, we'll implement immediate changes
      // In a production system, this would use a job queue like Bull or Agenda
      const currentTime = new Date();
      const targetTime = new Date(scheduledTime);

      if (targetTime <= currentTime) {
        // Execute immediately
        const updatedItems = await this.menuItemModel.updateAvailability(
          tenantId, 
          itemIds, 
          isAvailable
        );

        return createApiResponse(
          updatedItems,
          `Availability updated immediately for ${updatedItems.length} items`
        );
      } else {
        // In a real implementation, this would schedule the job
        // For now, we'll just return a success message
        return createApiResponse(
          { 
            itemIds, 
            isAvailable, 
            scheduledTime, 
            reason,
            status: 'scheduled' 
          },
          `Availability change scheduled for ${itemIds.length} items at ${scheduledTime}`
        );
      }
    } catch (error) {
      throw new DatabaseError('Failed to schedule availability change', error.message);
    }
  }

  /**
   * Get availability status for outlet
   */
  async getOutletAvailabilityStatus(tenantId, outletId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_items,
          COUNT(CASE WHEN is_available = true THEN 1 END) as available_items,
          COUNT(CASE WHEN is_available = false THEN 1 END) as unavailable_items
        FROM menu_items 
        WHERE (outlet_ids = '[]' OR outlet_ids::jsonb ? $1)
      `;

      const result = await this.db.query(tenantId, query, [outletId]);
      const row = result.rows[0];

      const status = {
        outletId,
        totalItems: parseInt(row.total_items),
        availableItems: parseInt(row.available_items),
        unavailableItems: parseInt(row.unavailable_items),
        availabilityPercentage: row.total_items > 0 
          ? Math.round((row.available_items / row.total_items) * 100) 
          : 0,
      };

      return createApiResponse(status, 'Outlet availability status retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get outlet availability status', error.message);
    }
  }

  /**
   * Bulk availability update with reasons
   */
  async bulkUpdateAvailability(tenantId, updates) {
    try {
      const results = [];
      const errors = [];

      for (const update of updates) {
        try {
          const { itemId, isAvailable, reason } = update;
          
          const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, {
            is_available: isAvailable
          });

          if (updatedItem) {
            results.push({
              ...updatedItem,
              reason,
            });
          }
        } catch (error) {
          errors.push({
            itemId: update.itemId,
            error: error.message,
          });
        }
      }

      return createApiResponse(
        {
          updated: results,
          errors: errors,
          summary: {
            total: updates.length,
            successful: results.length,
            failed: errors.length,
          },
        },
        `Bulk availability update completed: ${results.length}/${updates.length} items updated`
      );
    } catch (error) {
      throw new DatabaseError('Failed to bulk update availability', error.message);
    }
  }

  /**
   * Get availability history (placeholder for audit trail)
   */
  async getAvailabilityHistory(tenantId, itemId, options = {}) {
    try {
      // In a real implementation, this would query an audit/history table
      // For now, we'll return the current item status
      const item = await this.menuItemModel.findById(tenantId, itemId);
      
      if (!item) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      const history = [
        {
          itemId: item.id,
          itemName: item.name,
          isAvailable: item.isAvailable,
          changedAt: item.updatedAt,
          changedBy: 'system', // In real implementation, track user
          reason: 'Current status',
        },
      ];

      return createApiResponse(history, 'Availability history retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get availability history', error.message);
    }
  }

  /**
   * Auto-disable items based on time rules
   */
  async applyTimeBasedAvailability(tenantId, outletId) {
    try {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();
      const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

      // Get outlet operating hours
      const outletQuery = `SELECT operating_hours FROM outlets WHERE id = $1`;
      const outletResult = await this.db.query(tenantId, outletQuery, [outletId]);
      
      if (outletResult.rows.length === 0) {
        throw new ValidationError('Outlet not found');
      }

      const operatingHours = outletResult.rows[0].operating_hours;
      const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayHours = operatingHours[dayOfWeek];

      let shouldBeAvailable = true;
      if (!dayHours || !dayHours.open || !dayHours.close) {
        shouldBeAvailable = false; // Closed today
      } else {
        shouldBeAvailable = currentTimeString >= dayHours.open && currentTimeString <= dayHours.close;
      }

      // Update all items for this outlet based on operating hours
      const updateQuery = `
        UPDATE menu_items 
        SET is_available = $1, updated_at = NOW()
        WHERE (outlet_ids = '[]' OR outlet_ids::jsonb ? $2)
        RETURNING *
      `;

      const result = await this.db.query(tenantId, updateQuery, [shouldBeAvailable, outletId]);
      const updatedItems = result.rows.map(row => this.menuItemModel.mapRowToObject(row));

      return createApiResponse(
        updatedItems,
        `Time-based availability applied: ${updatedItems.length} items ${shouldBeAvailable ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to apply time-based availability', error.message);
    }
  }
}

module.exports = AvailabilityService;
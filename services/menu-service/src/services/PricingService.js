const { 
  MenuItemModel,
  createApiResponse,
  ValidationError,
  DatabaseError
} = require('@rms/shared');

/**
 * Menu pricing management service
 */
class PricingService {
  constructor(dbManager) {
    this.db = dbManager;
    this.menuItemModel = new MenuItemModel(dbManager);
  }

  /**
   * Apply percentage-based price changes
   */
  async applyPercentageChange(tenantId, priceChangeData) {
    const { itemIds, percentage, roundTo = 0.01, minPrice = 0.01 } = priceChangeData;

    try {
      if (percentage === 0) {
        throw new ValidationError('Percentage change cannot be zero');
      }

      const results = [];
      const errors = [];

      for (const itemId of itemIds) {
        try {
          const item = await this.menuItemModel.findById(tenantId, itemId);
          
          if (!item) {
            errors.push({ itemId, error: 'Item not found' });
            continue;
          }

          const currentPrice = item.price;
          let newPrice = currentPrice * (1 + percentage / 100);
          
          // Round to specified precision
          newPrice = Math.round(newPrice / roundTo) * roundTo;
          
          // Ensure minimum price
          newPrice = Math.max(newPrice, minPrice);

          const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, {
            price: newPrice
          });

          results.push({
            ...updatedItem,
            previousPrice: currentPrice,
            priceChange: newPrice - currentPrice,
            percentageApplied: percentage,
          });
        } catch (error) {
          errors.push({ itemId, error: error.message });
        }
      }

      return createApiResponse(
        {
          updated: results,
          errors: errors,
          summary: {
            total: itemIds.length,
            successful: results.length,
            failed: errors.length,
            totalPriceChange: results.reduce((sum, item) => sum + item.priceChange, 0),
          },
        },
        `Price change applied: ${results.length}/${itemIds.length} items updated`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to apply percentage price change', error.message);
    }
  }

  /**
   * Apply category-based pricing
   */
  async applyCategoryPricing(tenantId, categoryPricingData) {
    const { categoryId, priceMultiplier, fixedAdjustment = 0 } = categoryPricingData;

    try {
      if (priceMultiplier <= 0) {
        throw new ValidationError('Price multiplier must be positive');
      }

      const query = `
        UPDATE menu_items 
        SET price = GREATEST(
          (price * $1) + $2, 
          0.01
        ), updated_at = NOW()
        WHERE category_id = $3
        RETURNING *
      `;

      const result = await this.db.query(tenantId, query, [
        priceMultiplier,
        fixedAdjustment,
        categoryId
      ]);

      const updatedItems = result.rows.map(row => this.menuItemModel.mapRowToObject(row));

      return createApiResponse(
        updatedItems,
        `Category pricing applied to ${updatedItems.length} items`
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to apply category pricing', error.message);
    }
  }

  /**
   * Get pricing analytics
   */
  async getPricingAnalytics(tenantId, options = {}) {
    try {
      const { categoryId, outletId } = options;

      let whereClause = '';
      const queryParams = [];
      let paramIndex = 1;

      if (categoryId) {
        whereClause += `WHERE category_id = $${paramIndex++}`;
        queryParams.push(categoryId);
      }

      if (outletId) {
        const outletCondition = `(outlet_ids = '[]' OR outlet_ids::jsonb ? $${paramIndex++})`;
        whereClause = whereClause 
          ? `${whereClause} AND ${outletCondition}`
          : `WHERE ${outletCondition}`;
        queryParams.push(outletId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_items,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price,
          STDDEV(price) as price_stddev,
          PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price) as price_25th,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as price_median,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price) as price_75th
        FROM menu_items 
        ${whereClause}
      `;

      const result = await this.db.query(tenantId, query, queryParams);
      const row = result.rows[0];

      const analytics = {
        totalItems: parseInt(row.total_items),
        averagePrice: parseFloat(row.average_price) || 0,
        minPrice: parseFloat(row.min_price) || 0,
        maxPrice: parseFloat(row.max_price) || 0,
        priceStandardDeviation: parseFloat(row.price_stddev) || 0,
        pricePercentiles: {
          p25: parseFloat(row.price_25th) || 0,
          p50: parseFloat(row.price_median) || 0,
          p75: parseFloat(row.price_75th) || 0,
        },
        priceRange: parseFloat(row.max_price) - parseFloat(row.min_price) || 0,
      };

      return createApiResponse(analytics, 'Pricing analytics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get pricing analytics', error.message);
    }
  }

  /**
   * Compare prices with competitors (placeholder)
   */
  async compareWithCompetitors(tenantId, itemIds) {
    try {
      // In a real implementation, this would integrate with external pricing APIs
      // For now, we'll return mock comparison data
      const items = [];
      
      for (const itemId of itemIds) {
        const item = await this.menuItemModel.findById(tenantId, itemId);
        if (item) {
          items.push({
            ...item,
            competitorPrices: {
              average: item.price * (0.9 + Math.random() * 0.2), // Mock data
              min: item.price * 0.8,
              max: item.price * 1.2,
              sources: ['Restaurant A', 'Restaurant B', 'Restaurant C'],
            },
            pricePosition: Math.random() > 0.5 ? 'competitive' : 'above_average',
          });
        }
      }

      return createApiResponse(
        items,
        'Price comparison with competitors retrieved successfully'
      );
    } catch (error) {
      throw new DatabaseError('Failed to compare prices with competitors', error.message);
    }
  }

  /**
   * Generate pricing recommendations
   */
  async generatePricingRecommendations(tenantId, options = {}) {
    try {
      const { categoryId, targetMargin = 0.3 } = options;

      let whereClause = '';
      const queryParams = [];
      
      if (categoryId) {
        whereClause = 'WHERE category_id = $1';
        queryParams.push(categoryId);
      }

      const query = `
        SELECT * FROM menu_items ${whereClause}
        ORDER BY price ASC
      `;

      const result = await this.db.query(tenantId, query, queryParams);
      const items = result.rows.map(row => this.menuItemModel.mapRowToObject(row));

      const recommendations = items.map(item => {
        // Calculate cost from ingredients (simplified)
        const estimatedCost = item.price * 0.4; // Assume 40% food cost
        const recommendedPrice = estimatedCost / (1 - targetMargin);
        const currentMargin = (item.price - estimatedCost) / item.price;

        return {
          itemId: item.id,
          itemName: item.name,
          currentPrice: item.price,
          recommendedPrice: Math.round(recommendedPrice * 100) / 100,
          currentMargin: Math.round(currentMargin * 100),
          targetMargin: Math.round(targetMargin * 100),
          priceDifference: recommendedPrice - item.price,
          recommendation: recommendedPrice > item.price ? 'increase' : 'decrease',
          confidence: Math.random() * 0.3 + 0.7, // Mock confidence score
        };
      });

      return createApiResponse(
        recommendations,
        'Pricing recommendations generated successfully'
      );
    } catch (error) {
      throw new DatabaseError('Failed to generate pricing recommendations', error.message);
    }
  }

  /**
   * Schedule price changes
   */
  async schedulePriceChange(tenantId, scheduleData) {
    const { itemId, newPrice, scheduledTime, reason } = scheduleData;

    try {
      if (newPrice < 0) {
        throw new ValidationError('Price cannot be negative');
      }

      const currentTime = new Date();
      const targetTime = new Date(scheduledTime);

      if (targetTime <= currentTime) {
        // Execute immediately
        const updatedItem = await this.menuItemModel.updateById(tenantId, itemId, {
          price: newPrice
        });

        if (!updatedItem) {
          throw new ResourceNotFoundError('Menu item', itemId);
        }

        return createApiResponse(
          updatedItem,
          'Price updated immediately'
        );
      } else {
        // In a real implementation, this would schedule the job
        return createApiResponse(
          { 
            itemId, 
            newPrice, 
            scheduledTime, 
            reason,
            status: 'scheduled' 
          },
          `Price change scheduled for ${scheduledTime}`
        );
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to schedule price change', error.message);
    }
  }

  /**
   * Get price history (placeholder for audit trail)
   */
  async getPriceHistory(tenantId, itemId, options = {}) {
    try {
      // In a real implementation, this would query a price history table
      const item = await this.menuItemModel.findById(tenantId, itemId);
      
      if (!item) {
        throw new ResourceNotFoundError('Menu item', itemId);
      }

      const history = [
        {
          itemId: item.id,
          itemName: item.name,
          price: item.price,
          changedAt: item.updatedAt,
          changedBy: 'system', // In real implementation, track user
          reason: 'Current price',
        },
      ];

      return createApiResponse(history, 'Price history retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get price history', error.message);
    }
  }
}

module.exports = PricingService;
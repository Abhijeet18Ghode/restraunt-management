const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Loyalty Program service for managing customer loyalty and rewards
 */
class LoyaltyService {
  constructor(dbManager) {
    this.db = dbManager;
    this.loyaltyTransactions = new Map(); // In-memory storage for demo
    this.rewardCatalog = new Map(); // Available rewards
    this.redemptions = new Map(); // Redemption history
    this.initializeDefaultRewards();
  }

  /**
   * Initialize default reward catalog
   */
  initializeDefaultRewards() {
    const defaultRewards = [
      {
        id: 'reward-free-appetizer',
        name: 'Free Appetizer',
        description: 'Get any appetizer for free',
        pointsCost: 100,
        category: 'FOOD',
        isActive: true,
        validityDays: 30,
      },
      {
        id: 'reward-10-percent-discount',
        name: '10% Off Next Order',
        description: '10% discount on your next order',
        pointsCost: 150,
        category: 'DISCOUNT',
        isActive: true,
        validityDays: 30,
      },
      {
        id: 'reward-free-dessert',
        name: 'Free Dessert',
        description: 'Get any dessert for free',
        pointsCost: 75,
        category: 'FOOD',
        isActive: true,
        validityDays: 30,
      },
      {
        id: 'reward-free-drink',
        name: 'Free Beverage',
        description: 'Get any beverage for free',
        pointsCost: 50,
        category: 'BEVERAGE',
        isActive: true,
        validityDays: 30,
      },
      {
        id: 'reward-birthday-special',
        name: 'Birthday Special',
        description: 'Free meal on your birthday',
        pointsCost: 200,
        category: 'SPECIAL',
        isActive: true,
        validityDays: 7,
      },
    ];

    defaultRewards.forEach(reward => {
      this.rewardCatalog.set(reward.id, reward);
    });
  }

  /**
   * Award loyalty points to customer
   */
  async awardPoints(tenantId, customerId, points, reason, orderId = null) {
    try {
      if (points <= 0) {
        throw new ValidationError('Points must be greater than 0');
      }

      const transactionId = `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const transaction = {
        id: transactionId,
        tenantId,
        customerId,
        type: 'EARNED',
        points,
        reason,
        orderId,
        createdAt: new Date(),
      };

      const transactionKey = `${tenantId}:${customerId}`;
      if (!this.loyaltyTransactions.has(transactionKey)) {
        this.loyaltyTransactions.set(transactionKey, []);
      }

      const transactions = this.loyaltyTransactions.get(transactionKey);
      transactions.push(transaction);
      this.loyaltyTransactions.set(transactionKey, transactions);

      return createApiResponse(transaction, 'Loyalty points awarded successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to award loyalty points', error.message);
    }
  }

  /**
   * Redeem loyalty points for rewards
   */
  async redeemPoints(tenantId, customerId, rewardId, customerService) {
    try {
      // Get reward details
      const reward = this.rewardCatalog.get(rewardId);
      if (!reward) {
        throw new ResourceNotFoundError('Reward', rewardId);
      }

      if (!reward.isActive) {
        throw new ValidationError('Reward is not currently available');
      }

      // Get customer current points
      const customerResult = await customerService.getCustomerById(tenantId, customerId);
      const customer = customerResult.data;

      if (customer.loyaltyPoints < reward.pointsCost) {
        throw new ValidationError(`Insufficient points. Required: ${reward.pointsCost}, Available: ${customer.loyaltyPoints}`);
      }

      // Create redemption record
      const redemptionId = `redemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + reward.validityDays);

      const redemption = {
        id: redemptionId,
        tenantId,
        customerId,
        rewardId,
        rewardName: reward.name,
        pointsRedeemed: reward.pointsCost,
        status: 'ACTIVE',
        expiryDate,
        redeemedAt: new Date(),
        usedAt: null,
      };

      // Store redemption
      const redemptionKey = `${tenantId}:${customerId}`;
      if (!this.redemptions.has(redemptionKey)) {
        this.redemptions.set(redemptionKey, []);
      }

      const redemptions = this.redemptions.get(redemptionKey);
      redemptions.push(redemption);
      this.redemptions.set(redemptionKey, redemptions);

      // Record points deduction transaction
      const transactionId = `loyalty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction = {
        id: transactionId,
        tenantId,
        customerId,
        type: 'REDEEMED',
        points: -reward.pointsCost,
        reason: `Redeemed for ${reward.name}`,
        redemptionId,
        createdAt: new Date(),
      };

      const transactionKey = `${tenantId}:${customerId}`;
      if (!this.loyaltyTransactions.has(transactionKey)) {
        this.loyaltyTransactions.set(transactionKey, []);
      }

      const transactions = this.loyaltyTransactions.get(transactionKey);
      transactions.push(transaction);
      this.loyaltyTransactions.set(transactionKey, transactions);

      // Update customer points
      await customerService.updateCustomer(tenantId, customerId, {
        loyaltyPoints: customer.loyaltyPoints - reward.pointsCost,
      });

      return createApiResponse({
        redemption,
        reward,
        remainingPoints: customer.loyaltyPoints - reward.pointsCost,
      }, 'Points redeemed successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to redeem points', error.message);
    }
  }

  /**
   * Use a redeemed reward
   */
  async useReward(tenantId, customerId, redemptionId) {
    try {
      const redemptionKey = `${tenantId}:${customerId}`;
      const redemptions = this.redemptions.get(redemptionKey) || [];
      
      const redemption = redemptions.find(r => r.id === redemptionId);
      if (!redemption) {
        throw new ResourceNotFoundError('Redemption', redemptionId);
      }

      if (redemption.status !== 'ACTIVE') {
        throw new ValidationError('Reward has already been used or expired');
      }

      if (new Date() > new Date(redemption.expiryDate)) {
        redemption.status = 'EXPIRED';
        throw new ValidationError('Reward has expired');
      }

      // Mark as used
      redemption.status = 'USED';
      redemption.usedAt = new Date();

      // Update redemptions
      this.redemptions.set(redemptionKey, redemptions);

      return createApiResponse(redemption, 'Reward used successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to use reward', error.message);
    }
  }

  /**
   * Get customer loyalty summary
   */
  async getLoyaltySummary(tenantId, customerId, customerService) {
    try {
      // Get customer details
      const customerResult = await customerService.getCustomerById(tenantId, customerId);
      const customer = customerResult.data;

      // Get loyalty transactions
      const transactionKey = `${tenantId}:${customerId}`;
      const transactions = this.loyaltyTransactions.get(transactionKey) || [];

      // Get active redemptions
      const redemptionKey = `${tenantId}:${customerId}`;
      const allRedemptions = this.redemptions.get(redemptionKey) || [];
      const activeRedemptions = allRedemptions.filter(r => 
        r.status === 'ACTIVE' && new Date() <= new Date(r.expiryDate)
      );

      // Calculate points earned and redeemed
      const pointsEarned = transactions
        .filter(t => t.type === 'EARNED')
        .reduce((sum, t) => sum + t.points, 0);

      const pointsRedeemed = transactions
        .filter(t => t.type === 'REDEEMED')
        .reduce((sum, t) => sum + Math.abs(t.points), 0);

      // Get next tier information
      const nextTierInfo = this.getNextTierInfo(customer.loyaltyPoints);

      const summary = {
        customerId,
        currentPoints: customer.loyaltyPoints,
        currentTier: customer.loyaltyTier,
        pointsEarned,
        pointsRedeemed,
        activeRedemptions: activeRedemptions.length,
        nextTier: nextTierInfo,
        recentTransactions: transactions
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10),
        availableRewards: this.getAvailableRewards(customer.loyaltyPoints),
      };

      return createApiResponse(summary, 'Loyalty summary retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get loyalty summary', error.message);
    }
  }

  /**
   * Get customer redemption history
   */
  async getRedemptionHistory(tenantId, customerId, limit = 20) {
    try {
      const redemptionKey = `${tenantId}:${customerId}`;
      const redemptions = this.redemptions.get(redemptionKey) || [];

      // Sort by redemption date (newest first) and limit results
      const sortedRedemptions = redemptions
        .sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))
        .slice(0, limit);

      return createApiResponse({
        redemptions: sortedRedemptions,
        total: redemptions.length,
      }, 'Redemption history retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get redemption history', error.message);
    }
  }

  /**
   * Get available rewards for customer
   */
  getAvailableRewards(customerPoints) {
    const availableRewards = [];
    
    for (const [id, reward] of this.rewardCatalog.entries()) {
      if (reward.isActive) {
        availableRewards.push({
          ...reward,
          canAfford: customerPoints >= reward.pointsCost,
          pointsNeeded: Math.max(0, reward.pointsCost - customerPoints),
        });
      }
    }

    return availableRewards.sort((a, b) => a.pointsCost - b.pointsCost);
  }

  /**
   * Get next tier information
   */
  getNextTierInfo(currentPoints) {
    const tiers = [
      { name: 'BRONZE', threshold: 0 },
      { name: 'SILVER', threshold: 100 },
      { name: 'GOLD', threshold: 500 },
      { name: 'PLATINUM', threshold: 1000 },
    ];

    const currentTierIndex = tiers.findIndex(tier => 
      currentPoints >= tier.threshold && 
      (tiers[tiers.length - 1] === tier || currentPoints < tiers[tiers.indexOf(tier) + 1]?.threshold)
    );

    if (currentTierIndex === tiers.length - 1) {
      return {
        tier: 'PLATINUM',
        isMaxTier: true,
        pointsToNext: 0,
        progress: 100,
      };
    }

    const nextTier = tiers[currentTierIndex + 1];
    const currentTier = tiers[currentTierIndex];
    const pointsToNext = nextTier.threshold - currentPoints;
    const progress = Math.round(((currentPoints - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100);

    return {
      tier: nextTier.name,
      isMaxTier: false,
      pointsToNext,
      progress: Math.max(0, progress),
    };
  }

  /**
   * Add custom reward to catalog
   */
  async addReward(tenantId, rewardData) {
    const {
      name,
      description,
      pointsCost,
      category = 'CUSTOM',
      validityDays = 30,
      isActive = true,
    } = rewardData;

    try {
      if (!name || !description || !pointsCost) {
        throw new ValidationError('Name, description, and points cost are required');
      }

      if (pointsCost <= 0) {
        throw new ValidationError('Points cost must be greater than 0');
      }

      const rewardId = `reward-${tenantId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const reward = {
        id: rewardId,
        tenantId,
        name,
        description,
        pointsCost,
        category,
        validityDays,
        isActive,
        createdAt: new Date(),
      };

      this.rewardCatalog.set(rewardId, reward);

      return createApiResponse(reward, 'Reward added successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to add reward', error.message);
    }
  }

  /**
   * Get reward catalog
   */
  async getRewardCatalog(tenantId, activeOnly = true) {
    try {
      const rewards = [];
      
      for (const [id, reward] of this.rewardCatalog.entries()) {
        // Include global rewards and tenant-specific rewards
        if (!reward.tenantId || reward.tenantId === tenantId) {
          if (!activeOnly || reward.isActive) {
            rewards.push(reward);
          }
        }
      }

      return createApiResponse({
        rewards: rewards.sort((a, b) => a.pointsCost - b.pointsCost),
        total: rewards.length,
      }, 'Reward catalog retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get reward catalog', error.message);
    }
  }

  /**
   * Generate loyalty report
   */
  async generateLoyaltyReport(tenantId, startDate, endDate) {
    try {
      const report = {
        period: { startDate, endDate },
        totalPointsAwarded: 0,
        totalPointsRedeemed: 0,
        totalRedemptions: 0,
        activeCustomers: 0,
        tierDistribution: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
        topRewards: {},
        generatedAt: new Date(),
      };

      const start = new Date(startDate);
      const end = new Date(endDate);

      // Analyze transactions
      for (const [key, transactions] of this.loyaltyTransactions.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          const periodTransactions = transactions.filter(t => {
            const transactionDate = new Date(t.createdAt);
            return transactionDate >= start && transactionDate <= end;
          });

          if (periodTransactions.length > 0) {
            report.activeCustomers++;
          }

          periodTransactions.forEach(transaction => {
            if (transaction.type === 'EARNED') {
              report.totalPointsAwarded += transaction.points;
            } else if (transaction.type === 'REDEEMED') {
              report.totalPointsRedeemed += Math.abs(transaction.points);
            }
          });
        }
      }

      // Analyze redemptions
      for (const [key, redemptions] of this.redemptions.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          const periodRedemptions = redemptions.filter(r => {
            const redemptionDate = new Date(r.redeemedAt);
            return redemptionDate >= start && redemptionDate <= end;
          });

          report.totalRedemptions += periodRedemptions.length;

          periodRedemptions.forEach(redemption => {
            const rewardName = redemption.rewardName;
            report.topRewards[rewardName] = (report.topRewards[rewardName] || 0) + 1;
          });
        }
      }

      // Convert topRewards to sorted array
      report.topRewards = Object.entries(report.topRewards)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      return createApiResponse(report, 'Loyalty report generated successfully');
    } catch (error) {
      throw new DatabaseError('Failed to generate loyalty report', error.message);
    }
  }
}

module.exports = LoyaltyService;
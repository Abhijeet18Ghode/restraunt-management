const LoyaltyService = require('../../src/services/LoyaltyService');
const CustomerService = require('../../src/services/CustomerService');
const { DatabaseManager } = require('@rms/shared');

describe('LoyaltyService', () => {
  let loyaltyService;
  let customerService;
  let mockDbManager;
  let customerId;

  beforeEach(async () => {
    mockDbManager = new DatabaseManager();
    loyaltyService = new LoyaltyService(mockDbManager);
    customerService = new CustomerService(mockDbManager);

    // Create a test customer
    const customerResult = await customerService.createCustomer('tenant-1', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });
    customerId = customerResult.data.id;
  });

  afterEach(() => {
    // Clear in-memory data
    loyaltyService.loyaltyTransactions.clear();
    loyaltyService.redemptions.clear();
    customerService.customerData.clear();
  });

  describe('awardPoints', () => {
    test('should award points successfully', async () => {
      const result = await loyaltyService.awardPoints('tenant-1', customerId, 100, 'Order completion', 'order-123');

      expect(result.success).toBe(true);
      expect(result.data.customerId).toBe(customerId);
      expect(result.data.type).toBe('EARNED');
      expect(result.data.points).toBe(100);
      expect(result.data.reason).toBe('Order completion');
      expect(result.data.orderId).toBe('order-123');
    });

    test('should throw validation error for zero or negative points', async () => {
      await expect(
        loyaltyService.awardPoints('tenant-1', customerId, 0, 'Invalid points')
      ).rejects.toThrow('Points must be greater than 0');

      await expect(
        loyaltyService.awardPoints('tenant-1', customerId, -10, 'Invalid points')
      ).rejects.toThrow('Points must be greater than 0');
    });

    test('should store transaction in history', async () => {
      await loyaltyService.awardPoints('tenant-1', customerId, 50, 'Test award');

      const transactionKey = `tenant-1:${customerId}`;
      const transactions = loyaltyService.loyaltyTransactions.get(transactionKey);

      expect(transactions).toHaveLength(1);
      expect(transactions[0].points).toBe(50);
      expect(transactions[0].type).toBe('EARNED');
    });
  });

  describe('redeemPoints', () => {
    beforeEach(async () => {
      // Give customer some points
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 200 });
    });

    test('should redeem points successfully', async () => {
      const result = await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-appetizer', customerService);

      expect(result.success).toBe(true);
      expect(result.data.redemption.customerId).toBe(customerId);
      expect(result.data.redemption.rewardId).toBe('reward-free-appetizer');
      expect(result.data.redemption.status).toBe('ACTIVE');
      expect(result.data.reward.name).toBe('Free Appetizer');
      expect(result.data.remainingPoints).toBe(100); // 200 - 100
    });

    test('should throw error for non-existent reward', async () => {
      await expect(
        loyaltyService.redeemPoints('tenant-1', customerId, 'non-existent-reward', customerService)
      ).rejects.toThrow('Reward not found');
    });

    test('should throw error for insufficient points', async () => {
      // Update customer to have fewer points
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 50 });

      await expect(
        loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-appetizer', customerService)
      ).rejects.toThrow('Insufficient points');
    });

    test('should create redemption and deduction transaction', async () => {
      await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-appetizer', customerService);

      // Check redemption was created
      const redemptionKey = `tenant-1:${customerId}`;
      const redemptions = loyaltyService.redemptions.get(redemptionKey);
      expect(redemptions).toHaveLength(1);

      // Check deduction transaction was created
      const transactionKey = `tenant-1:${customerId}`;
      const transactions = loyaltyService.loyaltyTransactions.get(transactionKey);
      expect(transactions).toHaveLength(1);
      expect(transactions[0].type).toBe('REDEEMED');
      expect(transactions[0].points).toBe(-100);
    });
  });

  describe('useReward', () => {
    let redemptionId;

    beforeEach(async () => {
      // Give customer points and redeem a reward
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 200 });
      const redeemResult = await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-appetizer', customerService);
      redemptionId = redeemResult.data.redemption.id;
    });

    test('should use reward successfully', async () => {
      const result = await loyaltyService.useReward('tenant-1', customerId, redemptionId);

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('USED');
      expect(result.data.usedAt).toBeInstanceOf(Date);
    });

    test('should throw error for non-existent redemption', async () => {
      await expect(
        loyaltyService.useReward('tenant-1', customerId, 'non-existent-redemption')
      ).rejects.toThrow('Redemption not found');
    });

    test('should throw error for already used reward', async () => {
      await loyaltyService.useReward('tenant-1', customerId, redemptionId);

      await expect(
        loyaltyService.useReward('tenant-1', customerId, redemptionId)
      ).rejects.toThrow('Reward has already been used or expired');
    });

    test('should throw error for expired reward', async () => {
      // Manually expire the reward
      const redemptionKey = `tenant-1:${customerId}`;
      const redemptions = loyaltyService.redemptions.get(redemptionKey);
      redemptions[0].expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      loyaltyService.redemptions.set(redemptionKey, redemptions);

      await expect(
        loyaltyService.useReward('tenant-1', customerId, redemptionId)
      ).rejects.toThrow('Reward has expired');
    });
  });

  describe('getLoyaltySummary', () => {
    beforeEach(async () => {
      // Award some points
      await loyaltyService.awardPoints('tenant-1', customerId, 150, 'Order 1');
      await loyaltyService.awardPoints('tenant-1', customerId, 75, 'Order 2');
      
      // Update customer points
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 225 });
      
      // Redeem some points
      await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-drink', customerService);
    });

    test('should get loyalty summary successfully', async () => {
      const result = await loyaltyService.getLoyaltySummary('tenant-1', customerId, customerService);

      expect(result.success).toBe(true);
      expect(result.data.customerId).toBe(customerId);
      expect(result.data.currentPoints).toBe(175); // 225 - 50
      expect(result.data.pointsEarned).toBe(225); // 150 + 75
      expect(result.data.pointsRedeemed).toBe(50);
      expect(result.data.activeRedemptions).toBe(1);
      expect(result.data.recentTransactions).toBeDefined();
      expect(result.data.availableRewards).toBeDefined();
      expect(result.data.nextTier).toBeDefined();
    });

    test('should include available rewards with affordability', async () => {
      const result = await loyaltyService.getLoyaltySummary('tenant-1', customerId, customerService);

      const availableRewards = result.data.availableRewards;
      expect(availableRewards.length).toBeGreaterThan(0);
      
      const affordableReward = availableRewards.find(r => r.canAfford);
      const unaffordableReward = availableRewards.find(r => !r.canAfford);
      
      if (affordableReward) {
        expect(affordableReward.pointsNeeded).toBe(0);
      }
      
      if (unaffordableReward) {
        expect(unaffordableReward.pointsNeeded).toBeGreaterThan(0);
      }
    });
  });

  describe('getRedemptionHistory', () => {
    beforeEach(async () => {
      // Give customer points and make multiple redemptions
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 500 });
      
      await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-drink', customerService);
      await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-dessert', customerService);
    });

    test('should get redemption history successfully', async () => {
      const result = await loyaltyService.getRedemptionHistory('tenant-1', customerId);

      expect(result.success).toBe(true);
      expect(result.data.redemptions).toHaveLength(2);
      expect(result.data.total).toBe(2);
      
      // Should be sorted by redemption date (newest first)
      const redemptions = result.data.redemptions;
      expect(new Date(redemptions[0].redeemedAt)).toBeGreaterThanOrEqual(
        new Date(redemptions[1].redeemedAt)
      );
    });

    test('should limit redemption history', async () => {
      const result = await loyaltyService.getRedemptionHistory('tenant-1', customerId, 1);

      expect(result.data.redemptions).toHaveLength(1);
    });
  });

  describe('getAvailableRewards', () => {
    test('should get available rewards with affordability info', () => {
      const rewards = loyaltyService.getAvailableRewards(100);

      expect(rewards.length).toBeGreaterThan(0);
      
      const affordableReward = rewards.find(r => r.canAfford);
      const unaffordableReward = rewards.find(r => !r.canAfford);
      
      if (affordableReward) {
        expect(affordableReward.pointsCost).toBeLessThanOrEqual(100);
        expect(affordableReward.pointsNeeded).toBe(0);
      }
      
      if (unaffordableReward) {
        expect(unaffordableReward.pointsCost).toBeGreaterThan(100);
        expect(unaffordableReward.pointsNeeded).toBeGreaterThan(0);
      }
    });

    test('should sort rewards by points cost', () => {
      const rewards = loyaltyService.getAvailableRewards(1000);

      for (let i = 1; i < rewards.length; i++) {
        expect(rewards[i].pointsCost).toBeGreaterThanOrEqual(rewards[i - 1].pointsCost);
      }
    });
  });

  describe('getNextTierInfo', () => {
    test('should get next tier info for bronze customer', () => {
      const nextTier = loyaltyService.getNextTierInfo(50);

      expect(nextTier.tier).toBe('SILVER');
      expect(nextTier.isMaxTier).toBe(false);
      expect(nextTier.pointsToNext).toBe(50); // 100 - 50
      expect(nextTier.progress).toBeGreaterThan(0);
    });

    test('should get next tier info for silver customer', () => {
      const nextTier = loyaltyService.getNextTierInfo(300);

      expect(nextTier.tier).toBe('GOLD');
      expect(nextTier.isMaxTier).toBe(false);
      expect(nextTier.pointsToNext).toBe(200); // 500 - 300
    });

    test('should handle platinum customer (max tier)', () => {
      const nextTier = loyaltyService.getNextTierInfo(1500);

      expect(nextTier.tier).toBe('PLATINUM');
      expect(nextTier.isMaxTier).toBe(true);
      expect(nextTier.pointsToNext).toBe(0);
      expect(nextTier.progress).toBe(100);
    });
  });

  describe('addReward', () => {
    test('should add custom reward successfully', async () => {
      const rewardData = {
        name: 'Custom Reward',
        description: 'A custom reward for testing',
        pointsCost: 150,
        category: 'CUSTOM',
        validityDays: 14,
      };

      const result = await loyaltyService.addReward('tenant-1', rewardData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe(rewardData.name);
      expect(result.data.pointsCost).toBe(rewardData.pointsCost);
      expect(result.data.tenantId).toBe('tenant-1');
    });

    test('should throw validation error for missing required fields', async () => {
      const invalidData = { name: 'Test Reward' };

      await expect(
        loyaltyService.addReward('tenant-1', invalidData)
      ).rejects.toThrow('Name, description, and points cost are required');
    });

    test('should throw validation error for invalid points cost', async () => {
      const invalidData = {
        name: 'Test Reward',
        description: 'Test description',
        pointsCost: 0,
      };

      await expect(
        loyaltyService.addReward('tenant-1', invalidData)
      ).rejects.toThrow('Points cost must be greater than 0');
    });
  });

  describe('getRewardCatalog', () => {
    beforeEach(async () => {
      // Add a custom reward
      await loyaltyService.addReward('tenant-1', {
        name: 'Custom Reward',
        description: 'A custom reward',
        pointsCost: 150,
      });
    });

    test('should get reward catalog successfully', async () => {
      const result = await loyaltyService.getRewardCatalog('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.rewards.length).toBeGreaterThan(5); // Default + custom
      expect(result.data.total).toBeGreaterThan(5);
    });

    test('should include tenant-specific rewards', async () => {
      const result = await loyaltyService.getRewardCatalog('tenant-1');

      const customReward = result.data.rewards.find(r => r.name === 'Custom Reward');
      expect(customReward).toBeDefined();
      expect(customReward.tenantId).toBe('tenant-1');
    });

    test('should filter inactive rewards when activeOnly is true', async () => {
      // Add an inactive reward
      await loyaltyService.addReward('tenant-1', {
        name: 'Inactive Reward',
        description: 'An inactive reward',
        pointsCost: 100,
        isActive: false,
      });

      const result = await loyaltyService.getRewardCatalog('tenant-1', true);

      const inactiveReward = result.data.rewards.find(r => r.name === 'Inactive Reward');
      expect(inactiveReward).toBeUndefined();
    });

    test('should include inactive rewards when activeOnly is false', async () => {
      // Add an inactive reward
      await loyaltyService.addReward('tenant-1', {
        name: 'Inactive Reward',
        description: 'An inactive reward',
        pointsCost: 100,
        isActive: false,
      });

      const result = await loyaltyService.getRewardCatalog('tenant-1', false);

      const inactiveReward = result.data.rewards.find(r => r.name === 'Inactive Reward');
      expect(inactiveReward).toBeDefined();
    });
  });

  describe('generateLoyaltyReport', () => {
    beforeEach(async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 5);

      // Award points and redeem rewards within the date range
      await loyaltyService.awardPoints('tenant-1', customerId, 100, 'Order 1');
      await loyaltyService.awardPoints('tenant-1', customerId, 150, 'Order 2');
      
      await customerService.updateCustomer('tenant-1', customerId, { loyaltyPoints: 250 });
      await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-appetizer', customerService);
    });

    test('should generate loyalty report successfully', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await loyaltyService.generateLoyaltyReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.success).toBe(true);
      expect(result.data.totalPointsAwarded).toBe(250);
      expect(result.data.totalPointsRedeemed).toBe(100);
      expect(result.data.totalRedemptions).toBe(1);
      expect(result.data.activeCustomers).toBe(1);
      expect(result.data.topRewards).toBeDefined();
    });

    test('should include top rewards in report', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await loyaltyService.generateLoyaltyReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.data.topRewards).toHaveLength(1);
      expect(result.data.topRewards[0].name).toBe('Free Appetizer');
      expect(result.data.topRewards[0].count).toBe(1);
    });
  });
});
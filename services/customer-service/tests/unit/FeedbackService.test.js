const FeedbackService = require('../../src/services/FeedbackService');
const { DatabaseManager } = require('@rms/shared');

describe('FeedbackService', () => {
  let feedbackService;
  let mockDbManager;

  beforeEach(() => {
    mockDbManager = new DatabaseManager();
    feedbackService = new FeedbackService(mockDbManager);
  });

  afterEach(() => {
    // Clear in-memory data
    feedbackService.feedbackData.clear();
    feedbackService.feedbackSummary.clear();
  });

  describe('submitFeedback', () => {
    const validFeedbackData = {
      customerId: 'customer-123',
      orderId: 'order-456',
      rating: 4,
      comment: 'Great food and service!',
      category: 'FOOD',
      tags: ['delicious', 'fast'],
    };

    test('should submit feedback successfully', async () => {
      const result = await feedbackService.submitFeedback('tenant-1', validFeedbackData);

      expect(result.success).toBe(true);
      expect(result.data.customerId).toBe(validFeedbackData.customerId);
      expect(result.data.orderId).toBe(validFeedbackData.orderId);
      expect(result.data.rating).toBe(validFeedbackData.rating);
      expect(result.data.comment).toBe(validFeedbackData.comment);
      expect(result.data.category).toBe(validFeedbackData.category);
      expect(result.data.status).toBe('PENDING');
      expect(result.data.isPublic).toBe(false);
    });

    test('should submit anonymous feedback', async () => {
      const anonymousFeedback = {
        ...validFeedbackData,
        isAnonymous: true,
      };

      const result = await feedbackService.submitFeedback('tenant-1', anonymousFeedback);

      expect(result.success).toBe(true);
      expect(result.data.customerId).toBeNull();
      expect(result.data.isAnonymous).toBe(true);
    });

    test('should throw validation error for missing rating', async () => {
      const invalidData = { comment: 'Great service!' };

      await expect(
        feedbackService.submitFeedback('tenant-1', invalidData)
      ).rejects.toThrow('Rating is required');
    });

    test('should throw validation error for invalid rating', async () => {
      const invalidData = { rating: 6, comment: 'Great service!' };

      await expect(
        feedbackService.submitFeedback('tenant-1', invalidData)
      ).rejects.toThrow('Rating must be between 1 and 5');

      const invalidData2 = { rating: 0, comment: 'Poor service!' };

      await expect(
        feedbackService.submitFeedback('tenant-1', invalidData2)
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    test('should set default values for optional fields', async () => {
      const minimalFeedback = { rating: 3 };

      const result = await feedbackService.submitFeedback('tenant-1', minimalFeedback);

      expect(result.success).toBe(true);
      expect(result.data.comment).toBe('');
      expect(result.data.category).toBe('GENERAL');
      expect(result.data.isAnonymous).toBe(false);
      expect(result.data.tags).toEqual([]);
    });
  });

  describe('getAllFeedback', () => {
    beforeEach(async () => {
      // Create multiple feedback entries
      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 5,
        comment: 'Excellent!',
        category: 'FOOD',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-2',
        rating: 3,
        comment: 'Average service',
        category: 'SERVICE',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-3',
        rating: 1,
        comment: 'Poor experience',
        category: 'FOOD',
      });
    });

    test('should get all feedback', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(3);
      expect(result.data.total).toBe(3);
      expect(result.data.page).toBe(1);
    });

    test('should filter feedback by rating', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1', { rating: 5 });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(1);
      expect(result.data.feedback[0].rating).toBe(5);
    });

    test('should filter feedback by category', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1', { category: 'FOOD' });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      expect(result.data.feedback.every(f => f.category === 'FOOD')).toBe(true);
    });

    test('should filter feedback by minimum rating', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1', { minRating: 3 });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      expect(result.data.feedback.every(f => f.rating >= 3)).toBe(true);
    });

    test('should paginate results', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1', { page: 1, limit: 2 });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      expect(result.data.totalPages).toBe(2);
    });

    test('should sort feedback by creation date (newest first)', async () => {
      const result = await feedbackService.getAllFeedback('tenant-1');

      const feedback = result.data.feedback;
      for (let i = 1; i < feedback.length; i++) {
        expect(new Date(feedback[i - 1].createdAt)).toBeGreaterThanOrEqual(
          new Date(feedback[i].createdAt)
        );
      }
    });
  });

  describe('respondToFeedback', () => {
    let feedbackId;

    beforeEach(async () => {
      const result = await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 4,
        comment: 'Good food!',
      });
      feedbackId = result.data.id;
    });

    test('should respond to feedback successfully', async () => {
      const response = 'Thank you for your feedback! We appreciate your business.';
      const result = await feedbackService.respondToFeedback('tenant-1', feedbackId, response, 'manager-1');

      expect(result.success).toBe(true);
      expect(result.data.response).toBe(response);
      expect(result.data.respondedBy).toBe('manager-1');
      expect(result.data.respondedAt).toBeInstanceOf(Date);
      expect(result.data.status).toBe('RESPONDED');
    });

    test('should throw error for non-existent feedback', async () => {
      await expect(
        feedbackService.respondToFeedback('tenant-1', 'non-existent-id', 'Response', 'manager-1')
      ).rejects.toThrow('Feedback not found');
    });

    test('should throw validation error for empty response', async () => {
      await expect(
        feedbackService.respondToFeedback('tenant-1', feedbackId, '', 'manager-1')
      ).rejects.toThrow('Response cannot be empty');

      await expect(
        feedbackService.respondToFeedback('tenant-1', feedbackId, '   ', 'manager-1')
      ).rejects.toThrow('Response cannot be empty');
    });
  });

  describe('updateFeedbackStatus', () => {
    let feedbackId;

    beforeEach(async () => {
      const result = await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 4,
        comment: 'Good food!',
      });
      feedbackId = result.data.id;
    });

    test('should update feedback status successfully', async () => {
      const result = await feedbackService.updateFeedbackStatus('tenant-1', feedbackId, 'REVIEWED', 'manager-1');

      expect(result.success).toBe(true);
      expect(result.data.status).toBe('REVIEWED');
      expect(result.data.updatedBy).toBe('manager-1');
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    });

    test('should throw error for invalid status', async () => {
      await expect(
        feedbackService.updateFeedbackStatus('tenant-1', feedbackId, 'INVALID_STATUS', 'manager-1')
      ).rejects.toThrow('Invalid status');
    });

    test('should throw error for non-existent feedback', async () => {
      await expect(
        feedbackService.updateFeedbackStatus('tenant-1', 'non-existent-id', 'REVIEWED', 'manager-1')
      ).rejects.toThrow('Feedback not found');
    });
  });

  describe('toggleFeedbackVisibility', () => {
    let feedbackId;

    beforeEach(async () => {
      const result = await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 5,
        comment: 'Excellent service!',
      });
      feedbackId = result.data.id;
    });

    test('should make feedback public', async () => {
      const result = await feedbackService.toggleFeedbackVisibility('tenant-1', feedbackId, true);

      expect(result.success).toBe(true);
      expect(result.data.isPublic).toBe(true);
      expect(result.message).toContain('public');
    });

    test('should make feedback private', async () => {
      // First make it public
      await feedbackService.toggleFeedbackVisibility('tenant-1', feedbackId, true);
      
      // Then make it private
      const result = await feedbackService.toggleFeedbackVisibility('tenant-1', feedbackId, false);

      expect(result.success).toBe(true);
      expect(result.data.isPublic).toBe(false);
      expect(result.message).toContain('private');
    });
  });

  describe('getPublicFeedback', () => {
    beforeEach(async () => {
      // Create feedback and make some public
      const feedback1 = await feedbackService.submitFeedback('tenant-1', {
        rating: 5,
        comment: 'Great food!',
        category: 'FOOD',
      });

      const feedback2 = await feedbackService.submitFeedback('tenant-1', {
        rating: 4,
        comment: 'Good service!',
        category: 'SERVICE',
      });

      const feedback3 = await feedbackService.submitFeedback('tenant-1', {
        rating: 2,
        comment: 'Poor experience',
        category: 'SERVICE',
      });

      // Make first two public
      await feedbackService.toggleFeedbackVisibility('tenant-1', feedback1.data.id, true);
      await feedbackService.toggleFeedbackVisibility('tenant-1', feedback2.data.id, true);
    });

    test('should get only public feedback', async () => {
      const result = await feedbackService.getPublicFeedback('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      
      // Should not include sensitive information
      const feedback = result.data.feedback[0];
      expect(feedback.customerId).toBeUndefined();
      expect(feedback.status).toBeUndefined();
      expect(feedback.rating).toBeDefined();
      expect(feedback.comment).toBeDefined();
    });

    test('should filter public feedback by category', async () => {
      const result = await feedbackService.getPublicFeedback('tenant-1', { category: 'FOOD' });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(1);
      expect(result.data.feedback[0].category).toBe('FOOD');
    });

    test('should filter public feedback by minimum rating', async () => {
      const result = await feedbackService.getPublicFeedback('tenant-1', { minRating: 4 });

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      expect(result.data.feedback.every(f => f.rating >= 4)).toBe(true);
    });
  });

  describe('getFeedbackSummary', () => {
    beforeEach(async () => {
      // Create various feedback entries
      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 5,
        category: 'FOOD',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-2',
        rating: 4,
        category: 'SERVICE',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-3',
        rating: 3,
        category: 'FOOD',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-4',
        rating: 2,
        category: 'AMBIANCE',
      });
    });

    test('should get feedback summary successfully', async () => {
      const result = await feedbackService.getFeedbackSummary('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data.totalFeedback).toBe(4);
      expect(result.data.averageRating).toBe(3.5); // (5+4+3+2)/4
      expect(result.data.ratingDistribution[5]).toBe(1);
      expect(result.data.ratingDistribution[4]).toBe(1);
      expect(result.data.ratingDistribution[3]).toBe(1);
      expect(result.data.ratingDistribution[2]).toBe(1);
      expect(result.data.categoryBreakdown.FOOD).toBe(2);
      expect(result.data.categoryBreakdown.SERVICE).toBe(1);
      expect(result.data.categoryBreakdown.AMBIANCE).toBe(1);
    });

    test('should calculate response rate correctly', async () => {
      // Respond to some feedback
      const allFeedback = await feedbackService.getAllFeedback('tenant-1');
      const feedbackIds = allFeedback.data.feedback.map(f => f.id);
      
      await feedbackService.respondToFeedback('tenant-1', feedbackIds[0], 'Thank you!', 'manager-1');
      await feedbackService.respondToFeedback('tenant-1', feedbackIds[1], 'We appreciate your feedback!', 'manager-1');

      const result = await feedbackService.getFeedbackSummary('tenant-1');

      expect(result.data.responseRate).toBe(50); // 2 out of 4 responded
    });
  });

  describe('getCustomerFeedback', () => {
    beforeEach(async () => {
      // Create feedback for different customers
      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 5,
        comment: 'Great!',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 4,
        comment: 'Good!',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-2',
        rating: 3,
        comment: 'Average',
      });
    });

    test('should get feedback for specific customer', async () => {
      const result = await feedbackService.getCustomerFeedback('tenant-1', 'customer-1');

      expect(result.success).toBe(true);
      expect(result.data.feedback).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.feedback.every(f => f.customerId === 'customer-1')).toBe(true);
    });

    test('should sort customer feedback by date (newest first)', async () => {
      const result = await feedbackService.getCustomerFeedback('tenant-1', 'customer-1');

      const feedback = result.data.feedback;
      for (let i = 1; i < feedback.length; i++) {
        expect(new Date(feedback[i - 1].createdAt)).toBeGreaterThanOrEqual(
          new Date(feedback[i].createdAt)
        );
      }
    });
  });

  describe('voteFeedbackHelpful', () => {
    let feedbackId;

    beforeEach(async () => {
      const result = await feedbackService.submitFeedback('tenant-1', {
        rating: 5,
        comment: 'Excellent service!',
      });
      feedbackId = result.data.id;
    });

    test('should vote feedback as helpful', async () => {
      const result = await feedbackService.voteFeedbackHelpful('tenant-1', feedbackId);

      expect(result.success).toBe(true);
      expect(result.data.helpfulVotes).toBe(1);
    });

    test('should increment helpful votes', async () => {
      await feedbackService.voteFeedbackHelpful('tenant-1', feedbackId);
      const result = await feedbackService.voteFeedbackHelpful('tenant-1', feedbackId);

      expect(result.data.helpfulVotes).toBe(2);
    });

    test('should throw error for non-existent feedback', async () => {
      await expect(
        feedbackService.voteFeedbackHelpful('tenant-1', 'non-existent-id')
      ).rejects.toThrow('Feedback not found');
    });
  });

  describe('generateFeedbackReport', () => {
    beforeEach(async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create feedback entries
      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-1',
        rating: 5,
        category: 'FOOD',
        comment: 'Excellent food!',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-2',
        rating: 3,
        category: 'SERVICE',
        comment: 'Average service',
      });

      await feedbackService.submitFeedback('tenant-1', {
        customerId: 'customer-3',
        rating: 1,
        category: 'FOOD',
        comment: 'Poor quality',
      });

      // Respond to one feedback
      const allFeedback = await feedbackService.getAllFeedback('tenant-1');
      await feedbackService.respondToFeedback('tenant-1', allFeedback.data.feedback[0].id, 'Thank you!', 'manager-1');
    });

    test('should generate feedback report successfully', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await feedbackService.generateFeedbackReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.success).toBe(true);
      expect(result.data.totalFeedback).toBe(3);
      expect(result.data.averageRating).toBe(3); // (5+3+1)/3
      expect(result.data.ratingDistribution[5]).toBe(1);
      expect(result.data.ratingDistribution[3]).toBe(1);
      expect(result.data.ratingDistribution[1]).toBe(1);
      expect(result.data.categoryAnalysis.FOOD.count).toBe(2);
      expect(result.data.categoryAnalysis.SERVICE.count).toBe(1);
      expect(result.data.responseMetrics.responseRate).toBe(33); // 1 out of 3
      expect(result.data.sentimentAnalysis.positive).toBe(1); // 5 star
      expect(result.data.sentimentAnalysis.neutral).toBe(1); // 3 star
      expect(result.data.sentimentAnalysis.negative).toBe(1); // 1 star
    });

    test('should calculate category averages correctly', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date();

      const result = await feedbackService.generateFeedbackReport(
        'tenant-1',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      expect(result.data.categoryAnalysis.FOOD.averageRating).toBe(3); // (5+1)/2
      expect(result.data.categoryAnalysis.SERVICE.averageRating).toBe(3); // 3/1
    });
  });

  describe('calculateFeedbackTrend', () => {
    test('should return stable for insufficient data', () => {
      const trend = feedbackService.calculateFeedbackTrend('tenant-1');
      expect(trend).toBe('stable');
    });

    test('should calculate improving trend', async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
      const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);

      // Create older feedback with lower ratings
      const oldFeedback = {
        id: 'old-feedback',
        tenantId: 'tenant-1',
        rating: 2,
        createdAt: fiftyDaysAgo,
      };

      // Create recent feedback with higher ratings
      const recentFeedback = {
        id: 'recent-feedback',
        tenantId: 'tenant-1',
        rating: 5,
        createdAt: twentyDaysAgo,
      };

      feedbackService.feedbackData.set('tenant-1:old-feedback', oldFeedback);
      feedbackService.feedbackData.set('tenant-1:recent-feedback', recentFeedback);

      const trend = feedbackService.calculateFeedbackTrend('tenant-1');
      expect(trend).toBe('improving');
    });
  });
});
const PerformanceService = require('../../src/services/PerformanceService');
const { DatabaseManager } = require('@rms/shared');

describe('PerformanceService', () => {
  let performanceService;
  let mockDbManager;

  beforeEach(() => {
    mockDbManager = new DatabaseManager();
    performanceService = new PerformanceService(mockDbManager);
  });

  afterEach(() => {
    // Clear in-memory data
    performanceService.performanceData.clear();
  });

  describe('recordPerformanceMetrics', () => {
    const validMetricsData = {
      staffId: 'staff-1',
      date: '2024-01-15',
      ordersProcessed: 50,
      hoursWorked: 8,
      customerRating: 4.5,
      customerFeedbackCount: 10,
      tasksCompleted: 15,
      tasksAssigned: 16,
      salesAmount: 1500.50,
      errors: 2,
      notes: 'Good performance today',
      recordedBy: 'manager-1',
    };

    test('should record performance metrics successfully', async () => {
      const result = await performanceService.recordPerformanceMetrics(
        'tenant-1',
        'staff-1',
        validMetricsData
      );

      expect(result.success).toBe(true);
      expect(result.data.tenantId).toBe('tenant-1');
      expect(result.data.staffId).toBe('staff-1');
      expect(result.data.ordersProcessed).toBe(50);
      expect(result.data.hoursWorked).toBe(8);
      expect(result.data.ordersPerHour).toBe(6.25); // 50/8
      expect(result.data.taskCompletionRate).toBe(94); // 15/16 * 100
      expect(result.data.errorRate).toBe(4); // 2/50 * 100
      expect(result.data.recordedBy).toBe('manager-1');
    });

    test('should calculate derived metrics correctly', async () => {
      const metricsData = {
        staffId: 'staff-1',
        ordersProcessed: 40,
        hoursWorked: 5,
        tasksCompleted: 8,
        tasksAssigned: 10,
        errors: 1,
        recordedBy: 'manager-1',
      };

      const result = await performanceService.recordPerformanceMetrics(
        'tenant-1',
        'staff-1',
        metricsData
      );

      expect(result.data.ordersPerHour).toBe(8); // 40/5
      expect(result.data.taskCompletionRate).toBe(80); // 8/10 * 100
      expect(result.data.errorRate).toBe(3); // 1/40 * 100 (rounded)
    });

    test('should handle zero hours worked', async () => {
      const metricsData = {
        staffId: 'staff-1',
        ordersProcessed: 10,
        hoursWorked: 0,
        recordedBy: 'manager-1',
      };

      const result = await performanceService.recordPerformanceMetrics(
        'tenant-1',
        'staff-1',
        metricsData
      );

      expect(result.data.ordersPerHour).toBe(0);
    });

    test('should handle zero tasks assigned', async () => {
      const metricsData = {
        staffId: 'staff-1',
        tasksCompleted: 5,
        tasksAssigned: 0,
        recordedBy: 'manager-1',
      };

      const result = await performanceService.recordPerformanceMetrics(
        'tenant-1',
        'staff-1',
        metricsData
      );

      expect(result.data.taskCompletionRate).toBe(0);
    });

    test('should use current date if not provided', async () => {
      const metricsData = {
        staffId: 'staff-1',
        ordersProcessed: 20,
        recordedBy: 'manager-1',
      };

      const result = await performanceService.recordPerformanceMetrics(
        'tenant-1',
        'staff-1',
        metricsData
      );

      const today = new Date().toISOString().split('T')[0];
      expect(result.data.date).toBe(today);
    });
  });

  describe('getPerformanceMetrics', () => {
    beforeEach(async () => {
      // Create sample metrics data
      await performanceService.recordPerformanceMetrics('tenant-1', 'staff-1', {
        date: '2024-01-15',
        ordersProcessed: 50,
        hoursWorked: 8,
        customerRating: 4.5,
        recordedBy: 'manager-1',
      });

      await performanceService.recordPerformanceMetrics('tenant-1', 'staff-1', {
        date: '2024-01-16',
        ordersProcessed: 45,
        hoursWorked: 8,
        customerRating: 4.2,
        recordedBy: 'manager-1',
      });

      await performanceService.recordPerformanceMetrics('tenant-1', 'staff-1', {
        date: '2024-01-17',
        ordersProcessed: 55,
        hoursWorked: 8,
        customerRating: 4.8,
        recordedBy: 'manager-1',
      });
    });

    test('should get performance metrics for date range', async () => {
      const result = await performanceService.getPerformanceMetrics(
        'tenant-1',
        'staff-1',
        '2024-01-15',
        '2024-01-17'
      );

      expect(result.success).toBe(true);
      expect(result.data.metrics).toHaveLength(3);
      expect(result.data.summary).toBeDefined();
      expect(result.data.period.startDate).toBe('2024-01-15');
      expect(result.data.period.endDate).toBe('2024-01-17');
    });

    test('should calculate performance summary correctly', async () => {
      const result = await performanceService.getPerformanceMetrics(
        'tenant-1',
        'staff-1',
        '2024-01-15',
        '2024-01-17'
      );

      const summary = result.data.summary;
      expect(summary.totalDays).toBe(3);
      expect(summary.averageOrdersPerHour).toBeCloseTo(6.25); // (6.25 + 5.625 + 6.875) / 3
      expect(summary.averageCustomerRating).toBeCloseTo(4.5); // (4.5 + 4.2 + 4.8) / 3
      expect(summary.performanceScore).toBeGreaterThan(0);
    });

    test('should filter metrics by date range', async () => {
      const result = await performanceService.getPerformanceMetrics(
        'tenant-1',
        'staff-1',
        '2024-01-16',
        '2024-01-16'
      );

      expect(result.success).toBe(true);
      expect(result.data.metrics).toHaveLength(1);
      expect(result.data.metrics[0].date).toBe('2024-01-16');
    });

    test('should sort metrics by date (newest first)', async () => {
      const result = await performanceService.getPerformanceMetrics(
        'tenant-1',
        'staff-1',
        '2024-01-15',
        '2024-01-17'
      );

      const metrics = result.data.metrics;
      expect(new Date(metrics[0].date)).toBeGreaterThanOrEqual(new Date(metrics[1].date));
      expect(new Date(metrics[1].date)).toBeGreaterThanOrEqual(new Date(metrics[2].date));
    });
  });

  describe('createPerformanceReview', () => {
    const validReviewData = {
      staffId: 'staff-1',
      reviewerId: 'manager-1',
      reviewPeriodStart: '2024-01-01',
      reviewPeriodEnd: '2024-01-31',
      overallRating: 4.2,
      strengths: ['Good customer service', 'Reliable attendance'],
      areasForImprovement: ['Speed of service', 'Product knowledge'],
      goals: ['Increase orders per hour to 8', 'Complete product training'],
      comments: 'Overall good performance with room for improvement',
      reviewType: 'REGULAR',
    };

    beforeEach(async () => {
      // Create some performance metrics for the review period
      await performanceService.recordPerformanceMetrics('tenant-1', 'staff-1', {
        date: '2024-01-15',
        ordersProcessed: 50,
        hoursWorked: 8,
        customerRating: 4.5,
        recordedBy: 'manager-1',
      });
    });

    test('should create performance review successfully', async () => {
      const result = await performanceService.createPerformanceReview('tenant-1', validReviewData);

      expect(result.success).toBe(true);
      expect(result.data.tenantId).toBe('tenant-1');
      expect(result.data.staffId).toBe('staff-1');
      expect(result.data.reviewerId).toBe('manager-1');
      expect(result.data.overallRating).toBe(4.2);
      expect(result.data.strengths).toEqual(['Good customer service', 'Reliable attendance']);
      expect(result.data.areasForImprovement).toEqual(['Speed of service', 'Product knowledge']);
      expect(result.data.goals).toEqual(['Increase orders per hour to 8', 'Complete product training']);
      expect(result.data.status).toBe('DRAFT');
      expect(result.data.performanceSummary).toBeDefined();
    });

    test('should throw validation error for missing required fields', async () => {
      const invalidData = {
        staffId: 'staff-1',
        // Missing reviewerId, reviewPeriodStart, reviewPeriodEnd, overallRating
      };

      await expect(
        performanceService.createPerformanceReview('tenant-1', invalidData)
      ).rejects.toThrow('Staff ID, reviewer ID, review period, and overall rating are required');
    });

    test('should throw validation error for invalid rating', async () => {
      const invalidData = {
        ...validReviewData,
        overallRating: 6, // Invalid rating > 5
      };

      await expect(
        performanceService.createPerformanceReview('tenant-1', invalidData)
      ).rejects.toThrow('Overall rating must be between 1 and 5');
    });

    test('should include performance summary in review', async () => {
      const result = await performanceService.createPerformanceReview('tenant-1', validReviewData);

      expect(result.data.performanceSummary).toBeDefined();
      expect(result.data.performanceSummary.totalDays).toBeGreaterThan(0);
    });
  });

  describe('updatePerformanceReview', () => {
    let reviewId;

    beforeEach(async () => {
      const reviewData = {
        staffId: 'staff-1',
        reviewerId: 'manager-1',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-01-31',
        overallRating: 4.0,
        strengths: ['Punctual'],
        status: 'DRAFT',
      };

      const result = await performanceService.createPerformanceReview('tenant-1', reviewData);
      reviewId = result.data.id;
    });

    test('should update performance review successfully', async () => {
      const updateData = {
        overallRating: 4.5,
        strengths: ['Punctual', 'Good teamwork'],
        areasForImprovement: ['Communication skills'],
        status: 'SUBMITTED',
      };

      const result = await performanceService.updatePerformanceReview('tenant-1', reviewId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.overallRating).toBe(4.5);
      expect(result.data.strengths).toEqual(['Punctual', 'Good teamwork']);
      expect(result.data.areasForImprovement).toEqual(['Communication skills']);
      expect(result.data.status).toBe('SUBMITTED');
      expect(result.data.updatedAt).toBeDefined();
    });

    test('should throw error for non-existent review', async () => {
      await expect(
        performanceService.updatePerformanceReview('tenant-1', 'non-existent-id', { overallRating: 4.5 })
      ).rejects.toThrow('Performance review not found');
    });
  });

  describe('getPerformanceReviews', () => {
    beforeEach(async () => {
      // Create multiple reviews
      await performanceService.createPerformanceReview('tenant-1', {
        staffId: 'staff-1',
        reviewerId: 'manager-1',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-01-31',
        overallRating: 4.0,
      });

      await performanceService.createPerformanceReview('tenant-1', {
        staffId: 'staff-1',
        reviewerId: 'manager-1',
        reviewPeriodStart: '2024-02-01',
        reviewPeriodEnd: '2024-02-28',
        overallRating: 4.2,
      });

      await performanceService.createPerformanceReview('tenant-1', {
        staffId: 'staff-2',
        reviewerId: 'manager-1',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-01-31',
        overallRating: 3.8,
      });
    });

    test('should get performance reviews for staff member', async () => {
      const result = await performanceService.getPerformanceReviews('tenant-1', 'staff-1');

      expect(result.success).toBe(true);
      expect(result.data.reviews).toHaveLength(2);
      expect(result.data.total).toBe(2);
      expect(result.data.reviews.every(r => r.staffId === 'staff-1')).toBe(true);
    });

    test('should sort reviews by review period end date (newest first)', async () => {
      const result = await performanceService.getPerformanceReviews('tenant-1', 'staff-1');

      const reviews = result.data.reviews;
      expect(new Date(reviews[0].reviewPeriodEnd)).toBeGreaterThanOrEqual(
        new Date(reviews[1].reviewPeriodEnd)
      );
    });

    test('should return empty array for staff with no reviews', async () => {
      const result = await performanceService.getPerformanceReviews('tenant-1', 'staff-3');

      expect(result.success).toBe(true);
      expect(result.data.reviews).toHaveLength(0);
      expect(result.data.total).toBe(0);
    });
  });

  describe('generatePerformanceDashboard', () => {
    beforeEach(async () => {
      // Create performance metrics for different periods
      const dates = ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'];
      
      for (const date of dates) {
        await performanceService.recordPerformanceMetrics('tenant-1', 'staff-1', {
          date,
          ordersProcessed: 50 + Math.floor(Math.random() * 10),
          hoursWorked: 8,
          customerRating: 4.0 + Math.random(),
          tasksCompleted: 15,
          tasksAssigned: 16,
          recordedBy: 'manager-1',
        });
      }

      // Create a performance review
      await performanceService.createPerformanceReview('tenant-1', {
        staffId: 'staff-1',
        reviewerId: 'manager-1',
        reviewPeriodStart: '2024-01-01',
        reviewPeriodEnd: '2024-01-31',
        overallRating: 4.2,
        strengths: ['Good performance'],
      });
    });

    test('should generate performance dashboard successfully', async () => {
      const result = await performanceService.generatePerformanceDashboard('tenant-1', 'staff-1', '30d');

      expect(result.success).toBe(true);
      expect(result.data.staffId).toBe('staff-1');
      expect(result.data.period).toBe('30d');
      expect(result.data.summary).toBeDefined();
      expect(result.data.trends).toBeDefined();
      expect(result.data.recentReviews).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.lastUpdated).toBeInstanceOf(Date);
    });

    test('should include performance trends', async () => {
      const result = await performanceService.generatePerformanceDashboard('tenant-1', 'staff-1', '30d');

      const trends = result.data.trends;
      expect(trends.ordersPerHourTrend).toMatch(/improving|declining|stable/);
      expect(trends.customerRatingTrend).toMatch(/improving|declining|stable/);
      expect(trends.taskCompletionTrend).toMatch(/improving|declining|stable/);
      expect(trends.errorRateTrend).toMatch(/improving|declining|stable/);
    });

    test('should include recent reviews', async () => {
      const result = await performanceService.generatePerformanceDashboard('tenant-1', 'staff-1', '30d');

      expect(result.data.recentReviews).toHaveLength(1);
      expect(result.data.recentReviews[0].staffId).toBe('staff-1');
    });

    test('should generate recommendations', async () => {
      const result = await performanceService.generatePerformanceDashboard('tenant-1', 'staff-1', '30d');

      expect(Array.isArray(result.data.recommendations)).toBe(true);
      // Recommendations depend on performance data, so we just check structure
      if (result.data.recommendations.length > 0) {
        const recommendation = result.data.recommendations[0];
        expect(recommendation.category).toBeDefined();
        expect(recommendation.priority).toBeDefined();
        expect(recommendation.message).toBeDefined();
      }
    });

    test('should handle different time periods', async () => {
      const periods = ['7d', '30d', '90d', '1y'];

      for (const period of periods) {
        const result = await performanceService.generatePerformanceDashboard('tenant-1', 'staff-1', period);
        expect(result.success).toBe(true);
        expect(result.data.period).toBe(period);
      }
    });
  });

  describe('calculatePerformanceSummary', () => {
    test('should return zero values for empty metrics', () => {
      const summary = performanceService.calculatePerformanceSummary([]);

      expect(summary.totalDays).toBe(0);
      expect(summary.averageOrdersPerHour).toBe(0);
      expect(summary.averageCustomerRating).toBe(0);
      expect(summary.averageTaskCompletionRate).toBe(0);
      expect(summary.totalSalesAmount).toBe(0);
      expect(summary.averageErrorRate).toBe(0);
      expect(summary.performanceScore).toBe(0);
    });

    test('should calculate summary correctly', () => {
      const metrics = [
        {
          ordersPerHour: 6,
          customerRating: 4.5,
          taskCompletionRate: 90,
          salesAmount: 1000,
          errorRate: 2,
        },
        {
          ordersPerHour: 8,
          customerRating: 4.2,
          taskCompletionRate: 95,
          salesAmount: 1200,
          errorRate: 1,
        },
      ];

      const summary = performanceService.calculatePerformanceSummary(metrics);

      expect(summary.totalDays).toBe(2);
      expect(summary.averageOrdersPerHour).toBe(7); // (6 + 8) / 2
      expect(summary.averageCustomerRating).toBe(4.35); // (4.5 + 4.2) / 2
      expect(summary.averageTaskCompletionRate).toBe(92.5); // (90 + 95) / 2
      expect(summary.totalSalesAmount).toBe(2200); // 1000 + 1200
      expect(summary.averageErrorRate).toBe(1.5); // (2 + 1) / 2
      expect(summary.performanceScore).toBeGreaterThan(0);
      expect(summary.targets).toBeDefined();
    });

    test('should calculate performance score correctly', () => {
      const metrics = [
        {
          ordersPerHour: 10, // Meets target
          customerRating: 5, // Perfect rating
          taskCompletionRate: 100, // Perfect completion
          errorRate: 0, // No errors
        },
      ];

      const summary = performanceService.calculatePerformanceSummary(metrics);

      expect(summary.performanceScore).toBe(100); // Perfect score
    });
  });

  describe('calculatePerformanceTrends', () => {
    test('should return stable trends for insufficient data', () => {
      const trends = performanceService.calculatePerformanceTrends([]);

      expect(trends.ordersPerHourTrend).toBe('stable');
      expect(trends.customerRatingTrend).toBe('stable');
      expect(trends.taskCompletionTrend).toBe('stable');
      expect(trends.errorRateTrend).toBe('stable');
    });

    test('should calculate improving trends', () => {
      const metrics = [
        { date: '2024-01-15', ordersPerHour: 5, customerRating: 4.0, taskCompletionRate: 80, errorRate: 5 },
        { date: '2024-01-16', ordersPerHour: 6, customerRating: 4.2, taskCompletionRate: 85, errorRate: 4 },
        { date: '2024-01-17', ordersPerHour: 7, customerRating: 4.5, taskCompletionRate: 90, errorRate: 2 },
        { date: '2024-01-18', ordersPerHour: 8, customerRating: 4.8, taskCompletionRate: 95, errorRate: 1 },
      ];

      const trends = performanceService.calculatePerformanceTrends(metrics);

      expect(trends.ordersPerHourTrend).toBe('improving');
      expect(trends.customerRatingTrend).toBe('improving');
      expect(trends.taskCompletionTrend).toBe('improving');
      expect(trends.errorRateTrend).toBe('improving'); // Error rate declining is improving
    });

    test('should calculate declining trends', () => {
      const metrics = [
        { date: '2024-01-15', ordersPerHour: 8, customerRating: 4.8, taskCompletionRate: 95, errorRate: 1 },
        { date: '2024-01-16', ordersPerHour: 7, customerRating: 4.5, taskCompletionRate: 90, errorRate: 2 },
        { date: '2024-01-17', ordersPerHour: 6, customerRating: 4.2, taskCompletionRate: 85, errorRate: 4 },
        { date: '2024-01-18', ordersPerHour: 5, customerRating: 4.0, taskCompletionRate: 80, errorRate: 5 },
      ];

      const trends = performanceService.calculatePerformanceTrends(metrics);

      expect(trends.ordersPerHourTrend).toBe('declining');
      expect(trends.customerRatingTrend).toBe('declining');
      expect(trends.taskCompletionTrend).toBe('declining');
      expect(trends.errorRateTrend).toBe('declining'); // Error rate increasing is declining
    });
  });

  describe('generatePerformanceRecommendations', () => {
    test('should generate recommendations for poor performance', () => {
      const summary = {
        averageOrdersPerHour: 5, // Below target of 10
        averageCustomerRating: 3.5, // Below target of 4.0
        averageTaskCompletionRate: 70, // Below 90%
        averageErrorRate: 8, // Above 5%
      };

      const trends = {
        ordersPerHourTrend: 'declining',
        customerRatingTrend: 'stable',
        taskCompletionTrend: 'stable',
        errorRateTrend: 'stable',
      };

      const recommendations = performanceService.generatePerformanceRecommendations(summary, trends);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.category === 'Productivity')).toBe(true);
      expect(recommendations.some(r => r.category === 'Customer Service')).toBe(true);
      expect(recommendations.some(r => r.category === 'Task Management')).toBe(true);
      expect(recommendations.some(r => r.category === 'Quality')).toBe(true);
    });

    test('should generate positive recommendations for improving trends', () => {
      const summary = {
        averageOrdersPerHour: 12,
        averageCustomerRating: 4.5,
        averageTaskCompletionRate: 95,
        averageErrorRate: 1,
      };

      const trends = {
        ordersPerHourTrend: 'stable',
        customerRatingTrend: 'improving',
        taskCompletionTrend: 'stable',
        errorRateTrend: 'stable',
      };

      const recommendations = performanceService.generatePerformanceRecommendations(summary, trends);

      expect(recommendations.some(r => r.category === 'Recognition')).toBe(true);
    });

    test('should generate trend-based recommendations', () => {
      const summary = {
        averageOrdersPerHour: 10,
        averageCustomerRating: 4.0,
        averageTaskCompletionRate: 90,
        averageErrorRate: 3,
      };

      const trends = {
        ordersPerHourTrend: 'declining',
        customerRatingTrend: 'stable',
        taskCompletionTrend: 'stable',
        errorRateTrend: 'stable',
      };

      const recommendations = performanceService.generatePerformanceRecommendations(summary, trends);

      expect(recommendations.some(r => r.category === 'Performance Trend')).toBe(true);
    });
  });
});
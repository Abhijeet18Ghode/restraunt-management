const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Performance Management service for tracking staff performance metrics
 */
class PerformanceService {
  constructor(dbManager) {
    this.db = dbManager;
    this.performanceData = new Map(); // In-memory storage for demo
    this.reviewCycleMonths = parseInt(process.env.PERFORMANCE_REVIEW_CYCLE_MONTHS) || 6;
    this.targetOrdersPerHour = parseInt(process.env.TARGET_ORDERS_PER_HOUR) || 10;
    this.targetCustomerRating = parseFloat(process.env.TARGET_CUSTOMER_RATING) || 4.0;
  }

  /**
   * Record performance metrics for staff member
   */
  async recordPerformanceMetrics(tenantId, staffId, metricsData) {
    const {
      date = new Date().toISOString().split('T')[0],
      ordersProcessed = 0,
      hoursWorked = 0,
      customerRating = 0,
      customerFeedbackCount = 0,
      tasksCompleted = 0,
      tasksAssigned = 0,
      salesAmount = 0,
      errors = 0,
      notes = null,
      recordedBy
    } = metricsData;

    try {
      const metricsId = `metrics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate derived metrics
      const ordersPerHour = hoursWorked > 0 ? Math.round((ordersProcessed / hoursWorked) * 100) / 100 : 0;
      const taskCompletionRate = tasksAssigned > 0 ? Math.round((tasksCompleted / tasksAssigned) * 100) : 0;
      const errorRate = ordersProcessed > 0 ? Math.round((errors / ordersProcessed) * 100) : 0;

      const metrics = {
        id: metricsId,
        tenantId,
        staffId,
        date,
        ordersProcessed,
        hoursWorked,
        ordersPerHour,
        customerRating,
        customerFeedbackCount,
        tasksCompleted,
        tasksAssigned,
        taskCompletionRate,
        salesAmount,
        errors,
        errorRate,
        notes,
        recordedBy,
        createdAt: new Date(),
      };

      const metricsKey = `${tenantId}:${staffId}:${date}`;
      this.performanceData.set(metricsKey, metrics);

      return createApiResponse(metrics, 'Performance metrics recorded successfully');
    } catch (error) {
      throw new DatabaseError('Failed to record performance metrics', error.message);
    }
  }

  /**
   * Get performance metrics for staff member
   */
  async getPerformanceMetrics(tenantId, staffId, startDate, endDate) {
    try {
      const metrics = [];
      
      for (const [key, metric] of this.performanceData.entries()) {
        if (key.startsWith(`${tenantId}:${staffId}:`)) {
          const metricDate = new Date(metric.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          
          if (metricDate >= start && metricDate <= end) {
            metrics.push(metric);
          }
        }
      }

      // Sort by date (newest first)
      metrics.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Calculate summary statistics
      const summary = this.calculatePerformanceSummary(metrics);

      return createApiResponse({
        metrics,
        summary,
        period: { startDate, endDate },
      }, 'Performance metrics retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get performance metrics', error.message);
    }
  }

  /**
   * Create performance review
   */
  async createPerformanceReview(tenantId, reviewData) {
    const {
      staffId,
      reviewerId,
      reviewPeriodStart,
      reviewPeriodEnd,
      overallRating,
      strengths = [],
      areasForImprovement = [],
      goals = [],
      comments = null,
      reviewType = 'REGULAR'
    } = reviewData;

    try {
      // Validate required fields
      if (!staffId || !reviewerId || !reviewPeriodStart || !reviewPeriodEnd || !overallRating) {
        throw new ValidationError('Staff ID, reviewer ID, review period, and overall rating are required');
      }

      // Validate rating
      if (overallRating < 1 || overallRating > 5) {
        throw new ValidationError('Overall rating must be between 1 and 5');
      }

      const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Get performance metrics for the review period
      const performanceMetrics = await this.getPerformanceMetrics(
        tenantId, 
        staffId, 
        reviewPeriodStart, 
        reviewPeriodEnd
      );

      const review = {
        id: reviewId,
        tenantId,
        staffId,
        reviewerId,
        reviewPeriodStart: new Date(reviewPeriodStart),
        reviewPeriodEnd: new Date(reviewPeriodEnd),
        overallRating,
        strengths,
        areasForImprovement,
        goals,
        comments,
        reviewType,
        performanceSummary: performanceMetrics.data.summary,
        status: 'DRAFT',
        createdAt: new Date(),
      };

      const reviewKey = `${tenantId}:review:${reviewId}`;
      this.performanceData.set(reviewKey, review);

      return createApiResponse(review, 'Performance review created successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create performance review', error.message);
    }
  }

  /**
   * Update performance review
   */
  async updatePerformanceReview(tenantId, reviewId, updateData) {
    try {
      const reviewKey = `${tenantId}:review:${reviewId}`;
      const review = this.performanceData.get(reviewKey);

      if (!review) {
        throw new ResourceNotFoundError('Performance review', reviewId);
      }

      // Fields that can be updated
      const allowedFields = [
        'overallRating', 'strengths', 'areasForImprovement', 
        'goals', 'comments', 'status'
      ];

      // Update allowed fields
      const updatedReview = { ...review };
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updatedReview[field] = updateData[field];
        }
      }

      updatedReview.updatedAt = new Date();

      this.performanceData.set(reviewKey, updatedReview);

      return createApiResponse(updatedReview, 'Performance review updated successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update performance review', error.message);
    }
  }

  /**
   * Get performance reviews for staff member
   */
  async getPerformanceReviews(tenantId, staffId) {
    try {
      const reviews = [];
      
      for (const [key, review] of this.performanceData.entries()) {
        if (key.startsWith(`${tenantId}:review:`) && review.staffId === staffId) {
          reviews.push(review);
        }
      }

      // Sort by review period end date (newest first)
      reviews.sort((a, b) => new Date(b.reviewPeriodEnd) - new Date(a.reviewPeriodEnd));

      return createApiResponse({
        reviews,
        total: reviews.length,
      }, 'Performance reviews retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get performance reviews', error.message);
    }
  }

  /**
   * Generate performance dashboard
   */
  async generatePerformanceDashboard(tenantId, staffId, period = '30d') {
    try {
      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get performance metrics
      const performanceMetrics = await this.getPerformanceMetrics(
        tenantId, 
        staffId, 
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
      );

      // Get recent reviews
      const reviews = await this.getPerformanceReviews(tenantId, staffId);
      const recentReviews = reviews.data.reviews.slice(0, 3); // Last 3 reviews

      // Calculate performance trends
      const trends = this.calculatePerformanceTrends(performanceMetrics.data.metrics);

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(
        performanceMetrics.data.summary,
        trends
      );

      const dashboard = {
        staffId,
        period,
        summary: performanceMetrics.data.summary,
        trends,
        recentReviews,
        recommendations,
        lastUpdated: new Date(),
      };

      return createApiResponse(dashboard, 'Performance dashboard generated successfully');
    } catch (error) {
      throw new DatabaseError('Failed to generate performance dashboard', error.message);
    }
  }

  /**
   * Calculate performance summary statistics
   */
  calculatePerformanceSummary(metrics) {
    if (metrics.length === 0) {
      return {
        totalDays: 0,
        averageOrdersPerHour: 0,
        averageCustomerRating: 0,
        averageTaskCompletionRate: 0,
        totalSalesAmount: 0,
        averageErrorRate: 0,
        performanceScore: 0,
      };
    }

    const totalDays = metrics.length;
    const totalOrdersPerHour = metrics.reduce((sum, m) => sum + m.ordersPerHour, 0);
    const totalCustomerRating = metrics.reduce((sum, m) => sum + m.customerRating, 0);
    const totalTaskCompletionRate = metrics.reduce((sum, m) => sum + m.taskCompletionRate, 0);
    const totalSalesAmount = metrics.reduce((sum, m) => sum + m.salesAmount, 0);
    const totalErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0);

    const averageOrdersPerHour = Math.round((totalOrdersPerHour / totalDays) * 100) / 100;
    const averageCustomerRating = Math.round((totalCustomerRating / totalDays) * 100) / 100;
    const averageTaskCompletionRate = Math.round((totalTaskCompletionRate / totalDays) * 100) / 100;
    const averageErrorRate = Math.round((totalErrorRate / totalDays) * 100) / 100;

    // Calculate performance score (0-100)
    const orderScore = Math.min(100, (averageOrdersPerHour / this.targetOrdersPerHour) * 100);
    const ratingScore = (averageCustomerRating / 5) * 100;
    const taskScore = averageTaskCompletionRate;
    const errorScore = Math.max(0, 100 - (averageErrorRate * 10)); // Penalize errors

    const performanceScore = Math.round((orderScore + ratingScore + taskScore + errorScore) / 4);

    return {
      totalDays,
      averageOrdersPerHour,
      averageCustomerRating,
      averageTaskCompletionRate,
      totalSalesAmount,
      averageErrorRate,
      performanceScore,
      targets: {
        ordersPerHour: this.targetOrdersPerHour,
        customerRating: this.targetCustomerRating,
        taskCompletionRate: 100,
        errorRate: 0,
      },
    };
  }

  /**
   * Calculate performance trends
   */
  calculatePerformanceTrends(metrics) {
    if (metrics.length < 2) {
      return {
        ordersPerHourTrend: 'stable',
        customerRatingTrend: 'stable',
        taskCompletionTrend: 'stable',
        errorRateTrend: 'stable',
      };
    }

    // Sort by date
    const sortedMetrics = metrics.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Compare first half with second half
    const midPoint = Math.floor(sortedMetrics.length / 2);
    const firstHalf = sortedMetrics.slice(0, midPoint);
    const secondHalf = sortedMetrics.slice(midPoint);

    const firstHalfAvg = {
      ordersPerHour: firstHalf.reduce((sum, m) => sum + m.ordersPerHour, 0) / firstHalf.length,
      customerRating: firstHalf.reduce((sum, m) => sum + m.customerRating, 0) / firstHalf.length,
      taskCompletionRate: firstHalf.reduce((sum, m) => sum + m.taskCompletionRate, 0) / firstHalf.length,
      errorRate: firstHalf.reduce((sum, m) => sum + m.errorRate, 0) / firstHalf.length,
    };

    const secondHalfAvg = {
      ordersPerHour: secondHalf.reduce((sum, m) => sum + m.ordersPerHour, 0) / secondHalf.length,
      customerRating: secondHalf.reduce((sum, m) => sum + m.customerRating, 0) / secondHalf.length,
      taskCompletionRate: secondHalf.reduce((sum, m) => sum + m.taskCompletionRate, 0) / secondHalf.length,
      errorRate: secondHalf.reduce((sum, m) => sum + m.errorRate, 0) / secondHalf.length,
    };

    const getTrend = (first, second, threshold = 0.1) => {
      const change = ((second - first) / first) * 100;
      if (Math.abs(change) < threshold) return 'stable';
      return change > 0 ? 'improving' : 'declining';
    };

    return {
      ordersPerHourTrend: getTrend(firstHalfAvg.ordersPerHour, secondHalfAvg.ordersPerHour),
      customerRatingTrend: getTrend(firstHalfAvg.customerRating, secondHalfAvg.customerRating),
      taskCompletionTrend: getTrend(firstHalfAvg.taskCompletionRate, secondHalfAvg.taskCompletionRate),
      errorRateTrend: getTrend(firstHalfAvg.errorRate, secondHalfAvg.errorRate) === 'improving' ? 'declining' : 'improving', // Reverse for error rate
    };
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(summary, trends) {
    const recommendations = [];

    // Orders per hour recommendations
    if (summary.averageOrdersPerHour < this.targetOrdersPerHour) {
      recommendations.push({
        category: 'Productivity',
        priority: 'high',
        message: `Current orders per hour (${summary.averageOrdersPerHour}) is below target (${this.targetOrdersPerHour}). Consider workflow optimization training.`,
      });
    }

    // Customer rating recommendations
    if (summary.averageCustomerRating < this.targetCustomerRating) {
      recommendations.push({
        category: 'Customer Service',
        priority: 'high',
        message: `Customer rating (${summary.averageCustomerRating}) is below target (${this.targetCustomerRating}). Focus on customer service skills.`,
      });
    }

    // Task completion recommendations
    if (summary.averageTaskCompletionRate < 90) {
      recommendations.push({
        category: 'Task Management',
        priority: 'medium',
        message: `Task completion rate (${summary.averageTaskCompletionRate}%) could be improved. Consider time management training.`,
      });
    }

    // Error rate recommendations
    if (summary.averageErrorRate > 5) {
      recommendations.push({
        category: 'Quality',
        priority: 'high',
        message: `Error rate (${summary.averageErrorRate}%) is concerning. Additional training and quality checks recommended.`,
      });
    }

    // Trend-based recommendations
    if (trends.ordersPerHourTrend === 'declining') {
      recommendations.push({
        category: 'Performance Trend',
        priority: 'medium',
        message: 'Productivity is declining. Schedule a check-in to identify potential issues.',
      });
    }

    if (trends.customerRatingTrend === 'improving') {
      recommendations.push({
        category: 'Recognition',
        priority: 'low',
        message: 'Customer satisfaction is improving. Consider recognizing this positive trend.',
      });
    }

    return recommendations;
  }
}

module.exports = PerformanceService;
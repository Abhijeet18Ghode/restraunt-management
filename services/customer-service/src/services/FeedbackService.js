const { 
  createApiResponse,
  ValidationError,
  ResourceNotFoundError,
  DatabaseError
} = require('@rms/shared');

/**
 * Customer Feedback service for managing reviews and ratings
 */
class FeedbackService {
  constructor(dbManager) {
    this.db = dbManager;
    this.feedbackData = new Map(); // In-memory storage for demo
    this.feedbackSummary = new Map(); // Aggregated feedback data
  }

  /**
   * Submit customer feedback
   */
  async submitFeedback(tenantId, feedbackData) {
    const {
      customerId,
      orderId,
      rating,
      comment = '',
      category = 'GENERAL', // FOOD, SERVICE, AMBIANCE, DELIVERY, GENERAL
      isAnonymous = false,
      tags = [],
    } = feedbackData;

    try {
      // Validate required fields
      if (!rating) {
        throw new ValidationError('Rating is required');
      }

      if (rating < 1 || rating > 5) {
        throw new ValidationError('Rating must be between 1 and 5');
      }

      // Generate feedback ID
      const feedbackId = `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create feedback record
      const feedback = {
        id: feedbackId,
        tenantId,
        customerId: isAnonymous ? null : customerId,
        orderId,
        rating,
        comment,
        category,
        isAnonymous,
        tags,
        status: 'PENDING', // PENDING, REVIEWED, RESPONDED
        isPublic: false,
        helpfulVotes: 0,
        response: null,
        respondedAt: null,
        respondedBy: null,
        createdAt: new Date(),
      };

      // Store feedback data
      const feedbackKey = `${tenantId}:${feedbackId}`;
      this.feedbackData.set(feedbackKey, feedback);

      // Update feedback summary
      await this.updateFeedbackSummary(tenantId, feedback, 'ADD');

      return createApiResponse(feedback, 'Feedback submitted successfully');
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to submit feedback', error.message);
    }
  }

  /**
   * Get feedback by ID
   */
  async getFeedbackById(tenantId, feedbackId) {
    try {
      const feedbackKey = `${tenantId}:${feedbackId}`;
      const feedback = this.feedbackData.get(feedbackKey);

      if (!feedback) {
        throw new ResourceNotFoundError('Feedback', feedbackId);
      }

      return createApiResponse(feedback, 'Feedback retrieved successfully');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to get feedback', error.message);
    }
  }

  /**
   * Get all feedback for tenant
   */
  async getAllFeedback(tenantId, filters = {}) {
    try {
      const allFeedback = [];
      
      for (const [key, feedback] of this.feedbackData.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          // Apply filters
          let includeFeedback = true;
          
          if (filters.rating && feedback.rating !== parseInt(filters.rating)) {
            includeFeedback = false;
          }
          
          if (filters.category && feedback.category !== filters.category) {
            includeFeedback = false;
          }
          
          if (filters.status && feedback.status !== filters.status) {
            includeFeedback = false;
          }

          if (filters.customerId && feedback.customerId !== filters.customerId) {
            includeFeedback = false;
          }

          if (filters.orderId && feedback.orderId !== filters.orderId) {
            includeFeedback = false;
          }

          if (filters.isPublic !== undefined && feedback.isPublic !== filters.isPublic) {
            includeFeedback = false;
          }

          if (filters.minRating && feedback.rating < parseInt(filters.minRating)) {
            includeFeedback = false;
          }

          if (filters.maxRating && feedback.rating > parseInt(filters.maxRating)) {
            includeFeedback = false;
          }

          if (includeFeedback) {
            allFeedback.push(feedback);
          }
        }
      }

      // Sort by creation date (newest first)
      allFeedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFeedback = allFeedback.slice(startIndex, endIndex);

      return createApiResponse({
        feedback: paginatedFeedback,
        total: allFeedback.length,
        page,
        limit,
        totalPages: Math.ceil(allFeedback.length / limit),
        filters: filters,
      }, 'Feedback retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get feedback', error.message);
    }
  }

  /**
   * Respond to feedback
   */
  async respondToFeedback(tenantId, feedbackId, response, respondedBy) {
    try {
      const feedbackKey = `${tenantId}:${feedbackId}`;
      const feedback = this.feedbackData.get(feedbackKey);

      if (!feedback) {
        throw new ResourceNotFoundError('Feedback', feedbackId);
      }

      if (!response || response.trim().length === 0) {
        throw new ValidationError('Response cannot be empty');
      }

      // Update feedback with response
      feedback.response = response.trim();
      feedback.respondedAt = new Date();
      feedback.respondedBy = respondedBy;
      feedback.status = 'RESPONDED';

      this.feedbackData.set(feedbackKey, feedback);

      return createApiResponse(feedback, 'Response added successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to respond to feedback', error.message);
    }
  }

  /**
   * Update feedback status
   */
  async updateFeedbackStatus(tenantId, feedbackId, status, updatedBy) {
    try {
      const validStatuses = ['PENDING', 'REVIEWED', 'RESPONDED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const feedbackKey = `${tenantId}:${feedbackId}`;
      const feedback = this.feedbackData.get(feedbackKey);

      if (!feedback) {
        throw new ResourceNotFoundError('Feedback', feedbackId);
      }

      feedback.status = status;
      feedback.updatedAt = new Date();
      feedback.updatedBy = updatedBy;

      this.feedbackData.set(feedbackKey, feedback);

      return createApiResponse(feedback, 'Feedback status updated successfully');
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update feedback status', error.message);
    }
  }

  /**
   * Make feedback public/private
   */
  async toggleFeedbackVisibility(tenantId, feedbackId, isPublic) {
    try {
      const feedbackKey = `${tenantId}:${feedbackId}`;
      const feedback = this.feedbackData.get(feedbackKey);

      if (!feedback) {
        throw new ResourceNotFoundError('Feedback', feedbackId);
      }

      feedback.isPublic = isPublic;
      feedback.updatedAt = new Date();

      this.feedbackData.set(feedbackKey, feedback);

      return createApiResponse(feedback, `Feedback made ${isPublic ? 'public' : 'private'} successfully`);
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update feedback visibility', error.message);
    }
  }

  /**
   * Get public feedback (for customer-facing display)
   */
  async getPublicFeedback(tenantId, filters = {}) {
    try {
      const publicFeedback = [];
      
      for (const [key, feedback] of this.feedbackData.entries()) {
        if (key.startsWith(`${tenantId}:`) && feedback.isPublic) {
          // Apply filters
          let includeFeedback = true;
          
          if (filters.category && feedback.category !== filters.category) {
            includeFeedback = false;
          }
          
          if (filters.minRating && feedback.rating < parseInt(filters.minRating)) {
            includeFeedback = false;
          }

          if (includeFeedback) {
            // Remove sensitive information for public display
            const publicFeedbackItem = {
              id: feedback.id,
              rating: feedback.rating,
              comment: feedback.comment,
              category: feedback.category,
              tags: feedback.tags,
              response: feedback.response,
              respondedAt: feedback.respondedAt,
              createdAt: feedback.createdAt,
              helpfulVotes: feedback.helpfulVotes,
            };
            publicFeedback.push(publicFeedbackItem);
          }
        }
      }

      // Sort by creation date (newest first)
      publicFeedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Apply pagination
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFeedback = publicFeedback.slice(startIndex, endIndex);

      return createApiResponse({
        feedback: paginatedFeedback,
        total: publicFeedback.length,
        page,
        limit,
        totalPages: Math.ceil(publicFeedback.length / limit),
      }, 'Public feedback retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get public feedback', error.message);
    }
  }

  /**
   * Get feedback summary and analytics
   */
  async getFeedbackSummary(tenantId) {
    try {
      const summaryKey = `${tenantId}:summary`;
      let summary = this.feedbackSummary.get(summaryKey);

      if (!summary) {
        // Calculate summary if not exists
        summary = await this.calculateFeedbackSummary(tenantId);
        this.feedbackSummary.set(summaryKey, summary);
      }

      return createApiResponse(summary, 'Feedback summary retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get feedback summary', error.message);
    }
  }

  /**
   * Calculate feedback summary
   */
  async calculateFeedbackSummary(tenantId) {
    const summary = {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      categoryBreakdown: {},
      statusBreakdown: { PENDING: 0, REVIEWED: 0, RESPONDED: 0 },
      responseRate: 0,
      publicFeedbackCount: 0,
      recentTrend: 'stable', // improving, declining, stable
      lastUpdated: new Date(),
    };

    let totalRating = 0;
    let respondedCount = 0;

    for (const [key, feedback] of this.feedbackData.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        summary.totalFeedback++;
        totalRating += feedback.rating;

        // Rating distribution
        summary.ratingDistribution[feedback.rating]++;

        // Category breakdown
        summary.categoryBreakdown[feedback.category] = 
          (summary.categoryBreakdown[feedback.category] || 0) + 1;

        // Status breakdown
        summary.statusBreakdown[feedback.status]++;

        // Response rate calculation
        if (feedback.status === 'RESPONDED') {
          respondedCount++;
        }

        // Public feedback count
        if (feedback.isPublic) {
          summary.publicFeedbackCount++;
        }
      }
    }

    // Calculate averages and rates
    if (summary.totalFeedback > 0) {
      summary.averageRating = Math.round((totalRating / summary.totalFeedback) * 100) / 100;
      summary.responseRate = Math.round((respondedCount / summary.totalFeedback) * 100);
    }

    // Calculate recent trend (simplified - compare last 30 days with previous 30 days)
    summary.recentTrend = this.calculateFeedbackTrend(tenantId);

    return summary;
  }

  /**
   * Calculate feedback trend
   */
  calculateFeedbackTrend(tenantId) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    let recentRatingSum = 0;
    let recentCount = 0;
    let previousRatingSum = 0;
    let previousCount = 0;

    for (const [key, feedback] of this.feedbackData.entries()) {
      if (key.startsWith(`${tenantId}:`)) {
        const feedbackDate = new Date(feedback.createdAt);
        
        if (feedbackDate >= thirtyDaysAgo) {
          recentRatingSum += feedback.rating;
          recentCount++;
        } else if (feedbackDate >= sixtyDaysAgo) {
          previousRatingSum += feedback.rating;
          previousCount++;
        }
      }
    }

    if (recentCount === 0 || previousCount === 0) {
      return 'stable';
    }

    const recentAverage = recentRatingSum / recentCount;
    const previousAverage = previousRatingSum / previousCount;
    const difference = recentAverage - previousAverage;

    if (difference > 0.2) return 'improving';
    if (difference < -0.2) return 'declining';
    return 'stable';
  }

  /**
   * Update feedback summary (called when feedback is added/updated)
   */
  async updateFeedbackSummary(tenantId, feedback, action) {
    try {
      // Recalculate summary
      const summary = await this.calculateFeedbackSummary(tenantId);
      const summaryKey = `${tenantId}:summary`;
      this.feedbackSummary.set(summaryKey, summary);
    } catch (error) {
      console.error('Failed to update feedback summary:', error);
    }
  }

  /**
   * Get customer feedback history
   */
  async getCustomerFeedback(tenantId, customerId) {
    try {
      const customerFeedback = [];
      
      for (const [key, feedback] of this.feedbackData.entries()) {
        if (key.startsWith(`${tenantId}:`) && feedback.customerId === customerId) {
          customerFeedback.push(feedback);
        }
      }

      // Sort by creation date (newest first)
      customerFeedback.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return createApiResponse({
        feedback: customerFeedback,
        total: customerFeedback.length,
      }, 'Customer feedback retrieved successfully');
    } catch (error) {
      throw new DatabaseError('Failed to get customer feedback', error.message);
    }
  }

  /**
   * Vote feedback as helpful
   */
  async voteFeedbackHelpful(tenantId, feedbackId) {
    try {
      const feedbackKey = `${tenantId}:${feedbackId}`;
      const feedback = this.feedbackData.get(feedbackKey);

      if (!feedback) {
        throw new ResourceNotFoundError('Feedback', feedbackId);
      }

      feedback.helpfulVotes++;
      this.feedbackData.set(feedbackKey, feedback);

      return createApiResponse(feedback, 'Feedback marked as helpful');
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to vote feedback as helpful', error.message);
    }
  }

  /**
   * Generate feedback report
   */
  async generateFeedbackReport(tenantId, startDate, endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const report = {
        period: { startDate, endDate },
        totalFeedback: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        categoryAnalysis: {},
        responseMetrics: {
          totalResponses: 0,
          averageResponseTime: 0,
          responseRate: 0,
        },
        sentimentAnalysis: {
          positive: 0, // 4-5 stars
          neutral: 0,  // 3 stars
          negative: 0, // 1-2 stars
        },
        topIssues: [],
        improvements: [],
        generatedAt: new Date(),
      };

      let totalRating = 0;
      let responseTimeSum = 0;
      let responseCount = 0;

      for (const [key, feedback] of this.feedbackData.entries()) {
        if (key.startsWith(`${tenantId}:`)) {
          const feedbackDate = new Date(feedback.createdAt);
          
          if (feedbackDate >= start && feedbackDate <= end) {
            report.totalFeedback++;
            totalRating += feedback.rating;
            
            // Rating distribution
            report.ratingDistribution[feedback.rating]++;
            
            // Category analysis
            if (!report.categoryAnalysis[feedback.category]) {
              report.categoryAnalysis[feedback.category] = {
                count: 0,
                averageRating: 0,
                totalRating: 0,
              };
            }
            report.categoryAnalysis[feedback.category].count++;
            report.categoryAnalysis[feedback.category].totalRating += feedback.rating;
            
            // Sentiment analysis
            if (feedback.rating >= 4) {
              report.sentimentAnalysis.positive++;
            } else if (feedback.rating === 3) {
              report.sentimentAnalysis.neutral++;
            } else {
              report.sentimentAnalysis.negative++;
            }
            
            // Response metrics
            if (feedback.respondedAt) {
              responseCount++;
              const responseTime = new Date(feedback.respondedAt) - new Date(feedback.createdAt);
              responseTimeSum += responseTime;
            }
          }
        }
      }

      // Calculate averages
      if (report.totalFeedback > 0) {
        report.averageRating = Math.round((totalRating / report.totalFeedback) * 100) / 100;
        report.responseMetrics.responseRate = Math.round((responseCount / report.totalFeedback) * 100);
      }

      if (responseCount > 0) {
        report.responseMetrics.totalResponses = responseCount;
        report.responseMetrics.averageResponseTime = Math.round((responseTimeSum / responseCount) / (1000 * 60 * 60)); // hours
      }

      // Calculate category averages
      Object.keys(report.categoryAnalysis).forEach(category => {
        const categoryData = report.categoryAnalysis[category];
        categoryData.averageRating = Math.round((categoryData.totalRating / categoryData.count) * 100) / 100;
        delete categoryData.totalRating; // Remove intermediate calculation
      });

      return createApiResponse(report, 'Feedback report generated successfully');
    } catch (error) {
      throw new DatabaseError('Failed to generate feedback report', error.message);
    }
  }
}

module.exports = FeedbackService;
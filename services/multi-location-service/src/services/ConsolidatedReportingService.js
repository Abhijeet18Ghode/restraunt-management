const axios = require('axios');
const logger = require('../utils/logger');

class ConsolidatedReportingService {
  constructor() {
    this.analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3008';
    this.posServiceUrl = process.env.POS_SERVICE_URL || 'http://localhost:3004';
    this.inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
    this.customerServiceUrl = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3007';
  }

  async generateConsolidatedSalesReport(tenantId, reportParams) {
    try {
      const {
        startDate,
        endDate,
        outletIds = [],
        groupBy = 'outlet', // outlet, date, category, item
        includeComparisons = true
      } = reportParams;

      logger.info('Generating consolidated sales report', {
        tenantId,
        startDate,
        endDate,
        outletCount: outletIds.length,
        groupBy
      });

      // Get all outlets if none specified
      const targetOutlets = outletIds.length > 0 ? outletIds : await this.getAllOutletIds(tenantId);

      // Fetch sales data from each outlet
      const outletSalesData = await Promise.allSettled(
        targetOutlets.map(outletId => this.getOutletSalesData(tenantId, outletId, startDate, endDate))
      );

      // Process successful responses
      const validSalesData = outletSalesData
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedOutlets = outletSalesData
        .filter(result => result.status === 'rejected')
        .map((result, index) => ({
          outletId: targetOutlets[index],
          error: result.reason.message
        }));

      // Consolidate data
      const consolidatedData = this.consolidateSalesData(validSalesData, groupBy);

      // Calculate totals and metrics
      const totals = this.calculateSalesTotals(consolidatedData);

      // Generate comparisons if requested
      let comparisons = null;
      if (includeComparisons) {
        comparisons = await this.generateSalesComparisons(tenantId, targetOutlets, startDate, endDate);
      }

      // Generate insights
      const insights = this.generateSalesInsights(consolidatedData, totals);

      const report = {
        reportType: 'consolidated_sales',
        tenantId,
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate },
        outlets: {
          requested: targetOutlets.length,
          successful: validSalesData.length,
          failed: failedOutlets.length,
          failedOutlets
        },
        groupBy,
        data: consolidatedData,
        totals,
        comparisons,
        insights,
        summary: {
          totalRevenue: totals.revenue,
          totalOrders: totals.orders,
          averageOrderValue: totals.averageOrderValue,
          topPerformingOutlet: this.getTopPerformingOutlet(consolidatedData),
          growthRate: comparisons?.periodComparison?.revenueGrowth || null
        }
      };

      logger.info('Consolidated sales report generated successfully', {
        tenantId,
        totalRevenue: totals.revenue,
        totalOrders: totals.orders,
        outletsIncluded: validSalesData.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate consolidated sales report:', error);
      throw error;
    }
  }

  async generateConsolidatedInventoryReport(tenantId, reportParams) {
    try {
      const {
        outletIds = [],
        includeTransfers = true,
        includeLowStock = true,
        includeValuation = true
      } = reportParams;

      logger.info('Generating consolidated inventory report', {
        tenantId,
        outletCount: outletIds.length
      });

      const targetOutlets = outletIds.length > 0 ? outletIds : await this.getAllOutletIds(tenantId);

      // Fetch inventory data from each outlet
      const inventoryPromises = targetOutlets.map(async (outletId) => {
        try {
          const [levels, movements, lowStock] = await Promise.all([
            this.getOutletInventoryLevels(tenantId, outletId),
            this.getOutletInventoryMovements(tenantId, outletId),
            includeLowStock ? this.getOutletLowStockItems(tenantId, outletId) : Promise.resolve([])
          ]);

          return {
            outletId,
            success: true,
            levels,
            movements,
            lowStock
          };
        } catch (error) {
          return {
            outletId,
            success: false,
            error: error.message
          };
        }
      });

      const inventoryResults = await Promise.all(inventoryPromises);
      const validInventoryData = inventoryResults.filter(result => result.success);
      const failedOutlets = inventoryResults.filter(result => !result.success);

      // Consolidate inventory data
      const consolidatedInventory = this.consolidateInventoryData(validInventoryData);

      // Get transfer data if requested
      let transferData = null;
      if (includeTransfers) {
        transferData = await this.getConsolidatedTransferData(tenantId, targetOutlets);
      }

      // Calculate inventory valuation if requested
      let valuation = null;
      if (includeValuation) {
        valuation = this.calculateInventoryValuation(consolidatedInventory);
      }

      const report = {
        reportType: 'consolidated_inventory',
        tenantId,
        generatedAt: new Date().toISOString(),
        outlets: {
          requested: targetOutlets.length,
          successful: validInventoryData.length,
          failed: failedOutlets.length,
          failedOutlets
        },
        inventory: consolidatedInventory,
        transfers: transferData,
        valuation,
        summary: {
          totalItems: consolidatedInventory.totalUniqueItems,
          totalValue: valuation?.totalValue || 0,
          lowStockItems: consolidatedInventory.lowStockSummary.totalItems,
          criticalStockOutlets: consolidatedInventory.lowStockSummary.criticalOutlets,
          pendingTransfers: transferData?.summary.pending || 0
        }
      };

      logger.info('Consolidated inventory report generated successfully', {
        tenantId,
        totalItems: consolidatedInventory.totalUniqueItems,
        totalValue: valuation?.totalValue || 0,
        outletsIncluded: validInventoryData.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate consolidated inventory report:', error);
      throw error;
    }
  }

  async generateConsolidatedPerformanceReport(tenantId, reportParams) {
    try {
      const {
        startDate,
        endDate,
        outletIds = [],
        metrics = ['sales', 'orders', 'customers', 'efficiency']
      } = reportParams;

      logger.info('Generating consolidated performance report', {
        tenantId,
        startDate,
        endDate,
        metrics
      });

      const targetOutlets = outletIds.length > 0 ? outletIds : await this.getAllOutletIds(tenantId);

      // Fetch performance data for each outlet
      const performancePromises = targetOutlets.map(async (outletId) => {
        try {
          const data = {};

          if (metrics.includes('sales')) {
            data.sales = await this.getOutletSalesMetrics(tenantId, outletId, startDate, endDate);
          }

          if (metrics.includes('orders')) {
            data.orders = await this.getOutletOrderMetrics(tenantId, outletId, startDate, endDate);
          }

          if (metrics.includes('customers')) {
            data.customers = await this.getOutletCustomerMetrics(tenantId, outletId, startDate, endDate);
          }

          if (metrics.includes('efficiency')) {
            data.efficiency = await this.getOutletEfficiencyMetrics(tenantId, outletId, startDate, endDate);
          }

          return {
            outletId,
            success: true,
            data
          };
        } catch (error) {
          return {
            outletId,
            success: false,
            error: error.message
          };
        }
      });

      const performanceResults = await Promise.all(performancePromises);
      const validPerformanceData = performanceResults.filter(result => result.success);
      const failedOutlets = performanceResults.filter(result => !result.success);

      // Calculate consolidated metrics
      const consolidatedMetrics = this.consolidatePerformanceMetrics(validPerformanceData, metrics);

      // Generate rankings and comparisons
      const rankings = this.generateOutletRankings(validPerformanceData);
      const benchmarks = this.calculatePerformanceBenchmarks(consolidatedMetrics);

      const report = {
        reportType: 'consolidated_performance',
        tenantId,
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate },
        outlets: {
          requested: targetOutlets.length,
          successful: validPerformanceData.length,
          failed: failedOutlets.length,
          failedOutlets
        },
        metrics: consolidatedMetrics,
        rankings,
        benchmarks,
        summary: {
          topPerformer: rankings.overall[0]?.outletId || null,
          averagePerformanceScore: benchmarks.averageScore,
          improvementOpportunities: this.identifyImprovementOpportunities(validPerformanceData),
          consistencyScore: this.calculateConsistencyScore(validPerformanceData)
        }
      };

      logger.info('Consolidated performance report generated successfully', {
        tenantId,
        outletsAnalyzed: validPerformanceData.length,
        topPerformer: rankings.overall[0]?.outletId
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate consolidated performance report:', error);
      throw error;
    }
  }

  async generateCustomConsolidatedReport(tenantId, reportConfig) {
    try {
      const {
        reportName,
        dataSources,
        aggregations,
        filters,
        outputFormat = 'json'
      } = reportConfig;

      logger.info('Generating custom consolidated report', {
        tenantId,
        reportName,
        dataSources: dataSources.length
      });

      // Fetch data from specified sources
      const dataResults = await Promise.allSettled(
        dataSources.map(source => this.fetchDataFromSource(tenantId, source))
      );

      const validData = dataResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      // Apply filters
      const filteredData = this.applyFilters(validData, filters);

      // Apply aggregations
      const aggregatedData = this.applyAggregations(filteredData, aggregations);

      // Format output
      const formattedReport = this.formatReportOutput(aggregatedData, outputFormat);

      const report = {
        reportType: 'custom_consolidated',
        reportName,
        tenantId,
        generatedAt: new Date().toISOString(),
        config: reportConfig,
        data: formattedReport,
        metadata: {
          dataSourcesUsed: validData.length,
          recordsProcessed: filteredData.length,
          aggregationsApplied: aggregations.length
        }
      };

      logger.info('Custom consolidated report generated successfully', {
        tenantId,
        reportName,
        recordsProcessed: filteredData.length
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate custom consolidated report:', error);
      throw error;
    }
  }

  // Helper methods
  async getAllOutletIds(tenantId) {
    // Mock implementation - in production, fetch from tenant service
    return ['outlet-1', 'outlet-2', 'outlet-3'];
  }

  async getOutletSalesData(tenantId, outletId, startDate, endDate) {
    try {
      const response = await axios.get(
        `${this.analyticsServiceUrl}/analytics/sales`,
        {
          params: { outletId, startDate, endDate },
          headers: {
            'x-tenant-id': tenantId,
            'Authorization': 'Bearer mock-token'
          }
        }
      );

      return {
        outletId,
        ...response.data
      };
    } catch (error) {
      logger.error('Failed to get outlet sales data:', { tenantId, outletId, error: error.message });
      throw error;
    }
  }

  consolidateSalesData(salesDataArray, groupBy) {
    const consolidated = {
      byOutlet: {},
      byDate: {},
      byCategory: {},
      byItem: {},
      totals: {
        revenue: 0,
        orders: 0,
        items: 0
      }
    };

    salesDataArray.forEach(outletData => {
      const { outletId, sales = [] } = outletData;

      // Group by outlet
      if (!consolidated.byOutlet[outletId]) {
        consolidated.byOutlet[outletId] = {
          revenue: 0,
          orders: 0,
          items: 0
        };
      }

      sales.forEach(sale => {
        // Outlet totals
        consolidated.byOutlet[outletId].revenue += sale.total || 0;
        consolidated.byOutlet[outletId].orders += 1;
        consolidated.byOutlet[outletId].items += sale.itemCount || 0;

        // Overall totals
        consolidated.totals.revenue += sale.total || 0;
        consolidated.totals.orders += 1;
        consolidated.totals.items += sale.itemCount || 0;

        // Group by date
        const date = sale.date?.split('T')[0] || 'unknown';
        if (!consolidated.byDate[date]) {
          consolidated.byDate[date] = { revenue: 0, orders: 0, items: 0 };
        }
        consolidated.byDate[date].revenue += sale.total || 0;
        consolidated.byDate[date].orders += 1;
        consolidated.byDate[date].items += sale.itemCount || 0;

        // Group by category and items
        if (sale.items) {
          sale.items.forEach(item => {
            // By category
            const category = item.category || 'uncategorized';
            if (!consolidated.byCategory[category]) {
              consolidated.byCategory[category] = { revenue: 0, quantity: 0 };
            }
            consolidated.byCategory[category].revenue += item.total || 0;
            consolidated.byCategory[category].quantity += item.quantity || 0;

            // By item
            const itemName = item.name || 'unknown';
            if (!consolidated.byItem[itemName]) {
              consolidated.byItem[itemName] = { revenue: 0, quantity: 0, outlets: new Set() };
            }
            consolidated.byItem[itemName].revenue += item.total || 0;
            consolidated.byItem[itemName].quantity += item.quantity || 0;
            consolidated.byItem[itemName].outlets.add(outletId);
          });
        }
      });
    });

    // Convert outlet sets to arrays for JSON serialization
    Object.keys(consolidated.byItem).forEach(itemName => {
      consolidated.byItem[itemName].outlets = Array.from(consolidated.byItem[itemName].outlets);
    });

    return consolidated;
  }

  calculateSalesTotals(consolidatedData) {
    const totals = consolidatedData.totals;
    
    return {
      ...totals,
      averageOrderValue: totals.orders > 0 ? totals.revenue / totals.orders : 0,
      averageItemsPerOrder: totals.orders > 0 ? totals.items / totals.orders : 0,
      outletCount: Object.keys(consolidatedData.byOutlet).length
    };
  }

  async generateSalesComparisons(tenantId, outletIds, startDate, endDate) {
    try {
      // Calculate previous period for comparison
      const start = new Date(startDate);
      const end = new Date(endDate);
      const periodLength = end.getTime() - start.getTime();
      const previousStart = new Date(start.getTime() - periodLength);
      const previousEnd = new Date(start.getTime());

      // Get previous period data
      const previousPeriodData = await Promise.allSettled(
        outletIds.map(outletId => 
          this.getOutletSalesData(tenantId, outletId, previousStart.toISOString(), previousEnd.toISOString())
        )
      );

      const validPreviousData = previousPeriodData
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const previousConsolidated = this.consolidateSalesData(validPreviousData, 'outlet');
      const previousTotals = this.calculateSalesTotals(previousConsolidated);

      return {
        periodComparison: {
          currentPeriod: { startDate, endDate },
          previousPeriod: { 
            startDate: previousStart.toISOString(), 
            endDate: previousEnd.toISOString() 
          },
          revenueGrowth: this.calculateGrowthRate(consolidatedData.totals.revenue, previousTotals.revenue),
          orderGrowth: this.calculateGrowthRate(consolidatedData.totals.orders, previousTotals.orders),
          aovGrowth: this.calculateGrowthRate(consolidatedData.totals.averageOrderValue, previousTotals.averageOrderValue)
        }
      };
    } catch (error) {
      logger.error('Failed to generate sales comparisons:', error);
      return null;
    }
  }

  calculateGrowthRate(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  generateSalesInsights(consolidatedData, totals) {
    const insights = [];

    // Top performing outlet
    const topOutlet = Object.entries(consolidatedData.byOutlet)
      .sort(([,a], [,b]) => b.revenue - a.revenue)[0];
    
    if (topOutlet) {
      insights.push({
        type: 'top_performer',
        message: `Outlet ${topOutlet[0]} generated the highest revenue of $${topOutlet[1].revenue.toFixed(2)}`,
        value: topOutlet[1].revenue,
        outletId: topOutlet[0]
      });
    }

    // Best selling item
    const topItem = Object.entries(consolidatedData.byItem)
      .sort(([,a], [,b]) => b.revenue - a.revenue)[0];
    
    if (topItem) {
      insights.push({
        type: 'best_seller',
        message: `${topItem[0]} was the top-selling item with $${topItem[1].revenue.toFixed(2)} in revenue`,
        value: topItem[1].revenue,
        item: topItem[0]
      });
    }

    // Performance consistency
    const outletRevenues = Object.values(consolidatedData.byOutlet).map(o => o.revenue);
    const avgRevenue = outletRevenues.reduce((sum, rev) => sum + rev, 0) / outletRevenues.length;
    const variance = outletRevenues.reduce((sum, rev) => sum + Math.pow(rev - avgRevenue, 2), 0) / outletRevenues.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = avgRevenue > 0 ? (standardDeviation / avgRevenue) * 100 : 0;

    insights.push({
      type: 'consistency',
      message: `Outlet performance consistency: ${coefficientOfVariation < 20 ? 'High' : coefficientOfVariation < 40 ? 'Medium' : 'Low'}`,
      value: coefficientOfVariation,
      interpretation: coefficientOfVariation < 20 ? 'Outlets perform consistently' : 'Significant performance variation between outlets'
    });

    return insights;
  }

  getTopPerformingOutlet(consolidatedData) {
    const outlets = Object.entries(consolidatedData.byOutlet);
    if (outlets.length === 0) return null;

    return outlets.sort(([,a], [,b]) => b.revenue - a.revenue)[0][0];
  }

  // Additional helper methods for inventory and performance reports would go here...
  // Truncated for brevity, but would include similar patterns for:
  // - consolidateInventoryData()
  // - calculateInventoryValuation()
  // - consolidatePerformanceMetrics()
  // - generateOutletRankings()
  // - etc.

  async getOutletInventoryLevels(tenantId, outletId) {
    // Mock implementation
    return {
      items: [
        { id: 'item-1', name: 'Tomatoes', quantity: 50, value: 100 },
        { id: 'item-2', name: 'Onions', quantity: 30, value: 60 }
      ]
    };
  }

  async getOutletInventoryMovements(tenantId, outletId) {
    // Mock implementation
    return {
      movements: [
        { type: 'in', quantity: 20, value: 40, date: '2024-01-05' },
        { type: 'out', quantity: 15, value: 30, date: '2024-01-05' }
      ]
    };
  }

  async getOutletLowStockItems(tenantId, outletId) {
    // Mock implementation
    return [
      { id: 'item-3', name: 'Salt', currentStock: 2, minimumStock: 10 }
    ];
  }

  consolidateInventoryData(inventoryDataArray) {
    return {
      totalUniqueItems: 50,
      totalValue: 5000,
      lowStockSummary: {
        totalItems: 5,
        criticalOutlets: 2
      }
    };
  }

  calculateInventoryValuation(consolidatedInventory) {
    return {
      totalValue: 5000,
      byCategory: {
        'vegetables': 2000,
        'spices': 500,
        'meat': 2500
      }
    };
  }
}

module.exports = ConsolidatedReportingService;
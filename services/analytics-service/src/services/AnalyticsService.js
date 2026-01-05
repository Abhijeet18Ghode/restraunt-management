const moment = require('moment');

class AnalyticsService {
  constructor(dbPool) {
    this.db = dbPool;
  }

  async generateSalesReport(tenantId, period, outletId = null) {
    const { startDate, endDate } = this._parsePeriod(period);
    
    const query = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(o.id) as total_orders,
        SUM(o.total) as total_revenue,
        SUM(o.subtotal) as subtotal,
        SUM(o.tax) as total_tax,
        SUM(o.discount) as total_discount,
        AVG(o.total) as average_order_value,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM ${this._getSchemaName(tenantId)}.orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `;

    const params = [startDate, endDate];
    if (outletId) params.push(outletId);

    const result = await this.db.query(query, params);
    
    return {
      period: period,
      startDate: startDate,
      endDate: endDate,
      outletId: outletId,
      dailyData: result.rows,
      summary: this._calculateSummary(result.rows)
    };
  }

  async getPerformanceMetrics(tenantId, outletId, period) {
    const { startDate, endDate } = this._parsePeriod(period);
    
    // Get top selling items
    const topItemsQuery = `
      SELECT 
        mi.name,
        mi.category,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM ${this._getSchemaName(tenantId)}.order_items oi
      JOIN ${this._getSchemaName(tenantId)}.menu_items mi ON oi.menu_item_id = mi.id
      JOIN ${this._getSchemaName(tenantId)}.orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY mi.id, mi.name, mi.category
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    // Get peak hours
    const peakHoursQuery = `
      SELECT 
        EXTRACT(HOUR FROM o.created_at) as hour,
        COUNT(o.id) as order_count,
        SUM(o.total) as revenue
      FROM ${this._getSchemaName(tenantId)}.orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY EXTRACT(HOUR FROM o.created_at)
      ORDER BY order_count DESC
    `;

    // Get order type distribution
    const orderTypeQuery = `
      SELECT 
        o.order_type,
        COUNT(o.id) as count,
        SUM(o.total) as revenue,
        AVG(o.total) as avg_value
      FROM ${this._getSchemaName(tenantId)}.orders o
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY o.order_type
      ORDER BY count DESC
    `;

    const params = [startDate, endDate];
    if (outletId) params.push(outletId);

    const [topItems, peakHours, orderTypes] = await Promise.all([
      this.db.query(topItemsQuery, params),
      this.db.query(peakHoursQuery, params),
      this.db.query(orderTypeQuery, params)
    ]);

    return {
      period: period,
      outletId: outletId,
      topSellingItems: topItems.rows,
      peakHours: peakHours.rows,
      orderTypeDistribution: orderTypes.rows
    };
  }

  async getTopSellingItems(tenantId, period, outletId = null, limit = 20) {
    const { startDate, endDate } = this._parsePeriod(period);
    
    const query = `
      SELECT 
        mi.id,
        mi.name,
        mi.category,
        mi.price,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.total_price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_frequency,
        AVG(oi.quantity) as avg_quantity_per_order,
        (SUM(oi.total_price) / SUM(oi.quantity)) as avg_selling_price
      FROM ${this._getSchemaName(tenantId)}.order_items oi
      JOIN ${this._getSchemaName(tenantId)}.menu_items mi ON oi.menu_item_id = mi.id
      JOIN ${this._getSchemaName(tenantId)}.orders o ON oi.order_id = o.id
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY mi.id, mi.name, mi.category, mi.price
      ORDER BY total_quantity_sold DESC
      LIMIT $${outletId ? 4 : 3}
    `;

    const params = [startDate, endDate];
    if (outletId) params.push(outletId);
    params.push(limit);

    const result = await this.db.query(query, params);
    
    return {
      period: period,
      outletId: outletId,
      items: result.rows
    };
  }

  async getInventoryAnalytics(tenantId, outletId = null) {
    // Get low stock items
    const lowStockQuery = `
      SELECT 
        ii.name,
        ii.category,
        ii.current_stock,
        ii.minimum_stock,
        ii.unit,
        (ii.minimum_stock - ii.current_stock) as shortage_amount,
        ii.unit_cost,
        (ii.minimum_stock - ii.current_stock) * ii.unit_cost as shortage_value
      FROM ${this._getSchemaName(tenantId)}.inventory_items ii
      WHERE ii.current_stock <= ii.minimum_stock
        ${outletId ? 'AND ii.outlet_id = $1' : ''}
      ORDER BY shortage_value DESC
    `;

    // Get consumption patterns (last 30 days)
    const consumptionQuery = `
      SELECT 
        ii.name,
        ii.category,
        ii.current_stock,
        ii.unit,
        COALESCE(consumption.total_consumed, 0) as consumed_last_30_days,
        COALESCE(consumption.total_consumed / 30.0, 0) as avg_daily_consumption,
        CASE 
          WHEN COALESCE(consumption.total_consumed / 30.0, 0) > 0 
          THEN ii.current_stock / (consumption.total_consumed / 30.0)
          ELSE NULL 
        END as days_remaining
      FROM ${this._getSchemaName(tenantId)}.inventory_items ii
      LEFT JOIN (
        SELECT 
          ingredient_name,
          SUM(quantity_consumed) as total_consumed
        FROM ${this._getSchemaName(tenantId)}.inventory_consumption
        WHERE consumed_at >= NOW() - INTERVAL '30 days'
        GROUP BY ingredient_name
      ) consumption ON ii.name = consumption.ingredient_name
      ${outletId ? 'WHERE ii.outlet_id = $1' : ''}
      ORDER BY days_remaining ASC NULLS LAST
    `;

    const params = outletId ? [outletId] : [];

    const [lowStock, consumption] = await Promise.all([
      this.db.query(lowStockQuery, params),
      this.db.query(consumptionQuery, params)
    ]);

    return {
      outletId: outletId,
      lowStockItems: lowStock.rows,
      consumptionPatterns: consumption.rows,
      summary: {
        totalLowStockItems: lowStock.rows.length,
        totalShortageValue: lowStock.rows.reduce((sum, item) => sum + (item.shortage_value || 0), 0),
        criticalItems: consumption.rows.filter(item => item.days_remaining && item.days_remaining < 7).length
      }
    };
  }

  async getCustomerAnalytics(tenantId, period, outletId = null) {
    const { startDate, endDate } = this._parsePeriod(period);
    
    // Customer frequency analysis
    const customerFrequencyQuery = `
      SELECT 
        customer_id,
        COUNT(id) as visit_count,
        SUM(total) as total_spent,
        AVG(total) as avg_order_value,
        MIN(created_at) as first_visit,
        MAX(created_at) as last_visit
      FROM ${this._getSchemaName(tenantId)}.orders
      WHERE created_at >= $1 AND created_at <= $2
        AND status = 'COMPLETED'
        AND customer_id IS NOT NULL
        ${outletId ? 'AND outlet_id = $3' : ''}
      GROUP BY customer_id
      ORDER BY total_spent DESC
    `;

    // New vs returning customers
    const customerTypeQuery = `
      SELECT 
        DATE(o.created_at) as date,
        COUNT(CASE WHEN first_orders.customer_id IS NOT NULL THEN 1 END) as new_customers,
        COUNT(CASE WHEN first_orders.customer_id IS NULL THEN 1 END) as returning_customers
      FROM ${this._getSchemaName(tenantId)}.orders o
      LEFT JOIN (
        SELECT customer_id, MIN(created_at) as first_order_date
        FROM ${this._getSchemaName(tenantId)}.orders
        WHERE customer_id IS NOT NULL
        GROUP BY customer_id
      ) first_orders ON o.customer_id = first_orders.customer_id 
        AND DATE(o.created_at) = DATE(first_orders.first_order_date)
      WHERE o.created_at >= $1 AND o.created_at <= $2
        AND o.status = 'COMPLETED'
        AND o.customer_id IS NOT NULL
        ${outletId ? 'AND o.outlet_id = $3' : ''}
      GROUP BY DATE(o.created_at)
      ORDER BY date DESC
    `;

    const params = [startDate, endDate];
    if (outletId) params.push(outletId);

    const [customerFreq, customerType] = await Promise.all([
      this.db.query(customerFrequencyQuery, params),
      this.db.query(customerTypeQuery, params)
    ]);

    return {
      period: period,
      outletId: outletId,
      topCustomers: customerFreq.rows.slice(0, 20),
      customerAcquisition: customerType.rows,
      summary: {
        totalCustomers: customerFreq.rows.length,
        averageOrderValue: customerFreq.rows.reduce((sum, c) => sum + parseFloat(c.avg_order_value), 0) / customerFreq.rows.length,
        repeatCustomers: customerFreq.rows.filter(c => c.visit_count > 1).length
      }
    };
  }

  async getTrendAnalysis(tenantId, metric, period, outletId = null) {
    const { startDate, endDate } = this._parsePeriod(period);
    const previousPeriod = this._getPreviousPeriod(period);
    
    let metricQuery;
    switch (metric) {
      case 'revenue':
        metricQuery = 'SUM(total) as value';
        break;
      case 'orders':
        metricQuery = 'COUNT(id) as value';
        break;
      case 'customers':
        metricQuery = 'COUNT(DISTINCT customer_id) as value';
        break;
      case 'avg_order_value':
        metricQuery = 'AVG(total) as value';
        break;
      default:
        throw new Error('Invalid metric type');
    }

    const query = `
      SELECT 
        DATE(created_at) as date,
        ${metricQuery}
      FROM ${this._getSchemaName(tenantId)}.orders
      WHERE created_at >= $1 AND created_at <= $2
        AND status = 'COMPLETED'
        ${outletId ? 'AND outlet_id = $3' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    const previousQuery = `
      SELECT 
        ${metricQuery}
      FROM ${this._getSchemaName(tenantId)}.orders
      WHERE created_at >= $1 AND created_at <= $2
        AND status = 'COMPLETED'
        ${outletId ? 'AND outlet_id = $3' : ''}
    `;

    const params = [startDate, endDate];
    const prevParams = [previousPeriod.startDate, previousPeriod.endDate];
    if (outletId) {
      params.push(outletId);
      prevParams.push(outletId);
    }

    const [current, previous] = await Promise.all([
      this.db.query(query, params),
      this.db.query(previousQuery, prevParams)
    ]);

    const currentTotal = current.rows.reduce((sum, row) => sum + parseFloat(row.value || 0), 0);
    const previousTotal = parseFloat(previous.rows[0]?.value || 0);
    const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

    return {
      metric: metric,
      period: period,
      outletId: outletId,
      currentValue: currentTotal,
      previousValue: previousTotal,
      changePercentage: change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      dailyData: current.rows
    };
  }

  // Helper methods
  _parsePeriod(period) {
    const now = moment();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = now.clone().startOf('day');
        endDate = now.clone().endOf('day');
        break;
      case 'yesterday':
        startDate = now.clone().subtract(1, 'day').startOf('day');
        endDate = now.clone().subtract(1, 'day').endOf('day');
        break;
      case 'this_week':
        startDate = now.clone().startOf('week');
        endDate = now.clone().endOf('week');
        break;
      case 'last_week':
        startDate = now.clone().subtract(1, 'week').startOf('week');
        endDate = now.clone().subtract(1, 'week').endOf('week');
        break;
      case 'this_month':
        startDate = now.clone().startOf('month');
        endDate = now.clone().endOf('month');
        break;
      case 'last_month':
        startDate = now.clone().subtract(1, 'month').startOf('month');
        endDate = now.clone().subtract(1, 'month').endOf('month');
        break;
      case 'last_30_days':
        startDate = now.clone().subtract(30, 'days').startOf('day');
        endDate = now.clone().endOf('day');
        break;
      case 'last_90_days':
        startDate = now.clone().subtract(90, 'days').startOf('day');
        endDate = now.clone().endOf('day');
        break;
      default:
        // Custom date range: period should be "YYYY-MM-DD,YYYY-MM-DD"
        const [start, end] = period.split(',');
        startDate = moment(start);
        endDate = moment(end);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  _getPreviousPeriod(period) {
    const now = moment();
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = now.clone().subtract(1, 'day').startOf('day');
        endDate = now.clone().subtract(1, 'day').endOf('day');
        break;
      case 'this_week':
        startDate = now.clone().subtract(1, 'week').startOf('week');
        endDate = now.clone().subtract(1, 'week').endOf('week');
        break;
      case 'this_month':
        startDate = now.clone().subtract(1, 'month').startOf('month');
        endDate = now.clone().subtract(1, 'month').endOf('month');
        break;
      case 'last_30_days':
        startDate = now.clone().subtract(60, 'days').startOf('day');
        endDate = now.clone().subtract(30, 'days').endOf('day');
        break;
      default:
        // For other periods, use same duration before
        const current = this._parsePeriod(period);
        const duration = moment(current.endDate).diff(moment(current.startDate));
        startDate = moment(current.startDate).subtract(duration);
        endDate = moment(current.startDate);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  }

  _calculateSummary(dailyData) {
    if (!dailyData.length) {
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        uniqueCustomers: 0
      };
    }

    return {
      totalOrders: dailyData.reduce((sum, day) => sum + parseInt(day.total_orders), 0),
      totalRevenue: dailyData.reduce((sum, day) => sum + parseFloat(day.total_revenue), 0),
      averageOrderValue: dailyData.reduce((sum, day) => sum + parseFloat(day.average_order_value), 0) / dailyData.length,
      uniqueCustomers: dailyData.reduce((sum, day) => sum + parseInt(day.unique_customers), 0)
    };
  }

  _getSchemaName(tenantId) {
    return `tenant_${tenantId}`;
  }
}

module.exports = AnalyticsService;
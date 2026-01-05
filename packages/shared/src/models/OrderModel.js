const BaseModel = require('./BaseModel');
const { ValidationError, DatabaseError } = require('../errors');
const { ORDER_TYPES, ORDER_STATUS, PAYMENT_STATUS } = require('../constants');
const { generateOrderNumber, calculateTax, calculateDiscount } = require('../utils');

/**
 * Order model for managing restaurant orders
 */
class OrderModel extends BaseModel {
  constructor(dbManager) {
    super(dbManager, 'orders');
  }

  /**
   * Create a new order
   */
  async create(tenantId, orderData) {
    const { 
      outletId, 
      orderType, 
      tableId, 
      customerId, 
      items = [],
      discountRate = 0,
      taxRate = 0
    } = orderData;

    // Validate required fields
    if (!outletId || !orderType || items.length === 0) {
      throw new ValidationError('Outlet ID, order type, and items are required');
    }

    if (!Object.values(ORDER_TYPES).includes(orderType)) {
      throw new ValidationError('Invalid order type');
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discount = calculateDiscount(subtotal, discountRate);
    const taxableAmount = subtotal - discount;
    const tax = calculateTax(taxableAmount, taxRate);
    const total = taxableAmount + tax;

    const orderNumber = generateOrderNumber(outletId);

    const data = {
      outlet_id: outletId,
      order_number: orderNumber,
      table_id: tableId,
      customer_id: customerId,
      order_type: orderType,
      subtotal,
      tax,
      discount,
      total,
      status: ORDER_STATUS.PENDING,
      payment_status: PAYMENT_STATUS.PENDING,
    };

    return await super.create(tenantId, data);
  }

  /**
   * Update order status
   */
  async updateStatus(tenantId, orderId, status) {
    if (!Object.values(ORDER_STATUS).includes(status)) {
      throw new ValidationError('Invalid order status');
    }

    return await this.updateById(tenantId, orderId, { status });
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(tenantId, orderId, paymentStatus) {
    if (!Object.values(PAYMENT_STATUS).includes(paymentStatus)) {
      throw new ValidationError('Invalid payment status');
    }

    return await this.updateById(tenantId, orderId, { payment_status: paymentStatus });
  }

  /**
   * Get orders by outlet
   */
  async findByOutlet(tenantId, outletId, options = {}) {
    return await this.find(tenantId, { outlet_id: outletId }, options);
  }

  /**
   * Get orders by table
   */
  async findByTable(tenantId, tableId, options = {}) {
    return await this.find(tenantId, { table_id: tableId }, options);
  }

  /**
   * Get orders by customer
   */
  async findByCustomer(tenantId, customerId, options = {}) {
    return await this.find(tenantId, { customer_id: customerId }, options);
  }

  /**
   * Get orders by status
   */
  async findByStatus(tenantId, status, options = {}) {
    return await this.find(tenantId, { status }, options);
  }

  /**
   * Get active orders (not completed or cancelled)
   */
  async getActiveOrders(tenantId, outletId = null, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let whereClause = `WHERE status NOT IN ('${ORDER_STATUS.COMPLETED}', '${ORDER_STATUS.CANCELLED}')`;
      let values = [];
      let paramIndex = 1;

      if (outletId) {
        whereClause += ` AND outlet_id = $${paramIndex++}`;
        values.push(outletId);
      }

      const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
      const dataQuery = `
        SELECT * FROM ${this.tableName} 
        ${whereClause}
        ORDER BY created_at ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        this.db.query(tenantId, countQuery, values.slice(0, -2)),
        this.db.query(tenantId, dataQuery, values)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const records = dataResult.rows.map(row => this.mapRowToObject(row));

      return {
        data: records,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      throw new DatabaseError('Failed to get active orders', error.message);
    }
  }

  /**
   * Get order with items
   */
  async findByIdWithItems(tenantId, orderId) {
    try {
      const orderQuery = `SELECT * FROM ${this.tableName} WHERE id = $1`;
      const itemsQuery = `
        SELECT oi.*, mi.name as menu_item_name, mi.description as menu_item_description
        FROM order_items oi
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = $1
        ORDER BY oi.created_at ASC
      `;

      const [orderResult, itemsResult] = await Promise.all([
        this.db.query(tenantId, orderQuery, [orderId]),
        this.db.query(tenantId, itemsQuery, [orderId])
      ]);

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = this.mapRowToObject(orderResult.rows[0]);
      order.items = itemsResult.rows.map(row => ({
        id: row.id,
        menuItemId: row.menu_item_id,
        menuItemName: row.menu_item_name,
        menuItemDescription: row.menu_item_description,
        quantity: row.quantity,
        unitPrice: parseFloat(row.unit_price),
        totalPrice: parseFloat(row.total_price),
        specialInstructions: row.special_instructions,
        status: row.status,
        createdAt: row.created_at,
      }));

      return order;
    } catch (error) {
      throw new DatabaseError('Failed to get order with items', error.message);
    }
  }

  /**
   * Calculate order totals
   */
  calculateTotals(items, discountRate = 0, taxRate = 0) {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const discount = calculateDiscount(subtotal, discountRate);
    const taxableAmount = subtotal - discount;
    const tax = calculateTax(taxableAmount, taxRate);
    const total = taxableAmount + tax;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }

  /**
   * Get sales summary for date range
   */
  async getSalesSummary(tenantId, outletId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_orders,
          SUM(total) as total_revenue,
          SUM(tax) as total_tax,
          SUM(discount) as total_discount,
          AVG(total) as average_order_value,
          COUNT(CASE WHEN order_type = 'DINE_IN' THEN 1 END) as dine_in_orders,
          COUNT(CASE WHEN order_type = 'TAKEAWAY' THEN 1 END) as takeaway_orders,
          COUNT(CASE WHEN order_type = 'DELIVERY' THEN 1 END) as delivery_orders
        FROM ${this.tableName}
        WHERE outlet_id = $1 
        AND status = '${ORDER_STATUS.COMPLETED}'
        AND created_at >= $2 
        AND created_at <= $3
      `;

      const result = await this.db.query(tenantId, query, [outletId, startDate, endDate]);
      const row = result.rows[0];

      return {
        totalOrders: parseInt(row.total_orders) || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalTax: parseFloat(row.total_tax) || 0,
        totalDiscount: parseFloat(row.total_discount) || 0,
        averageOrderValue: parseFloat(row.average_order_value) || 0,
        ordersByType: {
          dineIn: parseInt(row.dine_in_orders) || 0,
          takeaway: parseInt(row.takeaway_orders) || 0,
          delivery: parseInt(row.delivery_orders) || 0,
        },
      };
    } catch (error) {
      throw new DatabaseError('Failed to get sales summary', error.message);
    }
  }

  /**
   * Map database row to object
   */
  mapRowToObject(row) {
    if (!row) return null;
    
    const obj = super.mapRowToObject(row);
    
    // Convert numeric fields
    if (obj.subtotal) obj.subtotal = parseFloat(obj.subtotal);
    if (obj.tax) obj.tax = parseFloat(obj.tax);
    if (obj.discount) obj.discount = parseFloat(obj.discount);
    if (obj.total) obj.total = parseFloat(obj.total);
    
    return obj;
  }
}

module.exports = OrderModel;
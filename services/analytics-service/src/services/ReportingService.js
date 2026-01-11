const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs').promises;
const path = require('path');
const cron = require('node-cron');
const moment = require('moment');

class ReportingService {
  constructor(dbPool, analyticsService) {
    this.db = dbPool;
    this.analyticsService = analyticsService;
    this.scheduledReports = new Map();
    this.reportsDir = path.join(__dirname, '../../reports');
    this._ensureReportsDirectory();
  }

  async _ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Error creating reports directory:', error);
    }
  }

  async generateReport(tenantId, reportConfig) {
    const { type, format, period, outletId, includeCharts = false } = reportConfig;
    
    // Get data based on report type
    let reportData;
    switch (type) {
      case 'sales':
        reportData = await this.analyticsService.generateSalesReport(tenantId, period, outletId);
        break;
      case 'performance':
        reportData = await this.analyticsService.getPerformanceMetrics(tenantId, outletId, period);
        break;
      case 'inventory':
        reportData = await this.analyticsService.getInventoryAnalytics(tenantId, outletId);
        break;
      case 'customer':
        reportData = await this.analyticsService.getCustomerAnalytics(tenantId, period, outletId);
        break;
      default:
        throw new Error('Invalid report type');
    }

    // Generate report in requested format
    const fileName = this._generateFileName(tenantId, type, format, period);
    const filePath = path.join(this.reportsDir, fileName);

    switch (format.toLowerCase()) {
      case 'pdf':
        await this._generatePDFReport(reportData, filePath, type, includeCharts);
        break;
      case 'excel':
      case 'xlsx':
        await this._generateExcelReport(reportData, filePath, type);
        break;
      case 'csv':
        await this._generateCSVReport(reportData, filePath, type);
        break;
      default:
        throw new Error('Unsupported report format');
    }

    // Store report metadata
    await this._storeReportMetadata(tenantId, {
      fileName,
      filePath,
      type,
      format,
      period,
      outletId,
      generatedAt: new Date(),
      size: (await fs.stat(filePath)).size
    });

    return {
      fileName,
      filePath,
      downloadUrl: `/api/reports/download/${fileName}`,
      size: (await fs.stat(filePath)).size
    };
  }

  async _generatePDFReport(data, filePath, reportType, includeCharts) {
    const doc = new PDFDocument({ margin: 50 });
    const stream = require('fs').createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('Restaurant Analytics Report', { align: 'center' });
    doc.fontSize(14).text(`Report Type: ${reportType.toUpperCase()}`, { align: 'center' });
    doc.fontSize(12).text(`Generated: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'center' });
    doc.moveDown(2);

    switch (reportType) {
      case 'sales':
        this._addSalesDataToPDF(doc, data);
        break;
      case 'performance':
        this._addPerformanceDataToPDF(doc, data);
        break;
      case 'inventory':
        this._addInventoryDataToPDF(doc, data);
        break;
      case 'customer':
        this._addCustomerDataToPDF(doc, data);
        break;
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

  async _generateExcelReport(data, filePath, reportType) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Restaurant Management System';
    workbook.created = new Date();

    switch (reportType) {
      case 'sales':
        this._addSalesDataToExcel(workbook, data);
        break;
      case 'performance':
        this._addPerformanceDataToExcel(workbook, data);
        break;
      case 'inventory':
        this._addInventoryDataToExcel(workbook, data);
        break;
      case 'customer':
        this._addCustomerDataToExcel(workbook, data);
        break;
    }

    await workbook.xlsx.writeFile(filePath);
  }

  async _generateCSVReport(data, filePath, reportType) {
    let csvData, headers;

    switch (reportType) {
      case 'sales':
        headers = [
          { id: 'date', title: 'Date' },
          { id: 'total_orders', title: 'Total Orders' },
          { id: 'total_revenue', title: 'Total Revenue' },
          { id: 'average_order_value', title: 'Average Order Value' },
          { id: 'unique_customers', title: 'Unique Customers' }
        ];
        csvData = data.dailyData;
        break;
      case 'performance':
        headers = [
          { id: 'name', title: 'Item Name' },
          { id: 'category', title: 'Category' },
          { id: 'total_quantity', title: 'Total Quantity' },
          { id: 'total_revenue', title: 'Total Revenue' },
          { id: 'order_count', title: 'Order Count' }
        ];
        csvData = data.topSellingItems;
        break;
      case 'inventory':
        headers = [
          { id: 'name', title: 'Item Name' },
          { id: 'category', title: 'Category' },
          { id: 'current_stock', title: 'Current Stock' },
          { id: 'minimum_stock', title: 'Minimum Stock' },
          { id: 'shortage_amount', title: 'Shortage Amount' }
        ];
        csvData = data.lowStockItems;
        break;
      case 'customer':
        headers = [
          { id: 'customer_id', title: 'Customer ID' },
          { id: 'visit_count', title: 'Visit Count' },
          { id: 'total_spent', title: 'Total Spent' },
          { id: 'avg_order_value', title: 'Average Order Value' }
        ];
        csvData = data.topCustomers;
        break;
    }

    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(csvData);
  }

  // PDF helper methods
  _addSalesDataToPDF(doc, data) {
    doc.fontSize(16).text('Sales Summary', { underline: true });
    doc.moveDown();

    if (data.summary) {
      doc.fontSize(12)
        .text(`Total Orders: ${data.summary.totalOrders}`)
        .text(`Total Revenue: $${data.summary.totalRevenue.toFixed(2)}`)
        .text(`Average Order Value: $${data.summary.averageOrderValue.toFixed(2)}`)
        .text(`Unique Customers: ${data.summary.uniqueCustomers}`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Daily Breakdown', { underline: true });
    doc.moveDown();

    // Table headers
    const startX = 50;
    let currentY = doc.y;
    doc.fontSize(10)
      .text('Date', startX, currentY)
      .text('Orders', startX + 100, currentY)
      .text('Revenue', startX + 160, currentY)
      .text('Avg Order', startX + 220, currentY)
      .text('Customers', startX + 280, currentY);

    currentY += 20;
    doc.moveTo(startX, currentY).lineTo(startX + 330, currentY).stroke();
    currentY += 10;

    // Table data
    data.dailyData.forEach(day => {
      doc.text(moment(day.date).format('MM/DD'), startX, currentY)
        .text(day.total_orders.toString(), startX + 100, currentY)
        .text(`$${parseFloat(day.total_revenue).toFixed(2)}`, startX + 160, currentY)
        .text(`$${parseFloat(day.average_order_value).toFixed(2)}`, startX + 220, currentY)
        .text(day.unique_customers.toString(), startX + 280, currentY);
      currentY += 15;
    });
  }

  _addPerformanceDataToPDF(doc, data) {
    doc.fontSize(16).text('Performance Metrics', { underline: true });
    doc.moveDown();

    // Top selling items
    doc.fontSize(14).text('Top Selling Items', { underline: true });
    doc.moveDown();

    data.topSellingItems.slice(0, 10).forEach((item, index) => {
      doc.fontSize(10)
        .text(`${index + 1}. ${item.name} - ${item.total_quantity} sold, $${parseFloat(item.total_revenue).toFixed(2)} revenue`);
    });

    doc.moveDown();

    // Order type distribution
    if (data.orderTypeDistribution) {
      doc.fontSize(14).text('Order Type Distribution', { underline: true });
      doc.moveDown();

      data.orderTypeDistribution.forEach(type => {
        doc.fontSize(10)
          .text(`${type.order_type}: ${type.count} orders, $${parseFloat(type.revenue).toFixed(2)} revenue`);
      });
    }
  }

  _addInventoryDataToPDF(doc, data) {
    doc.fontSize(16).text('Inventory Analysis', { underline: true });
    doc.moveDown();

    if (data.summary) {
      doc.fontSize(12)
        .text(`Low Stock Items: ${data.summary.totalLowStockItems}`)
        .text(`Total Shortage Value: $${data.summary.totalShortageValue.toFixed(2)}`)
        .text(`Critical Items (< 7 days): ${data.summary.criticalItems}`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Low Stock Items', { underline: true });
    doc.moveDown();

    data.lowStockItems.forEach(item => {
      doc.fontSize(10)
        .text(`${item.name} - Current: ${item.current_stock} ${item.unit}, Min: ${item.minimum_stock} ${item.unit}`);
    });
  }

  _addCustomerDataToPDF(doc, data) {
    doc.fontSize(16).text('Customer Analytics', { underline: true });
    doc.moveDown();

    if (data.summary) {
      doc.fontSize(12)
        .text(`Total Customers: ${data.summary.totalCustomers}`)
        .text(`Average Order Value: $${data.summary.averageOrderValue.toFixed(2)}`)
        .text(`Repeat Customers: ${data.summary.repeatCustomers}`);
    }

    doc.moveDown();
    doc.fontSize(14).text('Top Customers', { underline: true });
    doc.moveDown();

    data.topCustomers.slice(0, 10).forEach((customer, index) => {
      doc.fontSize(10)
        .text(`${index + 1}. Customer ${customer.customer_id} - ${customer.visit_count} visits, $${parseFloat(customer.total_spent).toFixed(2)} spent`);
    });
  }

  // Excel helper methods
  _addSalesDataToExcel(workbook, data) {
    const worksheet = workbook.addWorksheet('Sales Report');
    
    // Summary section
    worksheet.addRow(['Sales Summary']);
    worksheet.addRow(['Total Orders', data.summary?.totalOrders || 0]);
    worksheet.addRow(['Total Revenue', data.summary?.totalRevenue || 0]);
    worksheet.addRow(['Average Order Value', data.summary?.averageOrderValue || 0]);
    worksheet.addRow(['Unique Customers', data.summary?.uniqueCustomers || 0]);
    worksheet.addRow([]);

    // Daily data
    worksheet.addRow(['Date', 'Total Orders', 'Total Revenue', 'Average Order Value', 'Unique Customers']);
    data.dailyData.forEach(day => {
      worksheet.addRow([
        moment(day.date).format('YYYY-MM-DD'),
        parseInt(day.total_orders),
        parseFloat(day.total_revenue),
        parseFloat(day.average_order_value),
        parseInt(day.unique_customers)
      ]);
    });

    // Style the header
    worksheet.getRow(6).font = { bold: true };
  }

  _addPerformanceDataToExcel(workbook, data) {
    const worksheet = workbook.addWorksheet('Performance Report');
    
    // Top selling items
    worksheet.addRow(['Top Selling Items']);
    worksheet.addRow(['Name', 'Category', 'Quantity Sold', 'Revenue', 'Order Count']);
    data.topSellingItems.forEach(item => {
      worksheet.addRow([
        item.name,
        item.category,
        parseInt(item.total_quantity),
        parseFloat(item.total_revenue),
        parseInt(item.order_count)
      ]);
    });

    worksheet.getRow(2).font = { bold: true };
  }

  _addInventoryDataToExcel(workbook, data) {
    const worksheet = workbook.addWorksheet('Inventory Report');
    
    worksheet.addRow(['Low Stock Items']);
    worksheet.addRow(['Name', 'Category', 'Current Stock', 'Minimum Stock', 'Unit', 'Shortage Amount']);
    data.lowStockItems.forEach(item => {
      worksheet.addRow([
        item.name,
        item.category,
        parseFloat(item.current_stock),
        parseFloat(item.minimum_stock),
        item.unit,
        parseFloat(item.shortage_amount || 0)
      ]);
    });

    worksheet.getRow(2).font = { bold: true };
  }

  _addCustomerDataToExcel(workbook, data) {
    const worksheet = workbook.addWorksheet('Customer Report');
    
    worksheet.addRow(['Top Customers']);
    worksheet.addRow(['Customer ID', 'Visit Count', 'Total Spent', 'Average Order Value']);
    data.topCustomers.forEach(customer => {
      worksheet.addRow([
        customer.customer_id,
        parseInt(customer.visit_count),
        parseFloat(customer.total_spent),
        parseFloat(customer.avg_order_value)
      ]);
    });

    worksheet.getRow(2).font = { bold: true };
  }

  async scheduleReport(tenantId, scheduleConfig) {
    const { name, reportConfig, cronExpression, email } = scheduleConfig;
    const scheduleId = `${tenantId}_${name}_${Date.now()}`;

    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Store schedule in database
    await this._storeScheduledReport(tenantId, {
      scheduleId,
      name,
      reportConfig,
      cronExpression,
      email,
      isActive: true,
      createdAt: new Date()
    });

    // Create cron job
    const task = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Generating scheduled report: ${name} for tenant: ${tenantId}`);
        const report = await this.generateReport(tenantId, reportConfig);
        
        // TODO: Send email with report attachment
        console.log(`Scheduled report generated: ${report.fileName}`);
      } catch (error) {
        console.error(`Error generating scheduled report ${name}:`, error);
      }
    }, {
      scheduled: false
    });

    this.scheduledReports.set(scheduleId, task);
    task.start();

    return { scheduleId, message: 'Report scheduled successfully' };
  }

  async getScheduledReports(tenantId) {
    const query = `
      SELECT * FROM ${this._getSchemaName(tenantId)}.scheduled_reports
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  async deleteScheduledReport(tenantId, scheduleId) {
    // Stop cron job
    const task = this.scheduledReports.get(scheduleId);
    if (task) {
      task.stop();
      this.scheduledReports.delete(scheduleId);
    }

    // Update database
    const query = `
      UPDATE ${this._getSchemaName(tenantId)}.scheduled_reports
      SET is_active = false, updated_at = NOW()
      WHERE schedule_id = $1
    `;

    await this.db.query(query, [scheduleId]);
    return { message: 'Scheduled report deleted successfully' };
  }

  async getReportHistory(tenantId, limit = 50) {
    const query = `
      SELECT * FROM ${this._getSchemaName(tenantId)}.report_history
      ORDER BY generated_at DESC
      LIMIT $1
    `;

    const result = await this.db.query(query, [limit]);
    return result.rows;
  }

  async downloadReport(fileName) {
    const filePath = path.join(this.reportsDir, fileName);
    
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      throw new Error('Report file not found');
    }
  }

  // Helper methods
  _generateFileName(tenantId, type, format, period) {
    const timestamp = moment().format('YYYYMMDD_HHmmss');
    return `${tenantId}_${type}_report_${period}_${timestamp}.${format}`;
  }

  async _storeReportMetadata(tenantId, metadata) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.report_history
      (file_name, file_path, report_type, format, period, outlet_id, generated_at, file_size)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await this.db.query(query, [
      metadata.fileName,
      metadata.filePath,
      metadata.type,
      metadata.format,
      metadata.period,
      metadata.outletId,
      metadata.generatedAt,
      metadata.size
    ]);
  }

  async _storeScheduledReport(tenantId, scheduleData) {
    const query = `
      INSERT INTO ${this._getSchemaName(tenantId)}.scheduled_reports
      (schedule_id, name, report_config, cron_expression, email, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      scheduleData.scheduleId,
      scheduleData.name,
      JSON.stringify(scheduleData.reportConfig),
      scheduleData.cronExpression,
      scheduleData.email,
      scheduleData.isActive,
      scheduleData.createdAt
    ]);
  }

  _getSchemaName(tenantId) {
    // Replace hyphens with underscores to make valid PostgreSQL identifiers
    return `tenant_${tenantId.replace(/-/g, '_')}`;
  }
}

module.exports = ReportingService;
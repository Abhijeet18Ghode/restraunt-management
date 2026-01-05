const axios = require('axios');
const logger = require('../utils/logger');

class AccountingService {
  constructor() {
    this.integrations = {
      quickbooks: {
        name: 'QuickBooks',
        baseUrl: process.env.QUICKBOOKS_API_URL || 'https://sandbox-quickbooks.api.intuit.com',
        clientId: process.env.QUICKBOOKS_CLIENT_ID,
        clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET,
        accessToken: process.env.QUICKBOOKS_ACCESS_TOKEN,
        companyId: process.env.QUICKBOOKS_COMPANY_ID,
        enabled: process.env.QUICKBOOKS_ENABLED === 'true'
      },
      xero: {
        name: 'Xero',
        baseUrl: process.env.XERO_API_URL || 'https://api.xero.com/api.xro/2.0',
        clientId: process.env.XERO_CLIENT_ID,
        clientSecret: process.env.XERO_CLIENT_SECRET,
        accessToken: process.env.XERO_ACCESS_TOKEN,
        tenantId: process.env.XERO_TENANT_ID,
        enabled: process.env.XERO_ENABLED === 'true'
      },
      sage: {
        name: 'Sage',
        baseUrl: process.env.SAGE_API_URL || 'https://api.sage.com/v3.1',
        apiKey: process.env.SAGE_API_KEY,
        subscriptionKey: process.env.SAGE_SUBSCRIPTION_KEY,
        enabled: process.env.SAGE_ENABLED === 'true'
      }
    };
  }

  async exportSalesData(integrationId, salesData, dateRange) {
    try {
      const integration = this.integrations[integrationId];
      if (!integration || !integration.enabled) {
        throw new Error(`Accounting integration ${integrationId} is not available`);
      }

      const transformedData = this.transformSalesData(integrationId, salesData);
      
      const response = await this.sendToAccounting(integrationId, transformedData);

      logger.info(`Sales data exported to ${integration.name}:`, {
        integrationId,
        recordCount: salesData.length,
        dateRange,
        status: response.status
      });

      return {
        success: true,
        integrationId,
        recordCount: salesData.length,
        exportId: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      logger.error(`Failed to export sales data to ${integrationId}:`, error);
      return {
        success: false,
        integrationId,
        error: error.message
      };
    }
  }

  async exportExpenseData(integrationId, expenseData, dateRange) {
    try {
      const integration = this.integrations[integrationId];
      if (!integration || !integration.enabled) {
        throw new Error(`Accounting integration ${integrationId} is not available`);
      }

      const transformedData = this.transformExpenseData(integrationId, expenseData);
      
      const response = await this.sendExpensesToAccounting(integrationId, transformedData);

      logger.info(`Expense data exported to ${integration.name}:`, {
        integrationId,
        recordCount: expenseData.length,
        dateRange,
        status: response.status
      });

      return {
        success: true,
        integrationId,
        recordCount: expenseData.length,
        exportId: response.data.id,
        status: response.data.status
      };
    } catch (error) {
      logger.error(`Failed to export expense data to ${integrationId}:`, error);
      return {
        success: false,
        integrationId,
        error: error.message
      };
    }
  }

  async createCustomer(integrationId, customerData) {
    try {
      const integration = this.integrations[integrationId];
      if (!integration || !integration.enabled) {
        throw new Error(`Accounting integration ${integrationId} is not available`);
      }

      const transformedCustomer = this.transformCustomerData(integrationId, customerData);
      
      const response = await this.sendCustomerToAccounting(integrationId, transformedCustomer);

      logger.info(`Customer created in ${integration.name}:`, {
        integrationId,
        customerId: response.data.id,
        customerName: customerData.name
      });

      return {
        success: true,
        integrationId,
        accountingCustomerId: response.data.id,
        customerName: customerData.name
      };
    } catch (error) {
      logger.error(`Failed to create customer in ${integrationId}:`, error);
      return {
        success: false,
        integrationId,
        error: error.message
      };
    }
  }

  async sendToAccounting(integrationId, data) {
    const integration = this.integrations[integrationId];
    
    switch (integrationId) {
      case 'quickbooks':
        return await axios.post(
          `${integration.baseUrl}/v3/company/${integration.companyId}/salesreceipt`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'xero':
        return await axios.post(
          `${integration.baseUrl}/Invoices`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Xero-tenant-id': integration.tenantId,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'sage':
        return await axios.post(
          `${integration.baseUrl}/sales_invoices`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'X-Site': integration.subscriptionKey,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      default:
        throw new Error(`Unsupported accounting integration: ${integrationId}`);
    }
  }

  async sendExpensesToAccounting(integrationId, data) {
    const integration = this.integrations[integrationId];
    
    switch (integrationId) {
      case 'quickbooks':
        return await axios.post(
          `${integration.baseUrl}/v3/company/${integration.companyId}/purchase`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'xero':
        return await axios.post(
          `${integration.baseUrl}/Bills`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Xero-tenant-id': integration.tenantId,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'sage':
        return await axios.post(
          `${integration.baseUrl}/purchase_invoices`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'X-Site': integration.subscriptionKey,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      default:
        throw new Error(`Unsupported accounting integration: ${integrationId}`);
    }
  }

  async sendCustomerToAccounting(integrationId, data) {
    const integration = this.integrations[integrationId];
    
    switch (integrationId) {
      case 'quickbooks':
        return await axios.post(
          `${integration.baseUrl}/v3/company/${integration.companyId}/customer`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'xero':
        return await axios.post(
          `${integration.baseUrl}/Contacts`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.accessToken}`,
              'Xero-tenant-id': integration.tenantId,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      case 'sage':
        return await axios.post(
          `${integration.baseUrl}/contacts`,
          data,
          {
            headers: {
              'Authorization': `Bearer ${integration.apiKey}`,
              'X-Site': integration.subscriptionKey,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          }
        );
      
      default:
        throw new Error(`Unsupported accounting integration: ${integrationId}`);
    }
  }

  transformSalesData(integrationId, salesData) {
    switch (integrationId) {
      case 'quickbooks':
        return {
          SalesReceipt: salesData.map(sale => ({
            Line: sale.items.map(item => ({
              Amount: item.total,
              DetailType: 'SalesItemLineDetail',
              SalesItemLineDetail: {
                ItemRef: { value: item.id, name: item.name },
                Qty: item.quantity,
                UnitPrice: item.price
              }
            })),
            CustomerRef: { value: sale.customerId },
            TotalAmt: sale.total,
            TxnDate: sale.date
          }))
        };
      
      case 'xero':
        return {
          Invoices: salesData.map(sale => ({
            Type: 'ACCREC',
            Contact: { ContactID: sale.customerId },
            Date: sale.date,
            DueDate: sale.date,
            LineItems: sale.items.map(item => ({
              Description: item.name,
              Quantity: item.quantity,
              UnitAmount: item.price,
              LineAmount: item.total
            }))
          }))
        };
      
      case 'sage':
        return salesData.map(sale => ({
          contact_id: sale.customerId,
          date: sale.date,
          invoice_lines: sale.items.map(item => ({
            description: item.name,
            quantity: item.quantity,
            unit_price: item.price,
            total_amount: item.total
          })),
          total_amount: sale.total
        }));
      
      default:
        return salesData;
    }
  }

  transformExpenseData(integrationId, expenseData) {
    switch (integrationId) {
      case 'quickbooks':
        return {
          Purchase: expenseData.map(expense => ({
            Line: [{
              Amount: expense.amount,
              DetailType: 'AccountBasedExpenseLineDetail',
              AccountBasedExpenseLineDetail: {
                AccountRef: { value: expense.accountId }
              }
            }],
            EntityRef: { value: expense.vendorId },
            TotalAmt: expense.amount,
            TxnDate: expense.date
          }))
        };
      
      case 'xero':
        return {
          Bills: expenseData.map(expense => ({
            Type: 'ACCPAY',
            Contact: { ContactID: expense.vendorId },
            Date: expense.date,
            DueDate: expense.dueDate,
            LineItems: [{
              Description: expense.description,
              LineAmount: expense.amount
            }]
          }))
        };
      
      case 'sage':
        return expenseData.map(expense => ({
          contact_id: expense.vendorId,
          date: expense.date,
          due_date: expense.dueDate,
          invoice_lines: [{
            description: expense.description,
            total_amount: expense.amount
          }],
          total_amount: expense.amount
        }));
      
      default:
        return expenseData;
    }
  }

  transformCustomerData(integrationId, customerData) {
    switch (integrationId) {
      case 'quickbooks':
        return {
          Customer: {
            Name: customerData.name,
            CompanyName: customerData.company,
            BillAddr: {
              Line1: customerData.address.street,
              City: customerData.address.city,
              CountrySubDivisionCode: customerData.address.state,
              PostalCode: customerData.address.zipCode,
              Country: customerData.address.country
            },
            PrimaryPhone: { FreeFormNumber: customerData.phone },
            PrimaryEmailAddr: { Address: customerData.email }
          }
        };
      
      case 'xero':
        return {
          Contacts: [{
            Name: customerData.name,
            EmailAddress: customerData.email,
            Phones: [{ PhoneType: 'DEFAULT', PhoneNumber: customerData.phone }],
            Addresses: [{
              AddressType: 'STREET',
              AddressLine1: customerData.address.street,
              City: customerData.address.city,
              Region: customerData.address.state,
              PostalCode: customerData.address.zipCode,
              Country: customerData.address.country
            }]
          }]
        };
      
      case 'sage':
        return {
          name: customerData.name,
          email: customerData.email,
          telephone: customerData.phone,
          address_line_1: customerData.address.street,
          city: customerData.address.city,
          region: customerData.address.state,
          postal_code: customerData.address.zipCode,
          country_id: customerData.address.country
        };
      
      default:
        return customerData;
    }
  }

  getAvailableIntegrations() {
    return Object.entries(this.integrations)
      .filter(([_, integration]) => integration.enabled)
      .map(([id, integration]) => ({
        id,
        name: integration.name,
        enabled: integration.enabled
      }));
  }
}

module.exports = AccountingService;
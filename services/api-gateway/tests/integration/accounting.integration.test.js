const AccountingService = require('../../src/services/AccountingService');
const axios = require('axios');

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('Accounting Integration Tests', () => {
  let accountingService;

  beforeEach(() => {
    accountingService = new AccountingService();
    jest.clearAllMocks();
  });

  describe('QuickBooks Integration', () => {
    const mockSalesData = [
      {
        customerId: 'customer-123',
        date: '2024-01-05',
        items: [
          {
            id: 'item-1',
            name: 'Burger',
            quantity: 2,
            price: 12.99,
            total: 25.98
          }
        ],
        total: 25.98
      }
    ];

    test('should export sales data to QuickBooks successfully', async () => {
      const mockResponse = {
        data: {
          id: 'qb-export-123',
          status: 'completed'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.exportSalesData('quickbooks', mockSalesData, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.success).toBe(true);
      expect(result.integrationId).toBe('quickbooks');
      expect(result.recordCount).toBe(1);
      expect(result.exportId).toBe('qb-export-123');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/salesreceipt'),
        expect.objectContaining({
          SalesReceipt: expect.arrayContaining([
            expect.objectContaining({
              CustomerRef: { value: 'customer-123' },
              TotalAmt: 25.98,
              TxnDate: '2024-01-05'
            })
          ])
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    test('should export expense data to QuickBooks successfully', async () => {
      const mockExpenseData = [
        {
          vendorId: 'vendor-456',
          date: '2024-01-05',
          amount: 150.00,
          accountId: 'expense-account-1',
          description: 'Food supplies'
        }
      ];

      const mockResponse = {
        data: {
          id: 'qb-expense-export-456',
          status: 'completed'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.exportExpenseData('quickbooks', mockExpenseData, {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/purchase'),
        expect.objectContaining({
          Purchase: expect.arrayContaining([
            expect.objectContaining({
              EntityRef: { value: 'vendor-456' },
              TotalAmt: 150.00,
              TxnDate: '2024-01-05'
            })
          ])
        }),
        expect.any(Object)
      );
    });

    test('should create customer in QuickBooks successfully', async () => {
      const mockCustomerData = {
        name: 'John Doe',
        company: 'Doe Enterprises',
        email: 'john@example.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      const mockResponse = {
        data: {
          id: 'qb-customer-789'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.createCustomer('quickbooks', mockCustomerData);

      expect(result.success).toBe(true);
      expect(result.accountingCustomerId).toBe('qb-customer-789');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/customer'),
        expect.objectContaining({
          Customer: expect.objectContaining({
            Name: 'John Doe',
            CompanyName: 'Doe Enterprises',
            PrimaryEmailAddr: { Address: 'john@example.com' }
          })
        }),
        expect.any(Object)
      );
    });

    test('should handle QuickBooks authentication errors', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid access token' }
        }
      });

      const result = await accountingService.exportSalesData('quickbooks', mockSalesData);

      expect(result.success).toBe(false);
      expect(result.integrationId).toBe('quickbooks');
    });
  });

  describe('Xero Integration', () => {
    const mockSalesData = [
      {
        customerId: 'xero-customer-123',
        date: '2024-01-05',
        items: [
          {
            name: 'Pizza',
            quantity: 1,
            price: 18.99,
            total: 18.99
          }
        ],
        total: 18.99
      }
    ];

    test('should export sales data to Xero successfully', async () => {
      const mockResponse = {
        data: {
          id: 'xero-invoice-123',
          status: 'completed'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.exportSalesData('xero', mockSalesData);

      expect(result.success).toBe(true);
      expect(result.integrationId).toBe('xero');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/Invoices'),
        expect.objectContaining({
          Invoices: expect.arrayContaining([
            expect.objectContaining({
              Type: 'ACCREC',
              Contact: { ContactID: 'xero-customer-123' },
              Date: '2024-01-05'
            })
          ])
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Xero-tenant-id': expect.any(String)
          })
        })
      );
    });

    test('should create customer in Xero successfully', async () => {
      const mockCustomerData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1555666777',
        address: {
          street: '456 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zipCode: '62701',
          country: 'US'
        }
      };

      const mockResponse = {
        data: {
          id: 'xero-contact-456'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.createCustomer('xero', mockCustomerData);

      expect(result.success).toBe(true);
      expect(result.accountingCustomerId).toBe('xero-contact-456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/Contacts'),
        expect.objectContaining({
          Contacts: expect.arrayContaining([
            expect.objectContaining({
              Name: 'Jane Smith',
              EmailAddress: 'jane@example.com'
            })
          ])
        }),
        expect.any(Object)
      );
    });

    test('should handle Xero tenant ID missing error', async () => {
      // Temporarily remove tenant ID
      const originalTenantId = accountingService.integrations.xero.tenantId;
      accountingService.integrations.xero.tenantId = null;

      const result = await accountingService.exportSalesData('xero', mockSalesData);

      expect(result.success).toBe(false);

      // Restore tenant ID
      accountingService.integrations.xero.tenantId = originalTenantId;
    });
  });

  describe('Sage Integration', () => {
    const mockSalesData = [
      {
        customerId: 'sage-customer-789',
        date: '2024-01-05',
        items: [
          {
            name: 'Salad',
            quantity: 2,
            price: 8.99,
            total: 17.98
          }
        ],
        total: 17.98
      }
    ];

    test('should export sales data to Sage successfully', async () => {
      const mockResponse = {
        data: {
          id: 'sage-invoice-789',
          status: 'completed'
        }
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await accountingService.exportSalesData('sage', mockSalesData);

      expect(result.success).toBe(true);
      expect(result.integrationId).toBe('sage');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/sales_invoices'),
        expect.arrayContaining([
          expect.objectContaining({
            contact_id: 'sage-customer-789',
            date: '2024-01-05',
            total_amount: 17.98
          })
        ]),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'X-Site': expect.any(String)
          })
        })
      );
    });

    test('should handle Sage API key missing error', async () => {
      // Temporarily remove API key
      const originalApiKey = accountingService.integrations.sage.apiKey;
      accountingService.integrations.sage.apiKey = null;

      const result = await accountingService.exportSalesData('sage', mockSalesData);

      expect(result.success).toBe(false);

      // Restore API key
      accountingService.integrations.sage.apiKey = originalApiKey;
    });
  });

  describe('Data Transformation', () => {
    test('should transform sales data correctly for different platforms', () => {
      const salesData = [
        {
          customerId: 'customer-123',
          date: '2024-01-05',
          items: [
            {
              id: 'item-1',
              name: 'Test Item',
              quantity: 2,
              price: 10.00,
              total: 20.00
            }
          ],
          total: 20.00
        }
      ];

      // Test QuickBooks transformation
      const qbData = accountingService.transformSalesData('quickbooks', salesData);
      expect(qbData.SalesReceipt).toHaveLength(1);
      expect(qbData.SalesReceipt[0].CustomerRef.value).toBe('customer-123');

      // Test Xero transformation
      const xeroData = accountingService.transformSalesData('xero', salesData);
      expect(xeroData.Invoices).toHaveLength(1);
      expect(xeroData.Invoices[0].Type).toBe('ACCREC');
      expect(xeroData.Invoices[0].Contact.ContactID).toBe('customer-123');

      // Test Sage transformation
      const sageData = accountingService.transformSalesData('sage', salesData);
      expect(sageData).toHaveLength(1);
      expect(sageData[0].contact_id).toBe('customer-123');
      expect(sageData[0].total_amount).toBe(20.00);
    });

    test('should transform expense data correctly for different platforms', () => {
      const expenseData = [
        {
          vendorId: 'vendor-456',
          date: '2024-01-05',
          dueDate: '2024-01-20',
          amount: 100.00,
          accountId: 'expense-account-1',
          description: 'Office supplies'
        }
      ];

      // Test QuickBooks transformation
      const qbData = accountingService.transformExpenseData('quickbooks', expenseData);
      expect(qbData.Purchase).toHaveLength(1);
      expect(qbData.Purchase[0].EntityRef.value).toBe('vendor-456');

      // Test Xero transformation
      const xeroData = accountingService.transformExpenseData('xero', expenseData);
      expect(xeroData.Bills).toHaveLength(1);
      expect(xeroData.Bills[0].Type).toBe('ACCPAY');

      // Test Sage transformation
      const sageData = accountingService.transformExpenseData('sage', expenseData);
      expect(sageData).toHaveLength(1);
      expect(sageData[0].contact_id).toBe('vendor-456');
    });
  });

  describe('Integration Management', () => {
    test('should get available integrations correctly', () => {
      // Mock environment variables
      process.env.QUICKBOOKS_ENABLED = 'true';
      process.env.XERO_ENABLED = 'true';
      process.env.SAGE_ENABLED = 'false';

      const service = new AccountingService();
      const integrations = service.getAvailableIntegrations();

      expect(integrations).toHaveLength(2);
      expect(integrations.map(i => i.id)).toContain('quickbooks');
      expect(integrations.map(i => i.id)).toContain('xero');
      expect(integrations.map(i => i.id)).not.toContain('sage');
    });

    test('should handle disabled integration gracefully', async () => {
      // Disable QuickBooks
      accountingService.integrations.quickbooks.enabled = false;

      const result = await accountingService.exportSalesData('quickbooks', []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    test('should handle unsupported integration', async () => {
      const result = await accountingService.exportSalesData('unsupported-system', []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle network timeouts', async () => {
      mockedAxios.post.mockRejectedValue(new Error('timeout of 15000ms exceeded'));

      const result = await accountingService.exportSalesData('quickbooks', []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should handle API rate limiting', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 429,
          data: { error: 'Rate limit exceeded' }
        }
      });

      const result = await accountingService.exportSalesData('xero', []);

      expect(result.success).toBe(false);
    });

    test('should handle invalid data format', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Invalid data format' }
        }
      });

      const result = await accountingService.exportSalesData('sage', []);

      expect(result.success).toBe(false);
    });
  });
});
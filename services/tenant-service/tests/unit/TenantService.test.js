const TenantService = require('../../src/services/TenantService');
const { 
  ValidationError, 
  TenantNotFoundError, 
  DatabaseError 
} = require('@rms/shared');

describe('TenantService Unit Tests', () => {
  let tenantService;
  let mockDb;

  beforeEach(() => {
    mockDb = {
      getConnection: jest.fn(),
      query: jest.fn(),
      systemQuery: jest.fn(),
      createTenantSchema: jest.fn(),
      dropTenantSchema: jest.fn(),
    };
    tenantService = new TenantService(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTenant', () => {
    const validTenantData = {
      businessName: 'Test Restaurant',
      contactInfo: {
        email: 'test@restaurant.com',
        phone: '+1234567890',
        address: {
          street: '123 Main St',
          city: 'Test City',
          state: 'Test State',
          country: 'Test Country',
          zipCode: '12345'
        }
      },
      subscriptionPlan: 'BASIC'
    };

    it('should create a tenant successfully', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockDb.getConnection.mockResolvedValue(mockClient);
      mockDb.createTenantSchema.mockResolvedValue('tenant_test_schema');

      const result = await tenantService.createTenant(validTenantData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Tenant created successfully');
      expect(result.data).toHaveProperty('id');
      expect(result.data.businessName).toBe(validTenantData.businessName);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should throw ValidationError for invalid subscription plan', async () => {
      const invalidData = {
        ...validTenantData,
        subscriptionPlan: 'INVALID_PLAN'
      };

      await expect(tenantService.createTenant(invalidData))
        .rejects.toThrow(ValidationError);
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockDb.getConnection.mockResolvedValue(mockClient);
      mockClient.query.mockImplementation((query) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query.includes('INSERT INTO tenant_registry')) {
          throw new Error('Database error');
        }
        if (query === 'ROLLBACK') return Promise.resolve();
      });

      await expect(tenantService.createTenant(validTenantData))
        .rejects.toThrow(DatabaseError);

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('getTenant', () => {
    const mockTenantId = 'test-tenant-id';

    it('should retrieve tenant successfully', async () => {
      const mockTenantData = {
        tenant_id: mockTenantId,
        business_name: 'Test Restaurant',
        contact_info: { email: 'test@restaurant.com' },
        subscription_plan: 'BASIC',
        schema_name: 'tenant_test',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.systemQuery.mockResolvedValue({
        rows: [mockTenantData]
      });

      const result = await tenantService.getTenant(mockTenantId);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe(mockTenantId);
      expect(result.data.businessName).toBe(mockTenantData.business_name);
    });

    it('should throw TenantNotFoundError when tenant does not exist', async () => {
      mockDb.systemQuery.mockResolvedValue({ rows: [] });

      await expect(tenantService.getTenant(mockTenantId))
        .rejects.toThrow(TenantNotFoundError);
    });
  });

  describe('updateTenant', () => {
    const mockTenantId = 'test-tenant-id';
    const updateData = {
      businessName: 'Updated Restaurant Name'
    };

    it('should update tenant successfully', async () => {
      // Mock getTenant call
      const mockTenantData = {
        tenant_id: mockTenantId,
        business_name: 'Test Restaurant',
        contact_info: { email: 'test@restaurant.com' },
        subscription_plan: 'BASIC',
        schema_name: 'tenant_test',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDb.systemQuery
        .mockResolvedValueOnce({ rows: [mockTenantData] }) // getTenant call
        .mockResolvedValueOnce({ 
          rows: [{ 
            ...mockTenantData, 
            business_name: updateData.businessName 
          }] 
        }); // update call

      const result = await tenantService.updateTenant(mockTenantId, updateData);

      expect(result.success).toBe(true);
      expect(result.data.businessName).toBe(updateData.businessName);
    });

    it('should throw ValidationError when no fields to update', async () => {
      // Mock getTenant call
      mockDb.systemQuery.mockResolvedValueOnce({ 
        rows: [{ tenant_id: mockTenantId }] 
      });

      await expect(tenantService.updateTenant(mockTenantId, {}))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('deleteTenant', () => {
    const mockTenantId = 'test-tenant-id';

    it('should deactivate tenant successfully', async () => {
      // Mock getTenant call
      mockDb.systemQuery
        .mockResolvedValueOnce({ 
          rows: [{ tenant_id: mockTenantId }] 
        }) // getTenant call
        .mockResolvedValueOnce({ rows: [] }); // delete call

      const result = await tenantService.deleteTenant(mockTenantId);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Tenant deactivated successfully');
    });
  });

  describe('listTenants', () => {
    it('should list tenants with pagination', async () => {
      const mockTenants = [
        {
          tenant_id: 'tenant-1',
          business_name: 'Restaurant 1',
          contact_info: { email: 'test1@restaurant.com' },
          subscription_plan: 'BASIC',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          tenant_id: 'tenant-2',
          business_name: 'Restaurant 2',
          contact_info: { email: 'test2@restaurant.com' },
          subscription_plan: 'PREMIUM',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        }
      ];

      mockDb.systemQuery
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count query
        .mockResolvedValueOnce({ rows: mockTenants }); // list query

      const result = await tenantService.listTenants(1, 20);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
    });
  });

  describe('getFeaturesByPlan', () => {
    it('should return correct features for BASIC plan', () => {
      const features = tenantService.getFeaturesByPlan('BASIC');
      
      expect(features.maxOutlets).toBe(1);
      expect(features.maxStaff).toBe(10);
      expect(features.customReports).toBe(false);
    });

    it('should return correct features for PREMIUM plan', () => {
      const features = tenantService.getFeaturesByPlan('PREMIUM');
      
      expect(features.maxOutlets).toBe(5);
      expect(features.maxStaff).toBe(50);
      expect(features.customReports).toBe(true);
    });

    it('should return correct features for ENTERPRISE plan', () => {
      const features = tenantService.getFeaturesByPlan('ENTERPRISE');
      
      expect(features.maxOutlets).toBe(-1); // unlimited
      expect(features.maxStaff).toBe(-1);
      expect(features.customReports).toBe(true);
    });

    it('should return BASIC features for unknown plan', () => {
      const features = tenantService.getFeaturesByPlan('UNKNOWN');
      
      expect(features.maxOutlets).toBe(1);
      expect(features.customReports).toBe(false);
    });
  });
});
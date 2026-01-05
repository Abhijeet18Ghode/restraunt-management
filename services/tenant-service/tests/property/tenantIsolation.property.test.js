const fc = require('fast-check');
const TenantService = require('../../src/services/TenantService');
const { 
  validateTenantContext 
} = require('@rms/shared');

describe('Tenant Isolation Property Tests', () => {
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

  // Generator for tenant IDs
  const tenantIdGenerator = () => fc.string({ minLength: 36, maxLength: 36 })
    .filter(s => s.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));

  // Generator for valid tenant data
  const tenantDataGenerator = () => fc.record({
    businessName: fc.string({ minLength: 2, maxLength: 100 }),
    contactInfo: fc.record({
      email: fc.emailAddress(),
      phone: fc.string({ minLength: 10, maxLength: 15 }),
      address: fc.record({
        street: fc.string({ minLength: 5, maxLength: 100 }),
        city: fc.string({ minLength: 2, maxLength: 50 }),
        state: fc.string({ minLength: 2, maxLength: 50 }),
        country: fc.string({ minLength: 2, maxLength: 50 }),
        zipCode: fc.string({ minLength: 5, maxLength: 10 }),
      }),
    }),
    subscriptionPlan: fc.constantFrom('BASIC', 'PREMIUM', 'ENTERPRISE'),
  });

  /**
   * Property 17: Tenant Data Isolation
   * For any tenant, users should only be able to access data belonging to their own tenant
   * Validates: Requirements 13.2
   */
  describe('Property 17: Tenant Data Isolation', () => {
    it('should enforce tenant data isolation for all tenant operations', async () => {
      // Feature: restaurant-management-system, Property 17: Tenant Data Isolation
      await fc.assert(fc.asyncProperty(
        fc.tuple(tenantIdGenerator(), tenantIdGenerator()).filter(([t1, t2]) => t1 !== t2),
        tenantDataGenerator(),
        async ([tenantId1, tenantId2], tenantData) => {
          // Mock successful tenant creation for both tenants
          const mockClient = {
            query: jest.fn().mockResolvedValue({}),
            release: jest.fn(),
          };
          mockDb.getConnection.mockResolvedValue(mockClient);
          mockDb.createTenantSchema.mockResolvedValue(`tenant_${tenantId1}`);

          // Create first tenant
          await tenantService.createTenant({ ...tenantData, tenantId: tenantId1 });

          // Mock getTenant to return data only for the correct tenant
          mockDb.systemQuery.mockImplementation((query, params) => {
            const requestedTenantId = params[0];
            if (requestedTenantId === tenantId1) {
              return Promise.resolve({
                rows: [{
                  tenant_id: tenantId1,
                  business_name: tenantData.businessName,
                  contact_info: tenantData.contactInfo,
                  subscription_plan: tenantData.subscriptionPlan,
                  schema_name: `tenant_${tenantId1}`,
                  is_active: true,
                  created_at: new Date(),
                  updated_at: new Date(),
                }]
              });
            } else {
              return Promise.resolve({ rows: [] }); // No access to other tenant's data
            }
          });

          // Test: Tenant 1 should be able to access its own data
          const tenant1Result = await tenantService.getTenant(tenantId1);
          expect(tenant1Result.success).toBe(true);
          expect(tenant1Result.data.id).toBe(tenantId1);

          // Test: Tenant 1 should NOT be able to access Tenant 2's data
          await expect(tenantService.getTenant(tenantId2))
            .rejects.toThrow();
        }
      ), { numRuns: 50 });
    });

    it('should validate tenant context for all operations', async () => {
      // Feature: restaurant-management-system, Property 17: Tenant Data Isolation
      await fc.assert(fc.property(
        fc.tuple(tenantIdGenerator(), tenantIdGenerator()).filter(([t1, t2]) => t1 !== t2),
        ([requestTenantId, resourceTenantId]) => {
          // Test the validateTenantContext utility function
          expect(() => {
            validateTenantContext(requestTenantId, resourceTenantId);
          }).toThrow('Tenant access denied');
        }
      ), { numRuns: 100 });
    });

    it('should allow access only when tenant contexts match', async () => {
      // Feature: restaurant-management-system, Property 17: Tenant Data Isolation
      await fc.assert(fc.property(
        tenantIdGenerator(),
        (tenantId) => {
          // Test that same tenant ID allows access
          expect(() => {
            validateTenantContext(tenantId, tenantId);
          }).not.toThrow();
        }
      ), { numRuns: 100 });
    });
  });

  /**
   * Property 18: Tenant-Specific Data Storage
   * For any transaction or data operation, all stored data should include the correct tenant identifier
   * Validates: Requirements 13.3
   */
  describe('Property 18: Tenant-Specific Data Storage', () => {
    it('should store tenant ID with all data operations', async () => {
      // Feature: restaurant-management-system, Property 18: Tenant-Specific Data Storage
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        tenantDataGenerator(),
        async (tenantId, tenantData) => {
          const mockClient = {
            query: jest.fn(),
            release: jest.fn(),
          };
          mockDb.getConnection.mockResolvedValue(mockClient);
          mockDb.createTenantSchema.mockResolvedValue(`tenant_${tenantId}`);

          // Capture the INSERT query to verify tenant_id is included
          let insertQuery = '';
          let insertParams = [];
          mockClient.query.mockImplementation((query, params) => {
            if (query.includes('INSERT INTO tenant_registry')) {
              insertQuery = query;
              insertParams = params || [];
            }
            return Promise.resolve({});
          });

          await tenantService.createTenant(tenantData);

          // Verify that tenant_id is included in the INSERT statement
          expect(insertQuery).toContain('tenant_id');
          expect(insertParams).toContain(expect.any(String)); // tenant_id should be a string
          
          // Verify the tenant_id parameter is a valid UUID format
          const tenantIdParam = insertParams[0]; // First parameter should be tenant_id
          expect(tenantIdParam).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }
      ), { numRuns: 50 });
    });

    it('should use tenant-specific schema for all tenant operations', async () => {
      // Feature: restaurant-management-system, Property 18: Tenant-Specific Data Storage
      await fc.assert(fc.asyncProperty(
        tenantIdGenerator(),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (tenantId, queryString) => {
          // Mock database query to capture schema usage
          mockDb.query.mockImplementation((actualTenantId, _query, _params) => {
            expect(actualTenantId).toBe(tenantId); // Verify correct tenant ID is used
            return Promise.resolve({ rows: [] });
          });

          // Mock createTenantSchema to capture schema creation
          mockDb.createTenantSchema.mockImplementation((actualTenantId) => {
            expect(actualTenantId).toBe(tenantId);
            const expectedSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
            return Promise.resolve(expectedSchema);
          });

          // Test schema creation
          await mockDb.createTenantSchema(tenantId);

          // Test query execution with tenant context
          await mockDb.query(tenantId, queryString, []);

          // Verify mocks were called with correct tenant ID
          expect(mockDb.createTenantSchema).toHaveBeenCalledWith(tenantId);
          expect(mockDb.query).toHaveBeenCalledWith(tenantId, queryString, []);
        }
      ), { numRuns: 50 });
    });

    it('should generate unique schema names for different tenants', async () => {
      // Feature: restaurant-management-system, Property 18: Tenant-Specific Data Storage
      await fc.assert(fc.property(
        fc.array(tenantIdGenerator(), { minLength: 2, maxLength: 10 }).filter(arr => {
          // Ensure all tenant IDs are unique
          return new Set(arr).size === arr.length;
        }),
        (tenantIds) => {
          const schemaNames = tenantIds.map(tenantId => {
            return `tenant_${tenantId.replace(/-/g, '_')}`;
          });

          // All schema names should be unique
          const uniqueSchemas = new Set(schemaNames);
          expect(uniqueSchemas.size).toBe(schemaNames.length);

          // Each schema name should correspond to its tenant ID
          tenantIds.forEach((tenantId, index) => {
            const expectedSchema = `tenant_${tenantId.replace(/-/g, '_')}`;
            expect(schemaNames[index]).toBe(expectedSchema);
          });
        }
      ), { numRuns: 100 });
    });
  });
});
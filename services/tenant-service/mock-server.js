const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3012'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-request-id']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mock data
const mockTenants = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    businessName: 'Pizza Palace',
    contactInfo: {
      email: 'admin@pizzapalace.com',
      phone: '+1-555-0101',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        zipCode: '10001'
      }
    },
    subscriptionPlan: 'PREMIUM',
    isActive: true,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    businessName: 'Burger Barn',
    contactInfo: {
      email: 'owner@burgerbarn.com',
      phone: '+1-555-0102',
      address: {
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        country: 'USA',
        zipCode: '90210'
      }
    },
    subscriptionPlan: 'BASIC',
    isActive: true,
    createdAt: '2024-01-20T14:15:00Z',
    updatedAt: '2024-01-20T14:15:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    businessName: 'Sushi Spot',
    contactInfo: {
      email: 'info@sushispot.com',
      phone: '+1-555-0103',
      address: {
        street: '789 Pine Rd',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        zipCode: '94102'
      }
    },
    subscriptionPlan: 'ENTERPRISE',
    isActive: false,
    createdAt: '2024-02-01T09:45:00Z',
    updatedAt: '2024-02-01T09:45:00Z'
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'tenant-service-mock',
    timestamp: new Date().toISOString(),
    version: '1.0.0-mock',
  });
});

// List all tenants - handle both /api/tenants and / (for API Gateway routing)
app.get('/api/tenants', handleListTenants);
app.get('/', handleListTenants);

function handleListTenants(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const isActive = req.query.isActive;

  let filteredTenants = mockTenants;
  
  // Filter by active status if specified
  if (isActive !== undefined) {
    const activeFilter = isActive === 'true';
    filteredTenants = mockTenants.filter(tenant => tenant.isActive === activeFilter);
  }

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

  const total = filteredTenants.length;
  const totalPages = Math.ceil(total / limit);

  res.json({
    success: true,
    data: paginatedTenants,
    message: 'Tenants retrieved successfully',
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }
  });
}

// Get tenant by ID
app.get('/api/tenants/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const tenant = mockTenants.find(t => t.id === tenantId);

  if (!tenant) {
    return res.status(404).json({
      success: false,
      error: 'Tenant not found',
      message: `Tenant with ID ${tenantId} does not exist`
    });
  }

  res.json({
    success: true,
    data: tenant,
    message: 'Tenant retrieved successfully'
  });
});

// Create new tenant - handle both /api/tenants and / (for API Gateway routing)
app.post('/api/tenants', handleCreateTenant);
app.post('/', handleCreateTenant);

function handleCreateTenant(req, res) {
  const { businessName, contactInfo, subscriptionPlan = 'BASIC', adminUser } = req.body;

  if (!businessName || !contactInfo || !contactInfo.email) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Business name and contact email are required'
    });
  }

  const newTenant = {
    id: `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12)}`,
    businessName,
    contactInfo,
    subscriptionPlan,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockTenants.push(newTenant);

  res.status(201).json({
    success: true,
    data: newTenant,
    message: 'Tenant created successfully'
  });
}

// Update tenant
app.put('/api/tenants/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const tenantIndex = mockTenants.findIndex(t => t.id === tenantId);

  if (tenantIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Tenant not found',
      message: `Tenant with ID ${tenantId} does not exist`
    });
  }

  const updatedTenant = {
    ...mockTenants[tenantIndex],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  mockTenants[tenantIndex] = updatedTenant;

  res.json({
    success: true,
    data: updatedTenant,
    message: 'Tenant updated successfully'
  });
});

// Delete (deactivate) tenant
app.delete('/api/tenants/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const tenantIndex = mockTenants.findIndex(t => t.id === tenantId);

  if (tenantIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Tenant not found',
      message: `Tenant with ID ${tenantId} does not exist`
    });
  }

  // Deactivate instead of delete
  mockTenants[tenantIndex].isActive = false;
  mockTenants[tenantIndex].updatedAt = new Date().toISOString();

  res.json({
    success: true,
    message: 'Tenant deactivated successfully'
  });
});

// System stats endpoint
app.get('/api/system/stats', (req, res) => {
  const activeTenants = mockTenants.filter(t => t.isActive).length;
  const inactiveTenants = mockTenants.filter(t => !t.isActive).length;
  
  const subscriptionStats = mockTenants.reduce((acc, tenant) => {
    acc[tenant.subscriptionPlan] = (acc[tenant.subscriptionPlan] || 0) + 1;
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      totalTenants: mockTenants.length,
      activeTenants,
      inactiveTenants,
      subscriptionStats,
      systemHealth: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    message: 'System stats retrieved successfully'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Tenant Service running on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Mock database connected successfully (in-memory)`);
  console.log(`📊 Mock data: ${mockTenants.length} tenants loaded`);
  console.log(`🌐 CORS enabled for: http://localhost:3000, http://localhost:3012`);
});

module.exports = app;
// Test setup file

// Mock database for testing
const mockDbManager = {
  getConnection: jest.fn(),
  query: jest.fn(),
  systemQuery: jest.fn(),
  createTenantSchema: jest.fn(),
  dropTenantSchema: jest.fn(),
  tenantExists: jest.fn(),
  getTenantSchema: jest.fn(),
  close: jest.fn(),
};

// Make mock available globally
global.mockDbManager = mockDbManager;

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.JWT_EXPIRES_IN = '1h';

// Suppress console logs during testing
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
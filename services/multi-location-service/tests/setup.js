// Test setup file
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock service URLs for testing
process.env.MENU_SERVICE_URL = 'http://localhost:3002';
process.env.INVENTORY_SERVICE_URL = 'http://localhost:3003';
process.env.POS_SERVICE_URL = 'http://localhost:3004';
process.env.ANALYTICS_SERVICE_URL = 'http://localhost:3008';
process.env.CUSTOMER_SERVICE_URL = 'http://localhost:3007';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};
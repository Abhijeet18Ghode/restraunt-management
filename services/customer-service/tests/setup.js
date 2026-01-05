// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.LOYALTY_POINTS_PER_DOLLAR = '1';
process.env.LOYALTY_REDEMPTION_RATE = '100';
process.env.LOYALTY_TIER_THRESHOLDS = '100,500,1000,2000';
process.env.LOYALTY_TIER_MULTIPLIERS = '1,1.5,2,2.5';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
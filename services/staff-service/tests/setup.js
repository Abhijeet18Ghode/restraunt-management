// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.PASSWORD_MIN_LENGTH = '8';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.LOCKOUT_DURATION_MINUTES = '30';
process.env.WORK_HOURS_PER_DAY = '8';
process.env.OVERTIME_THRESHOLD = '8';
process.env.BREAK_DURATION_MINUTES = '60';
process.env.PERFORMANCE_REVIEW_CYCLE_MONTHS = '6';
process.env.TARGET_ORDERS_PER_HOUR = '10';
process.env.TARGET_CUSTOMER_RATING = '4.0';

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
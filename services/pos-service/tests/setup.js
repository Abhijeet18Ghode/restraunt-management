// Test setup for POS service
const { DatabaseManager } = require('@rms/shared');

// Mock database manager for tests
jest.mock('@rms/shared', () => ({
  ...jest.requireActual('@rms/shared'),
  DatabaseManager: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    close: jest.fn(),
  })),
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
// Jest setup file for menu service tests

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  // Uncomment to ignore specific log levels during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Generate a mock UUID
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  // Generate mock tenant ID
  generateTenantId: () => global.testUtils.generateUUID(),

  // Generate mock outlet ID
  generateOutletId: () => global.testUtils.generateUUID(),

  // Create mock database manager
  createMockDbManager: () => ({
    query: jest.fn(),
    getConnection: jest.fn(),
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
  }),

  // Create mock menu item data
  createMockMenuItem: (overrides = {}) => ({
    id: global.testUtils.generateUUID(),
    name: 'Test Menu Item',
    description: 'A delicious test item',
    price: 12.99,
    categoryId: global.testUtils.generateUUID(),
    preparationTime: 15,
    ingredients: ['ingredient1', 'ingredient2'],
    isAvailable: true,
    outletIds: [global.testUtils.generateOutletId()],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  // Create mock inventory item data
  createMockInventoryItem: (overrides = {}) => ({
    id: global.testUtils.generateUUID(),
    name: 'Test Ingredient',
    currentStock: 100,
    minimumStock: 10,
    unit: 'kg',
    outletId: global.testUtils.generateOutletId(),
    ...overrides,
  }),

  // Create mock API response
  createMockApiResponse: (data, message = 'Success', meta = null) => ({
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  }),
};

// Setup for property-based tests
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
  
  // Reset any global state if needed
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Increase timeout for property-based tests
jest.setTimeout(30000);
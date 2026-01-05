module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/integration/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],
  testTimeout: 300000, // 5 minutes for integration tests
  verbose: true,
  collectCoverage: false, // Disable coverage for integration tests
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  forceExit: true,
  detectOpenHandles: true,
  globalSetup: '<rootDir>/tests/integration/globalSetup.js',
  globalTeardown: '<rootDir>/tests/integration/globalTeardown.js',
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/integration/reports',
      filename: 'integration-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Restaurant Management System - Integration Test Report'
    }]
  ]
};
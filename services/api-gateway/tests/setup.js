// Test setup file
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock environment variables for testing
process.env.CONSUL_HOST = 'localhost';
process.env.CONSUL_PORT = '8500';

// Email configuration
process.env.SMTP_HOST = 'smtp.test.com';
process.env.SMTP_PORT = '587';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.FROM_EMAIL = 'noreply@test.com';

// SMS configuration
process.env.TWILIO_ACCOUNT_SID = 'test-account-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
process.env.TWILIO_PHONE_NUMBER = '+1234567890';

// Push notification configuration
process.env.FIREBASE_SERVER_KEY = 'test-firebase-key';
process.env.PUSH_NOTIFICATIONS_ENABLED = 'true';

// Delivery partner configuration
process.env.UBER_EATS_ENABLED = 'true';
process.env.UBER_EATS_API_KEY = 'test-uber-key';
process.env.DOORDASH_ENABLED = 'true';
process.env.DOORDASH_API_KEY = 'test-doordash-key';
process.env.GRUBHUB_ENABLED = 'false';

// Accounting integration configuration
process.env.QUICKBOOKS_ENABLED = 'true';
process.env.QUICKBOOKS_ACCESS_TOKEN = 'test-qb-token';
process.env.QUICKBOOKS_COMPANY_ID = 'test-company-id';
process.env.XERO_ENABLED = 'true';
process.env.XERO_ACCESS_TOKEN = 'test-xero-token';
process.env.XERO_TENANT_ID = 'test-tenant-id';
process.env.SAGE_ENABLED = 'true';
process.env.SAGE_API_KEY = 'test-sage-key';
process.env.SAGE_SUBSCRIPTION_KEY = 'test-subscription-key';

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
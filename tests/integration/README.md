# Integration Testing Suite

This directory contains comprehensive integration tests for the Restaurant Management System. These tests validate end-to-end functionality, multi-tenant isolation, and system performance under load.

## Test Suites

### 1. System Integration Tests (`systemIntegration.test.js`)
- **Purpose**: End-to-end system functionality validation
- **Coverage**: Complete business workflows from tenant creation to analytics
- **Key Tests**:
  - Complete order-to-payment workflow
  - Multi-tenant isolation verification
  - Service health and discovery
  - Error handling and resilience
  - Request tracing and logging

### 2. Order-to-Payment Workflow Tests (`orderToPaymentWorkflow.test.js`)
- **Purpose**: Validate complete business workflows for all order types
- **Coverage**: Dine-in, takeaway, and delivery order processing
- **Key Tests**:
  - Order creation and modification
  - Table merging workflows
  - Payment processing (cash, card, digital wallet, split payments)
  - Kitchen operations and KOT generation
  - Inventory integration and deduction
  - Customer loyalty point updates
  - Analytics data recording

### 3. Multi-Tenant Isolation Tests (`multiTenantIsolation.test.js`)
- **Purpose**: Ensure complete data isolation between tenants
- **Coverage**: All services and data access patterns
- **Key Tests**:
  - Data isolation across all services
  - Cross-tenant operation prevention
  - Tenant context validation
  - Concurrent multi-tenant operations
  - Security boundary enforcement

### 4. Performance and Load Tests (`performanceLoad.test.js`)
- **Purpose**: Validate system performance under various load conditions
- **Coverage**: Response times, throughput, and resource usage
- **Key Tests**:
  - Response time performance for different operations
  - Concurrent request handling
  - Sustained load testing
  - Burst traffic patterns
  - Memory and resource usage monitoring
  - Database performance under load
  - Error handling under high load

### 5. API Gateway Integration Tests (`services/api-gateway/tests/integration/`)
- **Purpose**: Validate API Gateway specific functionality
- **Coverage**: Service routing, load balancing, and gateway features
- **Key Tests**:
  - Service discovery and routing
  - Load balancing and failover
  - Rate limiting enforcement
  - Request/response transformation
  - Circuit breaker functionality

## Running Integration Tests

### Prerequisites

1. **System Must Be Running**: All services must be started before running integration tests
   ```bash
   npm run start
   ```

2. **Verify System Health**: Check that all services are healthy
   ```bash
   npm run status
   ```

### Running Tests

#### Run All Integration Tests
```bash
npm run test:integration
```

#### Run Specific Test Suite
```bash
# Performance tests only
npm run test:integration:performance

# Multi-tenant isolation tests
npm run test:integration:isolation

# Workflow tests
npm run test:integration:workflow
```

#### Run with Verbose Output
```bash
npm run test:integration:verbose
```

#### Run Specific Test Files
```bash
# Using the test runner
node scripts/run-integration-tests.js system workflow

# Using Jest directly
npx jest --config tests/integration/jest.config.js --testPathPattern systemIntegration
```

### Advanced Options

#### Run with Coverage
```bash
node scripts/run-integration-tests.js --coverage
```

#### Fail Fast (Stop on First Failure)
```bash
node scripts/run-integration-tests.js --fail-fast
```

#### Run Specific Suites
```bash
node scripts/run-integration-tests.js --suites system,isolation
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- **Test Timeout**: 5 minutes per test (for complex workflows)
- **Sequential Execution**: Tests run one at a time to avoid conflicts
- **Global Setup/Teardown**: Automatic system startup/shutdown
- **HTML Reports**: Generated in `tests/integration/reports/`

### Environment Configuration (`setup.js`)
- **Global Test Utilities**: Helper functions for common operations
- **Performance Thresholds**: Configurable performance expectations
- **Test Data Generators**: Utilities for creating test data
- **Validation Helpers**: Common validation patterns

## Performance Thresholds

The tests enforce the following performance expectations:

### Response Time Targets
- **Health Checks**: < 50ms average, < 100ms P95
- **Simple Queries**: < 300ms average, < 1000ms max
- **Order Creation**: < 500ms average, < 2000ms max
- **Payment Processing**: < 3000ms max

### Throughput Targets
- **Concurrent Requests**: 50+ concurrent menu requests
- **Sustained Load**: 95%+ success rate over 30 seconds
- **Burst Traffic**: Handle 50 requests in < 10 seconds

### Resource Usage
- **Memory Growth**: < 50% increase under load
- **Database Performance**: < 500ms average for concurrent operations

## Test Data Management

### Isolation Strategy
- Each test suite creates its own tenant and test data
- Test data is isolated by tenant ID to prevent conflicts
- Cleanup is performed after test completion

### Data Generators
The test suite includes utilities for generating:
- Tenant configurations
- Customer profiles
- Menu items and categories
- Orders with various configurations
- Payment transactions

## Troubleshooting

### Common Issues

#### System Not Running
```
Error: API Gateway is not running
Solution: Run `npm run start` to start all services
```

#### Service Health Issues
```
Warning: Some services are not healthy
Solution: Check service logs and restart unhealthy services
```

#### Test Timeouts
```
Error: Test timeout exceeded
Solution: Increase timeout in jest.config.js or check system performance
```

#### Port Conflicts
```
Error: Port already in use
Solution: Stop conflicting processes or change service ports
```

### Debug Mode

Run tests with verbose output to see detailed execution:
```bash
npm run test:integration:verbose
```

Check service logs during test execution:
```bash
# In separate terminal
tail -f services/*/logs/*.log
```

### Performance Issues

If tests are failing due to performance:

1. **Check System Resources**: Ensure adequate CPU/memory
2. **Verify Database Performance**: Check database connection and query performance
3. **Review Service Health**: Ensure all services are responding normally
4. **Adjust Thresholds**: Modify performance expectations in `setup.js`

## Continuous Integration

### CI/CD Integration

The integration tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start System
  run: npm run start

- name: Wait for System Ready
  run: sleep 30

- name: Run Integration Tests
  run: npm run test:integration

- name: Stop System
  run: npm run stop
```

### Test Reports

Integration tests generate multiple report formats:
- **Console Output**: Real-time test results
- **HTML Reports**: Detailed test reports in `tests/integration/reports/`
- **JUnit XML**: For CI/CD integration (if configured)

## Contributing

When adding new integration tests:

1. **Follow Naming Convention**: Use descriptive test names
2. **Use Test Utilities**: Leverage existing helper functions
3. **Ensure Isolation**: Tests should not depend on each other
4. **Add Documentation**: Document new test scenarios
5. **Verify Performance**: Ensure tests complete within reasonable time

### Test Structure Template

```javascript
describe('New Feature Integration Tests', () => {
  let testData = {};

  beforeAll(async () => {
    // Setup test environment
    testData = await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData(testData);
  });

  it('should validate new feature workflow', async () => {
    // Test implementation
    const result = await performWorkflow();
    expect(result).toBeDefined();
  });
});
```

## Monitoring and Metrics

The integration tests collect various metrics:

- **Test Execution Time**: Duration of each test suite
- **System Response Times**: API response time measurements
- **Success Rates**: Percentage of successful operations
- **Resource Usage**: Memory and CPU utilization during tests
- **Error Rates**: Frequency and types of errors encountered

These metrics help identify performance regressions and system issues.
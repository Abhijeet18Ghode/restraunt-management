# Restaurant Management System - Integration Guide

## Overview

This document describes the complete integration of the Restaurant Management System, including service orchestration, error handling, logging, and end-to-end workflows.

## Architecture

The system consists of the following integrated components:

### Core Services
- **API Gateway** (Port 3000) - Central routing and load balancing
- **Tenant Service** (Port 3001) - Multi-tenant management
- **Menu Service** (Port 3002) - Menu and category management
- **Inventory Service** (Port 3003) - Stock and supplier management
- **POS Service** (Port 3004) - Point of sale operations
- **Online Order Service** (Port 3005) - Online order processing
- **Staff Service** (Port 3006) - Employee management
- **Customer Service** (Port 3007) - Customer relationship management
- **Analytics Service** (Port 3008) - Reporting and analytics
- **Payment Service** (Port 3009) - Payment processing
- **WebSocket Service** (Port 3010) - Real-time communications

### Frontend Applications
- **Admin Dashboard** (Port 3001) - Management interface
- **POS Interface** (Port 3002) - Point of sale interface

## Service Integration Features

### 1. Service Discovery and Load Balancing

The API Gateway implements service discovery with fallback mechanisms:

```javascript
// Automatic service discovery with Consul
const serviceUrl = await serviceDiscovery.getServiceUrl('pos-service');

// Fallback to hardcoded URLs for development
const fallbackUrls = {
  'pos-service': 'http://localhost:3004',
  'menu-service': 'http://localhost:3002'
};
```

### 2. Comprehensive Error Handling

The system implements a multi-layered error handling strategy:

#### Error Types
- **Validation Errors** - Invalid input data
- **Business Logic Errors** - Rule violations
- **Authentication/Authorization Errors** - Security violations
- **Service Unavailable Errors** - Network/connectivity issues
- **Tenant Isolation Errors** - Multi-tenant boundary violations

#### Circuit Breaker Pattern
```javascript
const circuitBreaker = new CircuitBreaker('pos-service', {
  failureThreshold: 5,
  resetTimeout: 60000
});

const result = await circuitBreaker.execute(async () => {
  return await posService.createOrder(orderData);
});
```

#### Retry with Exponential Backoff
```javascript
const result = await retryWithBackoff(
  () => inventoryService.updateStock(itemId, quantity),
  3, // max retries
  1000 // base delay
);
```

### 3. Comprehensive Logging

The system implements structured logging with multiple contexts:

#### Log Levels and Contexts
- **Request/Response Logging** - HTTP traffic monitoring
- **Security Logging** - Authentication/authorization events
- **Performance Logging** - Slow request detection
- **Business Logging** - Business event tracking
- **Audit Logging** - Sensitive operation tracking

#### Log Sanitization
```javascript
// Automatic sanitization of sensitive data
const sanitizedBody = sanitizeRequestBody({
  username: 'john',
  password: 'secret123', // -> '[REDACTED]'
  creditCard: '4111111111111111' // -> '[REDACTED]'
});
```

### 4. Service Orchestration

The ServiceOrchestrator manages the complete system lifecycle:

#### Startup Sequence
1. **API Gateway** - Central routing
2. **Tenant Service** - Multi-tenant foundation
3. **Core Services** - Menu, Inventory, Staff, Customer
4. **Business Services** - POS, Online Orders
5. **Analytics Services** - Reporting and WebSocket

#### Health Monitoring
```javascript
// Continuous health checking
const healthStatus = await serviceOrchestrator.healthCheck();
console.log(healthStatus);
// {
//   'pos-service': { status: 'healthy', uptime: '2m 30s' },
//   'menu-service': { status: 'healthy', uptime: '2m 25s' }
// }
```

## End-to-End Workflows

### 1. Complete Order Processing Workflow

```mermaid
sequenceDiagram
    participant C as Customer
    participant POS as POS Service
    participant M as Menu Service
    participant I as Inventory Service
    participant P as Payment Service
    participant A as Analytics Service
    participant CRM as Customer Service

    C->>POS: Create Order
    POS->>M: Validate Menu Items
    M-->>POS: Items Valid
    POS->>I: Check Inventory
    I-->>POS: Stock Available
    POS->>POS: Calculate Total
    POS->>P: Process Payment
    P-->>POS: Payment Success
    POS->>I: Deduct Inventory
    POS->>A: Record Sale
    POS->>CRM: Update Loyalty Points
    POS-->>C: Order Complete
```

### 2. Multi-Tenant Data Isolation

```javascript
// Every request includes tenant context
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }
  req.tenantId = tenantId;
  next();
});

// All database queries include tenant filtering
const orders = await Order.findAll({
  where: { tenantId: req.tenantId }
});
```

## System Management

### Starting the System

```bash
# Start all services
npm run start

# Start specific service
npm run start:service pos-service

# Check system status
npm run status
```

### Monitoring and Health Checks

```bash
# Get service status
curl http://localhost:3000/services/status

# Get individual service health
curl http://localhost:3004/health
```

### Integration Testing

```bash
# Run complete integration tests
npm run test:integration

# Run API Gateway integration tests
cd services/api-gateway && npm run test:integration
```

## Performance Characteristics

### Response Time Targets
- **Health Checks**: < 50ms
- **Simple Queries**: < 200ms
- **Complex Operations**: < 1000ms
- **Payment Processing**: < 3000ms

### Throughput Targets
- **Concurrent Users**: 100+ per service
- **Requests per Second**: 1000+ through API Gateway
- **Order Processing**: 50+ orders/minute per outlet

### Scalability Features
- **Horizontal Scaling**: All services are stateless
- **Load Balancing**: Round-robin with health checks
- **Circuit Breakers**: Prevent cascade failures
- **Rate Limiting**: Protect against abuse

## Security Features

### Multi-Tenant Isolation
- **Database Level**: Separate schemas per tenant
- **Application Level**: Tenant-aware queries
- **API Level**: Tenant ID validation on all requests

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-Based Access**: Granular permissions
- **Request Signing**: API integrity verification

### Data Protection
- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **PCI Compliance**: Payment data protection
- **Audit Logging**: Complete operation tracking

## Troubleshooting

### Common Issues

#### Service Discovery Failures
```bash
# Check Consul status
curl http://localhost:8500/v1/health/state/any

# Restart service discovery
npm run restart:service api-gateway
```

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose ps
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### Memory/Performance Issues
```bash
# Check service memory usage
npm run status

# Restart specific service
npm run restart:service pos-service
```

### Log Analysis

```bash
# View error logs
tail -f services/api-gateway/logs/error.log

# View access logs
tail -f services/api-gateway/logs/access.log

# Search for specific tenant
grep "tenant:abc123" services/api-gateway/logs/combined.log
```

## Development Workflow

### Adding New Services

1. Create service directory structure
2. Add to `services` configuration in `scripts/start-system.js`
3. Update API Gateway routing in `gatewayRoutes.js`
4. Add integration tests
5. Update documentation

### Modifying Existing Services

1. Update service implementation
2. Run unit tests: `npm test`
3. Run integration tests: `npm run test:integration`
4. Update API documentation
5. Deploy changes

## Production Deployment

### Environment Variables

```bash
# API Gateway
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
CONSUL_HOST=consul.internal
REDIS_URL=redis://redis.internal:6379

# Database
DATABASE_URL=postgresql://user:pass@db.internal:5432/restaurant_db

# External Services
STRIPE_SECRET_KEY=sk_live_...
TWILIO_ACCOUNT_SID=AC...
SMTP_HOST=smtp.internal
```

### Docker Deployment

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CONSUL_HOST=consul
    depends_on:
      - consul
      - redis
      - postgres
```

### Health Check Endpoints

All services expose health check endpoints:

```bash
GET /health
{
  "status": "healthy",
  "service": "pos-service",
  "timestamp": "2024-01-05T10:30:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 45.2,
    "total": 128.0
  },
  "dependencies": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

## Conclusion

The Restaurant Management System provides a comprehensive, scalable, and maintainable solution for multi-tenant restaurant operations. The integration layer ensures reliable communication between services while maintaining data isolation and security.

For additional support or questions, refer to the individual service documentation or contact the development team.
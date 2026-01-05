# 🚀 Getting Started - Restaurant Management System

## Quick Start Guide

This guide will walk you through setting up, running, and testing the complete Restaurant Management System SaaS platform.

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **Git**: For version control

### Check Your Environment
```bash
# Verify Node.js version
node --version  # Should be v18.0.0 or higher

# Verify npm version
npm --version   # Should be 9.0.0 or higher

# Check available memory (recommended: 4GB+ RAM)
```

## 🛠️ Installation & Setup

### 1. Install Dependencies
```bash
# Install all dependencies for the monorepo
npm install

# This will install dependencies for:
# - Root project
# - All microservices (11 services)
# - Frontend applications (2 apps)
# - Shared packages
```

### 2. Verify Installation
```bash
# Check if all workspaces are properly installed
npm run services  # Lists all available services
```

## 🚀 Starting the System

### Option 1: Start Everything at Once (Recommended)
```bash
# Start all 11 microservices automatically
npm run start

# This will start:
# ✅ API Gateway (Port 3000)
# ✅ Tenant Service (Port 3001)
# ✅ Menu Service (Port 3002)
# ✅ Inventory Service (Port 3003)
# ✅ POS Service (Port 3004)
# ✅ Online Order Service (Port 3005)
# ✅ Staff Service (Port 3006)
# ✅ Customer Service (Port 3007)
# ✅ Analytics Service (Port 3008)
# ✅ Payment Service (Port 3009)
# ✅ WebSocket Service (Port 3010)
```

### Option 2: Start Services Individually
```bash
# Start specific services
npm run start:service api-gateway
npm run start:service pos-service
npm run start:service menu-service

# Or use the system manager directly
node scripts/start-system.js start pos-service
```

### 3. Verify System is Running
```bash
# Check system status
npm run status

# Or use the real-time dashboard
npm run status:watch  # Updates every 5 seconds
```

You should see output like:
```
🏪 Restaurant Management System - Status Dashboard
==================================================
📊 System Overview
✅ System Status: HEALTHY
   Uptime: 2 minutes
   Memory: 145.2 MB used

🔧 Microservices Status
✅ API Gateway         Port: 3000 RUNNING (2m uptime)
✅ Tenant Service      Port: 3001 RUNNING (2m uptime)
✅ Menu Service        Port: 3002 RUNNING (2m uptime)
... (all services listed)
```

## 🌐 Accessing the Applications

### 1. API Gateway (Main Entry Point)
```
URL: http://localhost:3000
Health Check: http://localhost:3000/health
Service Status: http://localhost:3000/services/status
```

### 2. Admin Dashboard (Management Interface)
```bash
# Start the admin dashboard
cd apps/admin-dashboard
npm run dev

# Access at: http://localhost:3001
```

### 3. POS Interface (Point of Sale)
```bash
# Start the POS interface
cd apps/pos-interface
npm run dev

# Access at: http://localhost:3002
```

## 🧪 Testing the System

### 1. Quick Health Check
```bash
# Test if API Gateway is responding
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2024-01-05T...",
  "uptime": 120,
  "memory": {...}
}
```

### 2. Run System Validation
```bash
# Complete system validation (recommended first test)
npm run validate

# This will run 10 validation steps:
# ✅ System Health Check
# ✅ Unit Tests Validation
# ✅ Property-Based Tests Validation
# ✅ Integration Tests Validation
# ✅ Frontend Tests Validation
# ✅ Performance Benchmarks
# ✅ Security Validation
# ✅ Data Integrity Check
# ✅ API Documentation Validation
# ✅ Deployment Readiness
```

### 3. Run Individual Test Suites
```bash
# Unit tests (fast, ~30 seconds)
npm run test:unit

# Property-based tests (medium, ~1 minute)
npm run test:property

# Integration tests (comprehensive, ~5 minutes)
npm run test:integration

# All tests together
npm run test:all
```

### 4. Performance Testing
```bash
# Run performance-specific tests
npm run test:integration:performance

# This tests:
# - Response times (< 500ms for most operations)
# - Concurrent request handling (50+ concurrent)
# - Sustained load (95%+ success rate)
# - Memory usage (< 50% increase under load)
```

## 🏪 Testing Restaurant Operations

### 1. Create a Test Restaurant (Tenant)

```bash
# Create a new tenant via API
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "My Test Restaurant",
    "contactEmail": "admin@testrestaurant.com",
    "contactPhone": "+1234567890",
    "address": {
      "street": "123 Main Street",
      "city": "Test City",
      "state": "TS",
      "zipCode": "12345"
    }
  }'

# Save the returned tenant ID for subsequent requests
```

### 2. Set Up Your Restaurant

```bash
# Use the tenant ID from step 1
export TENANT_ID="your-tenant-id-here"

# Create an outlet
curl -X POST http://localhost:3000/api/tenants/outlets \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Main Branch",
    "address": {
      "street": "123 Restaurant Street",
      "city": "Food City",
      "state": "FC",
      "zipCode": "12345"
    },
    "operatingHours": {
      "monday": {"open": "09:00", "close": "22:00"},
      "tuesday": {"open": "09:00", "close": "22:00"},
      "wednesday": {"open": "09:00", "close": "22:00"},
      "thursday": {"open": "09:00", "close": "22:00"},
      "friday": {"open": "09:00", "close": "23:00"},
      "saturday": {"open": "09:00", "close": "23:00"},
      "sunday": {"open": "10:00", "close": "21:00"}
    }
  }'
```

### 3. Add Menu Items

```bash
# Create a menu category
curl -X POST http://localhost:3000/api/menu/categories \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Main Course",
    "description": "Hearty main dishes"
  }'

# Create menu items
curl -X POST http://localhost:3000/api/menu/items \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Grilled Chicken Burger",
    "description": "Juicy grilled chicken with fresh vegetables",
    "price": 15.99,
    "category": "Main Course",
    "preparationTime": 12,
    "isAvailable": true
  }'

curl -X POST http://localhost:3000/api/menu/items \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Margherita Pizza",
    "description": "Classic pizza with tomato, mozzarella, and basil",
    "price": 18.99,
    "category": "Main Course",
    "preparationTime": 15,
    "isAvailable": true
  }'
```

### 4. Add Inventory Items

```bash
# Add inventory items
curl -X POST http://localhost:3000/api/inventory/items \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Chicken Breast",
    "category": "Protein",
    "unit": "pieces",
    "currentStock": 100,
    "minimumStock": 20,
    "unitCost": 3.50
  }'

curl -X POST http://localhost:3000/api/inventory/items \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "Pizza Dough",
    "category": "Base",
    "unit": "pieces",
    "currentStock": 50,
    "minimumStock": 10,
    "unitCost": 1.25
  }'
```

### 5. Create a Customer

```bash
# Create a customer
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1987654321"
  }'

# Save the customer ID for orders
```

### 6. Process a Complete Order

```bash
# Get menu items to find IDs
curl -H "x-tenant-id: $TENANT_ID" \
  http://localhost:3000/api/menu/items

# Create an order (use actual menu item IDs from above)
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "customerId": "customer-id-from-step-5",
    "orderType": "DINE_IN",
    "items": [
      {
        "menuItemId": "menu-item-id-1",
        "quantity": 1,
        "unitPrice": 15.99
      },
      {
        "menuItemId": "menu-item-id-2", 
        "quantity": 1,
        "unitPrice": 18.99
      }
    ],
    "subtotal": 34.98,
    "tax": 3.15,
    "total": 38.13
  }'

# Finalize the order (generates KOT)
curl -X POST http://localhost:3000/api/pos/orders/ORDER_ID/finalize \
  -H "x-tenant-id: $TENANT_ID"

# Process payment
curl -X POST http://localhost:3000/api/payments/process \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -d '{
    "orderId": "ORDER_ID",
    "amount": 38.13,
    "paymentMethod": "credit_card"
  }'
```

### 7. View Analytics

```bash
# Get daily sales analytics
curl -H "x-tenant-id: $TENANT_ID" \
  "http://localhost:3000/api/analytics/sales/daily?date=2024-01-05"

# Get customer loyalty points
curl -H "x-tenant-id: $TENANT_ID" \
  http://localhost:3000/api/customers/CUSTOMER_ID/loyalty
```

## 🎯 Testing Multi-Tenant Isolation

### Test Tenant Separation
```bash
# Create a second tenant
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Second Restaurant",
    "contactEmail": "admin@secondrestaurant.com"
  }'

export TENANT_2_ID="second-tenant-id"

# Try to access first tenant's data with second tenant's ID
curl -H "x-tenant-id: $TENANT_2_ID" \
  http://localhost:3000/api/menu/items

# Should return empty array (no cross-tenant data access)
```

## 🔍 Monitoring & Debugging

### 1. Real-Time System Monitoring
```bash
# Watch system status in real-time
npm run status:watch

# This shows:
# - Service health and uptime
# - Memory usage
# - Request counts
# - Error rates
```

### 2. View Logs
```bash
# View API Gateway logs
tail -f services/api-gateway/logs/combined.log

# View specific service logs
tail -f services/pos-service/logs/combined.log

# View error logs only
tail -f services/*/logs/error.log
```

### 3. Debug Individual Services
```bash
# Test individual service health
curl http://localhost:3001/health  # Tenant Service
curl http://localhost:3004/health  # POS Service
curl http://localhost:3008/health  # Analytics Service
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check if ports are already in use
netstat -tulpn | grep :3000

# Kill processes using required ports
pkill -f "node.*3000"

# Restart the system
npm run restart
```

#### Tests Failing
```bash
# Ensure system is running first
npm run status

# Run validation to identify issues
npm run validate:verbose

# Check specific test output
npm run test:unit -- --verbose
```

#### Memory Issues
```bash
# Check system memory usage
npm run status

# Restart services to free memory
npm run restart

# Run with increased memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run start
```

#### Database Connection Issues
```bash
# Start database services
npm run docker:up

# Check database status
docker-compose ps

# Reset database if needed
npm run docker:down && npm run docker:up
```

## 📊 Performance Testing

### Load Testing
```bash
# Run performance tests
npm run test:integration:performance

# Test concurrent users (manual)
for i in {1..10}; do
  curl -H "x-tenant-id: $TENANT_ID" \
    http://localhost:3000/api/menu/items &
done
wait
```

### Stress Testing
```bash
# Run sustained load test
npm run test:integration:performance

# Monitor during load
npm run status:watch
```

## 🎉 Success Indicators

### System is Working When:
- ✅ All 11 services show "RUNNING" status
- ✅ API Gateway responds to health checks
- ✅ System validation passes all 10 steps
- ✅ You can create tenants, menus, and process orders
- ✅ Multi-tenant isolation is working (no cross-tenant data access)
- ✅ Performance tests meet response time targets
- ✅ Frontend applications load and function properly

### Expected Performance:
- **Health Checks**: < 50ms response time
- **Menu Queries**: < 300ms response time  
- **Order Creation**: < 500ms response time
- **Concurrent Requests**: 50+ simultaneous requests handled
- **System Uptime**: 99%+ availability during testing

## 🚀 Next Steps

Once the system is running successfully:

1. **Explore the Admin Dashboard** at http://localhost:3001
2. **Test the POS Interface** at http://localhost:3002
3. **Create multiple restaurants** to test multi-tenant features
4. **Run the complete integration test suite** with `npm run test:integration`
5. **Monitor system performance** with `npm run status:watch`
6. **Review the generated reports** in `validation-reports/` and `tests/integration/reports/`

## 📞 Getting Help

If you encounter issues:

1. **Check the system status**: `npm run status`
2. **Run system validation**: `npm run validate`
3. **Review logs**: Check `services/*/logs/` directories
4. **Restart the system**: `npm run restart`
5. **Check the troubleshooting section** above

The Restaurant Management System is now ready for testing and evaluation! 🎉
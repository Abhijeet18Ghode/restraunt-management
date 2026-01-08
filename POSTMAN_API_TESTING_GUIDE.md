# Restaurant Management System - Postman API Testing Guide

## Overview
This guide provides comprehensive API testing instructions using Postman for the Restaurant Management System backend services.

## Prerequisites
- System running with `npm start`
- Postman installed
- All services should be running on their respective ports

## Service Endpoints Overview

### 🌐 API Gateway (Port 3000)
- **Base URL**: `http://localhost:3000`
- **Purpose**: Central routing hub for all services
- **Health Check**: `GET /health`

### 🏢 Tenant Service (Port 3001)
- **Base URL**: `http://localhost:3001`
- **Purpose**: Multi-tenant management
- **Routes**: `/api/tenants/*`

### 🍽️ Menu Service (Port 3002)
- **Base URL**: `http://localhost:3002`
- **Purpose**: Menu and item management
- **Routes**: `/api/menu/*`

### 📦 Inventory Service (Port 3003)
- **Base URL**: `http://localhost:3003`
- **Purpose**: Stock and inventory management
- **Routes**: `/api/inventory/*`

### 👥 Staff Service (Port 3006)
- **Base URL**: `http://localhost:3006`
- **Purpose**: Staff management and authentication
- **Routes**: `/api/staff/*`, `/api/auth/*`

### 👤 Customer Service (Port 3007)
- **Base URL**: `http://localhost:3007`
- **Purpose**: Customer management
- **Routes**: `/api/customers/*`

### 🛒 POS Service (Port 3004)
- **Base URL**: `http://localhost:3004`
- **Purpose**: Point of sale operations
- **Routes**: `/api/pos/*`

### 🛍️ Online Order Service (Port 3005)
- **Base URL**: `http://localhost:3005`
- **Purpose**: Online ordering system
- **Routes**: `/api/online-orders/*`

### 💳 Payment Service (Port 3009)
- **Base URL**: `http://localhost:3009`
- **Purpose**: Payment processing
- **Routes**: `/api/payments/*`

### 📊 Analytics Service (Port 3008)
- **Base URL**: `http://localhost:3008`
- **Purpose**: Business analytics and reporting
- **Routes**: `/api/analytics/*`

### 🔌 WebSocket Service (Port 3010)
- **Base URL**: `http://localhost:3010`
- **Purpose**: Real-time communications
- **Routes**: WebSocket connections

---

## 🧪 Testing Strategy

### Phase 1: Health Checks
Test all services are running and responding.

### Phase 2: Direct Service Testing
Test each service individually on their direct ports.

### Phase 3: API Gateway Routing
Test all services through the API Gateway.

### Phase 4: Authentication Flow
Test login, token validation, and protected routes.

### Phase 5: CRUD Operations
Test Create, Read, Update, Delete operations for each service.

### Phase 6: Integration Testing
Test cross-service communication and workflows.

---

## 📋 Postman Collection Structure

### Collection: Restaurant Management System API Tests

#### Folder 1: Health Checks
- API Gateway Health
- All Services Health Checks

#### Folder 2: Authentication
- Login (Staff Service)
- Token Validation
- Logout

#### Folder 3: Tenant Management
- Get All Tenants
- Create Tenant
- Get Tenant by ID
- Update Tenant
- Delete Tenant

#### Folder 4: Menu Management
- Get Menu Items
- Create Menu Item
- Update Menu Item
- Delete Menu Item

#### Folder 5: Inventory Management
- Get Inventory Items
- Update Stock Levels
- Low Stock Alerts

#### Folder 6: Staff Management
- Get Staff List
- Create Staff Member
- Update Staff Info
- Staff Attendance

#### Folder 7: Customer Management
- Get Customers
- Create Customer
- Update Customer
- Customer Orders

#### Folder 8: Order Management (POS)
- Create Order
- Get Orders
- Update Order Status
- Cancel Order

#### Folder 9: Online Orders
- Get Online Orders
- Process Online Order
- Update Delivery Status

#### Folder 10: Payment Processing
- Process Payment
- Get Payment History
- Refund Payment

#### Folder 11: Analytics
- Daily Sales Report
- Popular Items
- Staff Performance
- Customer Analytics

---

## 🚀 Quick Start Testing Sequence

### Step 1: Verify System Status
```
GET http://localhost:3000/health
Expected: 200 OK with gateway info
```

### Step 2: Test Service Discovery
```
GET http://localhost:3000/services/status
Expected: 200 OK with all service statuses
```

### Step 3: Test Authentication
```
POST http://localhost:3000/api/auth/login
Body: {
  "email": "admin@restaurant.com",
  "password": "admin123"
}
Expected: 200 OK with token
```

### Step 4: Test Tenant Operations
```
GET http://localhost:3000/api/tenants
Expected: 200 OK with tenant list
```

### Step 5: Test Menu Operations
```
GET http://localhost:3000/api/menu
Expected: 200 OK with menu items
```

---

## 🔧 Common Headers

### For All Requests:
```
Content-Type: application/json
Accept: application/json
```

### For Authenticated Requests:
```
Authorization: Bearer {{token}}
x-tenant-id: {{tenantId}}
```

---

## 📊 Expected Response Formats

### Success Response:
```json
{
  "success": true,
  "data": {...},
  "message": "Operation completed successfully"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2026-01-06T10:00:00.000Z"
}
```

---

## 🐛 Common Issues and Solutions

### Issue 1: CORS Errors
- **Problem**: Cross-origin requests blocked
- **Solution**: Check service CORS configuration
- **Test**: Use Postman (no CORS restrictions)

### Issue 2: 404 Not Found
- **Problem**: Route not found
- **Solution**: Verify service is running and route exists
- **Test**: Check service health endpoint first

### Issue 3: 408 Request Timeout
- **Problem**: Service not responding
- **Solution**: Check service logs and restart if needed
- **Test**: Test direct service endpoint

### Issue 4: 500 Internal Server Error
- **Problem**: Server-side error
- **Solution**: Check service logs for error details
- **Test**: Verify request format and required fields

---

## 📝 Testing Checklist

### ✅ Pre-Testing
- [ ] All services running (`npm start`)
- [ ] Postman installed and configured
- [ ] Environment variables set up
- [ ] Test data prepared

### ✅ Health Checks
- [ ] API Gateway health check passes
- [ ] All service health checks pass
- [ ] Service discovery endpoint works
- [ ] CORS headers present

### ✅ Authentication
- [ ] Login with valid credentials works
- [ ] Login with invalid credentials fails appropriately
- [ ] Token validation works
- [ ] Protected routes require authentication

### ✅ CRUD Operations
- [ ] Create operations work
- [ ] Read operations return correct data
- [ ] Update operations modify data correctly
- [ ] Delete operations remove data properly

### ✅ Error Handling
- [ ] Invalid requests return appropriate errors
- [ ] Missing required fields are validated
- [ ] Proper HTTP status codes returned
- [ ] Error messages are descriptive

---

## 🎯 Priority Testing Order

1. **Critical Path**: Health → Auth → Tenants
2. **Core Features**: Menu → Inventory → Orders
3. **Supporting Features**: Staff → Customers → Payments
4. **Advanced Features**: Analytics → WebSocket

---

## 📞 Support

If you encounter issues during testing:
1. Check service logs in the terminal
2. Verify service is running on correct port
3. Test direct service endpoint first
4. Check request format and headers
5. Review error messages for clues

---

## 🔄 Continuous Testing

For ongoing development:
1. Run health checks before each testing session
2. Test new endpoints as they're developed
3. Maintain test data consistency
4. Document any new issues found
5. Update collection as APIs evolve
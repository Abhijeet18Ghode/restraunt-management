# Admin Dashboard Backend Analysis

## Overview
This document provides a comprehensive analysis of all backend services that support the admin dashboard functionality, including detailed API endpoints, data models, authentication flows, and testing strategies.

## System Architecture

### Service Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Dashboard   │    │   API Gateway       │    │   Backend Services  │
│   (Frontend)        │────│   Port 3000         │────│   Ports 3001-3010   │
│   Port 3011         │    │                     │    │                     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Services Architecture
```
API Gateway (3000)
├── Tenant Service (3001) - Multi-tenancy & Auth
├── Menu Service (3002) - Menu & Categories
├── Inventory Service (3003) - Stock Management
├── POS Service (3004) - Point of Sale
├── Online Order Service (3005) - Online Orders
├── Staff Service (3006) - Staff Management
├── Customer Service (3007) - Customer Data
├── Analytics Service (3008) - Reports & Analytics
├── Payment Service (3009) - Payment Processing
└── WebSocket Service (3010) - Real-time Updates
```

## Detailed Service Analysis

### 1. API Gateway Service (Port 3000)
**Purpose**: Central routing hub for all admin dashboard requests

#### Key Endpoints:
- `GET /health` - Gateway health check
- `GET /services/status` - All services health status
- `GET /services` - Service discovery
- `/*` - Route to appropriate backend services

#### Routing Configuration:
```javascript
const apiRoutes = {
  '/api/tenants': 'tenant-service',
  '/api/auth': 'tenant-service',
  '/api/menu': 'menu-service',
  '/api/categories': 'menu-service',
  '/api/inventory': 'inventory-service',
  '/api/inventory/menu-items': 'inventory-service',
  '/api/pos': 'pos-service',
  '/api/online-orders': 'online-order-service',
  '/api/staff': 'staff-service',
  '/api/customers': 'customer-service',
  '/api/analytics': 'analytics-service',
  '/api/payments': 'payment-service'
};
```

#### Critical Features:
- Request/Response logging with timing
- Error handling with structured responses
- Header forwarding (x-tenant-id, x-request-id)
- Path rewriting for complex routes
- Service health monitoring

---

### 2. Tenant Service (Port 3001)
**Purpose**: Multi-tenant management and authentication

#### Authentication Endpoints:
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/verify` - Token verification
- `POST /auth/refresh` - Token refresh

#### Tenant Management Endpoints:
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

#### Data Models:
```javascript
// Tenant Model
{
  id: "uuid",
  name: "string",
  email: "string",
  phone: "string",
  address: "object",
  subscription: "object",
  settings: "object",
  createdAt: "datetime",
  updatedAt: "datetime"
}

// User/Staff Model
{
  id: "uuid",
  tenantId: "uuid",
  email: "string",
  password: "hashed",
  role: "admin|manager|staff",
  permissions: "array",
  profile: "object",
  isActive: "boolean"
}
```

---

### 3. Menu Service (Port 3002)
**Purpose**: Menu categories and items management

#### Category Endpoints:
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/:id` - Get category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category
- `POST /api/categories/reorder` - Reorder categories

#### Menu Item Endpoints:
- `GET /api/menu/items` - List menu items
- `POST /api/menu/items` - Create menu item
- `GET /api/menu/items/:id` - Get menu item
- `PUT /api/menu/items/:id` - Update menu item
- `DELETE /api/menu/items/:id` - Delete menu item
- `PATCH /api/menu/items/:id/availability` - Toggle availability
- `PATCH /api/menu/items/availability` - Bulk availability update

#### Data Models:
```javascript
// Category Model
{
  id: "uuid",
  tenantId: "uuid",
  outletId: "uuid",
  name: "string",
  description: "string",
  displayOrder: "number",
  isActive: "boolean",
  createdAt: "datetime",
  updatedAt: "datetime"
}

// Menu Item Model
{
  id: "uuid",
  tenantId: "uuid",
  outletId: "uuid",
  categoryId: "uuid",
  name: "string",
  description: "string",
  price: "decimal",
  cost: "decimal",
  isAvailable: "boolean",
  inventoryTracked: "boolean",
  minimumStock: "number",
  displayOrder: "number",
  images: "array",
  allergens: "array",
  nutritionalInfo: "object",
  createdAt: "datetime",
  updatedAt: "datetime"
}
```

---

### 4. Inventory Service (Port 3003)
**Purpose**: Stock management and inventory tracking

#### Inventory Endpoints:
- `GET /api/inventory/items` - List inventory items
- `POST /api/inventory/items` - Create inventory item
- `GET /api/inventory/items/:id` - Get inventory item
- `PUT /api/inventory/items/:id` - Update inventory item
- `PATCH /api/inventory/items/:id/stock` - Update stock level
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/menu-items/status` - Menu items availability
- `POST /api/inventory/menu-items/sync` - Sync with menu service

#### Data Models:
```javascript
// Inventory Item Model
{
  id: "uuid",
  tenantId: "uuid",
  outletId: "uuid",
  menuItemId: "uuid", // Optional link to menu item
  name: "string",
  sku: "string",
  currentStock: "number",
  minimumStock: "number",
  maximumStock: "number",
  unit: "string", // kg, pieces, liters, etc.
  costPerUnit: "decimal",
  supplier: "object",
  lastRestocked: "datetime",
  expiryDate: "datetime",
  location: "string",
  isActive: "boolean"
}
```

---

### 5. Staff Service (Port 3006)
**Purpose**: Staff management and scheduling

#### Staff Endpoints:
- `GET /api/staff` - List staff members
- `POST /api/staff` - Create staff member
- `GET /api/staff/:id` - Get staff details
- `PUT /api/staff/:id` - Update staff member
- `DELETE /api/staff/:id` - Delete staff member
- `POST /api/staff/:id/schedule` - Create schedule
- `GET /api/staff/attendance` - Get attendance records
- `POST /api/staff/attendance/checkin` - Check in
- `POST /api/staff/attendance/checkout` - Check out

#### Data Models:
```javascript
// Staff Member Model
{
  id: "uuid",
  tenantId: "uuid",
  outletId: "uuid",
  employeeId: "string",
  firstName: "string",
  lastName: "string",
  email: "string",
  phone: "string",
  role: "string",
  department: "string",
  hourlyRate: "decimal",
  hireDate: "date",
  isActive: "boolean",
  permissions: "array",
  schedule: "object"
}
```

---

### 6. Customer Service (Port 3007)
**Purpose**: Customer data and loyalty management

#### Customer Endpoints:
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/:id` - Get customer details
- `PUT /api/customers/:id` - Update customer
- `GET /api/customers/:id/orders` - Customer order history
- `GET /api/customers/loyalty` - Loyalty program data

#### Data Models:
```javascript
// Customer Model
{
  id: "uuid",
  tenantId: "uuid",
  firstName: "string",
  lastName: "string",
  email: "string",
  phone: "string",
  dateOfBirth: "date",
  address: "object",
  loyaltyPoints: "number",
  totalSpent: "decimal",
  visitCount: "number",
  lastVisit: "datetime",
  preferences: "object",
  isActive: "boolean"
}
```

---

### 7. Analytics Service (Port 3008)
**Purpose**: Business intelligence and reporting

#### Analytics Endpoints:
- `GET /api/analytics/dashboard` - Dashboard summary
- `GET /api/analytics/sales/daily` - Daily sales report
- `GET /api/analytics/sales/monthly` - Monthly sales report
- `GET /api/analytics/items/popular` - Popular items
- `GET /api/analytics/staff/performance` - Staff performance
- `GET /api/analytics/customers/insights` - Customer insights
- `GET /api/analytics/inventory/turnover` - Inventory turnover
- `POST /api/analytics/reports/custom` - Custom report generation

#### Data Models:
```javascript
// Sales Analytics Model
{
  date: "date",
  tenantId: "uuid",
  outletId: "uuid",
  totalSales: "decimal",
  totalOrders: "number",
  averageOrderValue: "decimal",
  topItems: "array",
  hourlyBreakdown: "object",
  paymentMethods: "object"
}
```

---

### 8. Payment Service (Port 3009)
**Purpose**: Payment processing and financial tracking

#### Payment Endpoints:
- `POST /api/payments/process` - Process payment
- `GET /api/payments/history` - Payment history
- `POST /api/payments/refund` - Process refund
- `GET /api/payments/methods` - Available payment methods
- `GET /api/payments/reports` - Financial reports

---

### 9. POS Service (Port 3004)
**Purpose**: Point of sale operations

#### POS Endpoints:
- `POST /api/pos/orders` - Create order
- `GET /api/pos/orders` - List orders
- `GET /api/pos/orders/:id` - Get order details
- `PUT /api/pos/orders/:id` - Update order
- `POST /api/pos/orders/:id/payment` - Process order payment
- `GET /api/pos/tables` - Table management
- `POST /api/pos/tables/:id/assign` - Assign table

---

### 10. Online Order Service (Port 3005)
**Purpose**: Online ordering system

#### Online Order Endpoints:
- `GET /api/online-orders` - List online orders
- `PUT /api/online-orders/:id/status` - Update order status
- `GET /api/online-orders/pending` - Pending orders
- `POST /api/online-orders/:id/assign-delivery` - Assign delivery

---

## Admin Dashboard Frontend Integration

### Service Dependencies by Dashboard Section:

#### 1. Dashboard Home
- **Analytics Service**: Dashboard summary, sales metrics
- **POS Service**: Recent orders, table status
- **Staff Service**: Staff attendance, current shifts

#### 2. Menu Management
- **Menu Service**: Categories, items, pricing
- **Inventory Service**: Stock levels, availability sync
- **Analytics Service**: Item performance metrics

#### 3. Inventory Management
- **Inventory Service**: Stock levels, low stock alerts
- **Menu Service**: Menu item linking
- **Analytics Service**: Inventory turnover reports

#### 4. Staff Management
- **Staff Service**: Employee data, scheduling
- **Analytics Service**: Staff performance metrics
- **Tenant Service**: Role and permission management

#### 5. Customer Management
- **Customer Service**: Customer data, loyalty
- **POS Service**: Order history
- **Analytics Service**: Customer insights

#### 6. Analytics & Reports
- **Analytics Service**: All reporting functionality
- **Payment Service**: Financial data
- **All Services**: Data aggregation

---

## Authentication & Authorization Flow

### 1. Login Process
```
Admin Dashboard → API Gateway → Tenant Service
1. POST /api/auth/login
2. Validate credentials
3. Generate JWT token
4. Return token + user info
5. Store token in frontend
```

### 2. Authenticated Requests
```
Admin Dashboard → API Gateway → Backend Service
1. Include Authorization: Bearer <token>
2. Include x-tenant-id header
3. Gateway forwards headers
4. Service validates token
5. Process request with tenant context
```

### 3. Token Refresh
```
Admin Dashboard → API Gateway → Tenant Service
1. POST /api/auth/refresh
2. Validate refresh token
3. Generate new access token
4. Return new token
```

---

## Error Handling Strategy

### Standard Error Response Format:
```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": "Additional error details",
  "timestamp": "2026-01-11T10:00:00.000Z",
  "requestId": "req-123456789"
}
```

### Common Error Codes:
- `AUTHENTICATION_REQUIRED` - 401
- `INSUFFICIENT_PERMISSIONS` - 403
- `RESOURCE_NOT_FOUND` - 404
- `VALIDATION_ERROR` - 400
- `SERVICE_UNAVAILABLE` - 503
- `INTERNAL_ERROR` - 500

---

## Database Schema Overview

### Core Tables:
1. **tenants** - Tenant information
2. **users** - User accounts and authentication
3. **outlets** - Restaurant locations
4. **categories** - Menu categories
5. **menu_items** - Menu items
6. **inventory_items** - Inventory tracking
7. **staff** - Staff members
8. **customers** - Customer data
9. **orders** - Order records
10. **payments** - Payment transactions

### Relationships:
- Tenant → Users (1:many)
- Tenant → Outlets (1:many)
- Outlet → Categories (1:many)
- Category → Menu Items (1:many)
- Menu Item → Inventory Item (1:1 optional)
- Staff → Outlet (many:1)
- Customer → Orders (1:many)
- Order → Payments (1:many)

---

## Performance Considerations

### Caching Strategy:
- **Menu Data**: Redis cache for frequently accessed menu items
- **User Sessions**: JWT tokens with Redis session store
- **Analytics**: Cached daily/hourly aggregations
- **Inventory**: Real-time stock levels with cache invalidation

### Database Optimization:
- Indexed tenant_id on all tables
- Composite indexes for common queries
- Read replicas for analytics queries
- Connection pooling for high concurrency

---

## Security Measures

### API Security:
- JWT token authentication
- Rate limiting per endpoint
- Request/response logging
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers

### Data Security:
- Tenant data isolation
- Encrypted sensitive data
- Audit trails for critical operations
- Role-based access control
- Regular security updates

---

## Monitoring & Logging

### Health Monitoring:
- Service health endpoints
- Database connection monitoring
- API response time tracking
- Error rate monitoring
- Resource usage tracking

### Logging Strategy:
- Structured JSON logging
- Request/response correlation IDs
- Error stack traces
- Performance metrics
- Security event logging

---

## Testing Strategy

### 1. Unit Testing
- Individual service endpoint testing
- Business logic validation
- Error handling verification
- Data model validation

### 2. Integration Testing
- Cross-service communication
- Database transaction testing
- Authentication flow testing
- End-to-end workflow testing

### 3. Performance Testing
- Load testing for peak usage
- Database query optimization
- Memory usage monitoring
- Response time benchmarking

### 4. Security Testing
- Authentication bypass attempts
- Authorization validation
- Input validation testing
- SQL injection testing

---

## Deployment Architecture

### Development Environment:
```
Local Development:
- All services on localhost
- SQLite/PostgreSQL database
- Redis for caching
- File-based logging
```

### Production Environment:
```
Production Setup:
- Load balancer
- Multiple service instances
- Database cluster
- Redis cluster
- Centralized logging
- Monitoring dashboard
```

---

## API Documentation

### OpenAPI/Swagger:
Each service should provide:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Error response examples
- Rate limiting information

### Postman Collections:
- Organized by service
- Environment variables
- Pre-request scripts
- Test assertions
- Example requests/responses

---

This comprehensive backend analysis provides the foundation for thorough testing and understanding of the admin dashboard's backend architecture. Each service plays a critical role in delivering the complete restaurant management experience.
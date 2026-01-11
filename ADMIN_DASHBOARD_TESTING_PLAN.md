# Admin Dashboard Backend Testing Plan

## Overview
This document outlines a comprehensive testing strategy for all backend services supporting the admin dashboard, with detailed test cases, expected responses, and troubleshooting guides.

## Testing Environment Setup

### Prerequisites
1. **System Running**: All services started with `npm start`
2. **Postman Installed**: Latest version with collections imported
3. **Test Data**: Sample tenants, users, and menu items
4. **Environment Variables**: Properly configured for testing

### Service Status Verification
Before testing, verify all services are running:

```bash
# Check if all services are running
curl http://localhost:3000/services/status
```

Expected services and ports:
- API Gateway: 3000 ✅
- Tenant Service: 3001 ✅
- Menu Service: 3002 ✅
- Inventory Service: 3003 ✅
- POS Service: 3004 ✅
- Online Order Service: 3005 ✅
- Staff Service: 3006 ✅
- Customer Service: 3007 ✅
- Analytics Service: 3008 ✅
- Payment Service: 3009 ✅
- WebSocket Service: 3010 ✅

---

## Phase 1: Infrastructure Testing

### 1.1 API Gateway Health Check
**Endpoint**: `GET http://localhost:3000/health`

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "api-gateway",
  "timestamp": "2026-01-11T10:00:00.000Z",
  "uptime": 123.456,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 20000000
  },
  "version": "1.0.0"
}
```

**Test Cases**:
- ✅ Status code is 200
- ✅ Response contains required fields
- ✅ Uptime is greater than 0
- ✅ Memory usage is reasonable

### 1.2 Service Discovery
**Endpoint**: `GET http://localhost:3000/services/status`

**Expected Response**:
```json
{
  "health": {
    "tenant-service": {
      "status": "healthy",
      "uptime": 123.456,
      "url": "http://localhost:3001"
    },
    "menu-service": {
      "status": "healthy",
      "uptime": 123.456,
      "url": "http://localhost:3002"
    }
    // ... other services
  },
  "timestamp": "2026-01-11T10:00:00.000Z",
  "gateway": {
    "status": "healthy",
    "uptime": 123.456
  }
}
```

**Test Cases**:
- ✅ All services show "healthy" status
- ✅ No services show "offline" status
- ✅ Response time < 5 seconds
- ✅ All expected services are present

### 1.3 Routing Verification
Test that API Gateway correctly routes requests:

**Test Routes**:
1. `GET http://localhost:3000/api/tenants` → Tenant Service
2. `GET http://localhost:3000/api/menu` → Menu Service
3. `GET http://localhost:3000/api/inventory` → Inventory Service
4. `GET http://localhost:3000/api/staff` → Staff Service

**Expected Behavior**:
- Routes to correct service (check logs)
- Returns service response or 503 if service down
- Headers forwarded correctly
- Request ID generated and logged

---

## Phase 2: Authentication Testing

### 2.1 Login Flow Testing

#### Test Case 1: Valid Login
**Endpoint**: `POST http://localhost:3000/api/auth/login`

**Request Body**:
```json
{
  "email": "admin@restaurant.com",
  "password": "admin123"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "id": "user-uuid",
      "email": "admin@restaurant.com",
      "role": "admin",
      "tenantId": "tenant-uuid",
      "permissions": ["read", "write", "delete"]
    },
    "tenant": {
      "id": "tenant-uuid",
      "name": "Test Restaurant",
      "settings": {}
    }
  },
  "message": "Login successful"
}
```

**Test Validations**:
- ✅ Status code is 200
- ✅ Token is present and valid JWT format
- ✅ User object contains required fields
- ✅ Tenant information is included
- ✅ Response time < 2 seconds

#### Test Case 2: Invalid Credentials
**Request Body**:
```json
{
  "email": "admin@restaurant.com",
  "password": "wrongpassword"
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

**Test Validations**:
- ✅ Status code is 401
- ✅ No token returned
- ✅ Appropriate error message
- ✅ Error code is correct

#### Test Case 3: Missing Fields
**Request Body**:
```json
{
  "email": "admin@restaurant.com"
}
```

**Expected Response**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Password is required",
  "details": {
    "field": "password",
    "code": "REQUIRED"
  },
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

### 2.2 Token Validation Testing

#### Test Case 1: Valid Token
**Endpoint**: `GET http://localhost:3000/api/auth/verify`

**Headers**:
```
Authorization: Bearer {{token}}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": "user-uuid",
      "email": "admin@restaurant.com",
      "role": "admin",
      "tenantId": "tenant-uuid"
    }
  }
}
```

#### Test Case 2: Invalid/Expired Token
**Headers**:
```
Authorization: Bearer invalid_token
```

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "Token is invalid or expired",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```

---

## Phase 3: Menu Management Testing

### 3.1 Category Management

#### Test Case 1: Get All Categories
**Endpoint**: `GET http://localhost:3000/api/categories`

**Headers**:
```
Authorization: Bearer {{token}}
x-tenant-id: {{tenantId}}
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "category-uuid",
      "name": "Appetizers",
      "description": "Starter dishes",
      "displayOrder": 1,
      "isActive": true,
      "itemCount": 5,
      "createdAt": "2026-01-11T10:00:00.000Z",
      "updatedAt": "2026-01-11T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50
  }
}
```

**Test Validations**:
- ✅ Status code is 200
- ✅ Returns array of categories
- ✅ Each category has required fields
- ✅ Categories are ordered by displayOrder
- ✅ Meta information is present

#### Test Case 2: Create New Category
**Endpoint**: `POST http://localhost:3000/api/categories`

**Request Body**:
```json
{
  "name": "Main Courses",
  "description": "Primary dishes",
  "displayOrder": 2,
  "isActive": true
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "new-category-uuid",
    "name": "Main Courses",
    "description": "Primary dishes",
    "displayOrder": 2,
    "isActive": true,
    "tenantId": "tenant-uuid",
    "outletId": "outlet-uuid",
    "createdAt": "2026-01-11T10:00:00.000Z",
    "updatedAt": "2026-01-11T10:00:00.000Z"
  },
  "message": "Category created successfully"
}
```

**Test Validations**:
- ✅ Status code is 201
- ✅ Returns created category with ID
- ✅ All fields are correctly set
- ✅ Tenant and outlet IDs are set
- ✅ Timestamps are present

#### Test Case 3: Update Category
**Endpoint**: `PUT http://localhost:3000/api/categories/{{categoryId}}`

**Request Body**:
```json
{
  "name": "Updated Category Name",
  "description": "Updated description",
  "isActive": false
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "category-uuid",
    "name": "Updated Category Name",
    "description": "Updated description",
    "isActive": false,
    "updatedAt": "2026-01-11T10:05:00.000Z"
  },
  "message": "Category updated successfully"
}
```

#### Test Case 4: Delete Category
**Endpoint**: `DELETE http://localhost:3000/api/categories/{{categoryId}}`

**Expected Response**:
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

**Test Validations**:
- ✅ Status code is 200
- ✅ Category is removed from database
- ✅ Associated menu items are handled appropriately

#### Test Case 5: Reorder Categories
**Endpoint**: `POST http://localhost:3000/api/categories/reorder`

**Request Body**:
```json
{
  "categories": [
    {"id": "category-1", "displayOrder": 1},
    {"id": "category-2", "displayOrder": 2},
    {"id": "category-3", "displayOrder": 3}
  ]
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "categories": [
      {"id": "category-1", "displayOrder": 1},
      {"id": "category-2", "displayOrder": 2},
      {"id": "category-3", "displayOrder": 3}
    ]
  },
  "message": "Categories reordered successfully"
}
```

### 3.2 Menu Item Management

#### Test Case 1: Get Menu Items
**Endpoint**: `GET http://localhost:3000/api/menu/items`

**Query Parameters**:
- `categoryId` (optional)
- `page` (default: 1)
- `limit` (default: 50)
- `search` (optional)
- `isAvailable` (optional)

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "item-uuid",
      "name": "Chicken Caesar Salad",
      "description": "Fresh romaine lettuce with grilled chicken",
      "price": 12.99,
      "cost": 6.50,
      "categoryId": "category-uuid",
      "categoryName": "Salads",
      "isAvailable": true,
      "inventoryTracked": true,
      "currentStock": 25,
      "minimumStock": 5,
      "displayOrder": 1,
      "images": ["image1.jpg"],
      "allergens": ["gluten", "dairy"],
      "nutritionalInfo": {
        "calories": 450,
        "protein": 35,
        "carbs": 15,
        "fat": 28
      },
      "createdAt": "2026-01-11T10:00:00.000Z",
      "updatedAt": "2026-01-11T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

#### Test Case 2: Create Menu Item
**Endpoint**: `POST http://localhost:3000/api/menu/items`

**Request Body**:
```json
{
  "name": "Grilled Salmon",
  "description": "Fresh Atlantic salmon with herbs",
  "price": 18.99,
  "cost": 9.50,
  "categoryId": "category-uuid",
  "isAvailable": true,
  "inventoryTracked": true,
  "minimumStock": 10,
  "allergens": ["fish"],
  "nutritionalInfo": {
    "calories": 350,
    "protein": 40,
    "carbs": 5,
    "fat": 18
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "new-item-uuid",
    "name": "Grilled Salmon",
    "description": "Fresh Atlantic salmon with herbs",
    "price": 18.99,
    "cost": 9.50,
    "categoryId": "category-uuid",
    "isAvailable": true,
    "inventoryTracked": true,
    "minimumStock": 10,
    "displayOrder": 1,
    "tenantId": "tenant-uuid",
    "outletId": "outlet-uuid",
    "createdAt": "2026-01-11T10:00:00.000Z",
    "updatedAt": "2026-01-11T10:00:00.000Z"
  },
  "message": "Menu item created successfully"
}
```

#### Test Case 3: Update Menu Item Availability
**Endpoint**: `PATCH http://localhost:3000/api/menu/items/{{itemId}}/availability`

**Request Body**:
```json
{
  "isAvailable": false,
  "reason": "Out of stock"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "item-uuid",
    "isAvailable": false,
    "reason": "Out of stock",
    "updatedAt": "2026-01-11T10:05:00.000Z"
  },
  "message": "Item availability updated successfully"
}
```

#### Test Case 4: Bulk Availability Update
**Endpoint**: `PATCH http://localhost:3000/api/menu/items/availability`

**Request Body**:
```json
{
  "items": [
    {"id": "item-1", "isAvailable": false, "reason": "Out of stock"},
    {"id": "item-2", "isAvailable": true},
    {"id": "item-3", "isAvailable": false, "reason": "Seasonal item"}
  ]
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "results": [
      {"id": "item-1", "isAvailable": false, "status": "updated"},
      {"id": "item-2", "isAvailable": true, "status": "updated"},
      {"id": "item-3", "isAvailable": false, "status": "updated"}
    ]
  },
  "message": "Bulk availability update completed"
}
```

---

## Phase 4: Inventory Management Testing

### 4.1 Inventory Items

#### Test Case 1: Get Inventory Items
**Endpoint**: `GET http://localhost:3000/api/inventory/items`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "inventory-uuid",
      "name": "Chicken Breast",
      "sku": "CHK-BREAST-001",
      "currentStock": 50,
      "minimumStock": 10,
      "maximumStock": 100,
      "unit": "kg",
      "costPerUnit": 8.50,
      "menuItemId": "menu-item-uuid",
      "menuItemName": "Grilled Chicken",
      "supplier": {
        "name": "Fresh Foods Ltd",
        "contact": "supplier@freshfoods.com"
      },
      "lastRestocked": "2026-01-10T14:00:00.000Z",
      "expiryDate": "2026-01-15T00:00:00.000Z",
      "location": "Freezer A1",
      "isActive": true,
      "stockStatus": "adequate", // low, adequate, high
      "createdAt": "2026-01-11T10:00:00.000Z",
      "updatedAt": "2026-01-11T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "lowStockCount": 0,
    "expiringSoonCount": 1
  }
}
```

#### Test Case 2: Get Low Stock Items
**Endpoint**: `GET http://localhost:3000/api/inventory/low-stock`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "inventory-uuid",
      "name": "Tomatoes",
      "currentStock": 3,
      "minimumStock": 10,
      "unit": "kg",
      "stockStatus": "low",
      "daysUntilEmpty": 2,
      "menuItemsAffected": [
        {"id": "item-1", "name": "Caesar Salad"},
        {"id": "item-2", "name": "Margherita Pizza"}
      ]
    }
  ],
  "meta": {
    "total": 1,
    "criticalCount": 1
  }
}
```

#### Test Case 3: Update Stock Level
**Endpoint**: `PATCH http://localhost:3000/api/inventory/items/{{itemId}}/stock`

**Request Body**:
```json
{
  "currentStock": 75,
  "operation": "restock", // restock, consume, adjust
  "quantity": 25,
  "reason": "Weekly delivery",
  "cost": 212.50
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "inventory-uuid",
    "previousStock": 50,
    "currentStock": 75,
    "operation": "restock",
    "quantity": 25,
    "stockStatus": "adequate",
    "updatedAt": "2026-01-11T10:05:00.000Z"
  },
  "message": "Stock level updated successfully"
}
```

### 4.2 Menu-Inventory Integration

#### Test Case 1: Get Menu Items Availability Status
**Endpoint**: `GET http://localhost:3000/api/inventory/menu-items/status`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "menuItemId": "item-uuid",
      "menuItemName": "Grilled Chicken",
      "isAvailable": true,
      "stockStatus": "adequate",
      "inventoryItems": [
        {
          "id": "inv-1",
          "name": "Chicken Breast",
          "currentStock": 50,
          "minimumStock": 10,
          "unit": "kg"
        }
      ],
      "estimatedServings": 100,
      "daysUntilOutOfStock": 7
    }
  ]
}
```

#### Test Case 2: Sync Menu with Inventory
**Endpoint**: `POST http://localhost:3000/api/inventory/menu-items/sync`

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "synced": 15,
    "updated": 3,
    "unavailable": 2,
    "results": [
      {"menuItemId": "item-1", "status": "available", "action": "none"},
      {"menuItemId": "item-2", "status": "unavailable", "action": "disabled", "reason": "Out of stock"},
      {"menuItemId": "item-3", "status": "available", "action": "enabled", "reason": "Restocked"}
    ]
  },
  "message": "Menu-inventory sync completed"
}
```

---

## Phase 5: Staff Management Testing

### 5.1 Staff Operations

#### Test Case 1: Get Staff List
**Endpoint**: `GET http://localhost:3000/api/staff`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "staff-uuid",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@restaurant.com",
      "phone": "+1234567890",
      "role": "server",
      "department": "front-of-house",
      "hourlyRate": 15.50,
      "hireDate": "2025-01-01",
      "isActive": true,
      "currentShift": {
        "id": "shift-uuid",
        "startTime": "2026-01-11T09:00:00.000Z",
        "endTime": "2026-01-11T17:00:00.000Z",
        "status": "active"
      },
      "permissions": ["pos", "orders"],
      "performance": {
        "rating": 4.5,
        "ordersServed": 150,
        "customerRating": 4.7
      }
    }
  ],
  "meta": {
    "total": 1,
    "activeShifts": 5,
    "totalStaff": 12
  }
}
```

#### Test Case 2: Create Staff Member
**Endpoint**: `POST http://localhost:3000/api/staff`

**Request Body**:
```json
{
  "employeeId": "EMP002",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.smith@restaurant.com",
  "phone": "+1234567891",
  "role": "chef",
  "department": "kitchen",
  "hourlyRate": 18.00,
  "hireDate": "2026-01-11",
  "permissions": ["kitchen", "inventory"]
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "new-staff-uuid",
    "employeeId": "EMP002",
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@restaurant.com",
    "phone": "+1234567891",
    "role": "chef",
    "department": "kitchen",
    "hourlyRate": 18.00,
    "hireDate": "2026-01-11",
    "isActive": true,
    "permissions": ["kitchen", "inventory"],
    "tenantId": "tenant-uuid",
    "outletId": "outlet-uuid",
    "createdAt": "2026-01-11T10:00:00.000Z"
  },
  "message": "Staff member created successfully"
}
```

### 5.2 Attendance Management

#### Test Case 1: Get Attendance Records
**Endpoint**: `GET http://localhost:3000/api/staff/attendance`

**Query Parameters**:
- `date` (optional, default: today)
- `staffId` (optional)
- `status` (optional: present, absent, late)

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "attendance-uuid",
      "staffId": "staff-uuid",
      "staffName": "John Doe",
      "date": "2026-01-11",
      "checkInTime": "2026-01-11T09:00:00.000Z",
      "checkOutTime": "2026-01-11T17:00:00.000Z",
      "scheduledStart": "2026-01-11T09:00:00.000Z",
      "scheduledEnd": "2026-01-11T17:00:00.000Z",
      "hoursWorked": 8.0,
      "overtimeHours": 0.0,
      "status": "present",
      "notes": "On time"
    }
  ],
  "meta": {
    "date": "2026-01-11",
    "totalStaff": 12,
    "present": 10,
    "absent": 1,
    "late": 1
  }
}
```

#### Test Case 2: Staff Check-in
**Endpoint**: `POST http://localhost:3000/api/staff/attendance/checkin`

**Request Body**:
```json
{
  "staffId": "staff-uuid",
  "location": "main-outlet"
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "attendance-uuid",
    "staffId": "staff-uuid",
    "checkInTime": "2026-01-11T09:05:00.000Z",
    "scheduledStart": "2026-01-11T09:00:00.000Z",
    "status": "late",
    "minutesLate": 5
  },
  "message": "Check-in recorded successfully"
}
```

---

## Phase 6: Customer Management Testing

### 6.1 Customer Operations

#### Test Case 1: Get Customers
**Endpoint**: `GET http://localhost:3000/api/customers`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "customer-uuid",
      "firstName": "Alice",
      "lastName": "Johnson",
      "email": "alice.johnson@email.com",
      "phone": "+1234567892",
      "dateOfBirth": "1990-05-15",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "ST",
        "zipCode": "12345"
      },
      "loyaltyPoints": 250,
      "totalSpent": 1250.75,
      "visitCount": 15,
      "lastVisit": "2026-01-10T19:30:00.000Z",
      "averageOrderValue": 83.38,
      "preferences": {
        "dietaryRestrictions": ["vegetarian"],
        "favoriteItems": ["item-1", "item-2"],
        "preferredTable": "window-seat"
      },
      "isActive": true,
      "tier": "gold", // bronze, silver, gold, platinum
      "createdAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "newCustomers": 5,
    "returningCustomers": 45
  }
}
```

#### Test Case 2: Get Customer Order History
**Endpoint**: `GET http://localhost:3000/api/customers/{{customerId}}/orders`

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-2026-001",
      "date": "2026-01-10T19:30:00.000Z",
      "total": 45.50,
      "status": "completed",
      "items": [
        {
          "id": "item-1",
          "name": "Caesar Salad",
          "quantity": 1,
          "price": 12.99
        },
        {
          "id": "item-2",
          "name": "Grilled Salmon",
          "quantity": 1,
          "price": 18.99
        }
      ],
      "paymentMethod": "credit_card",
      "loyaltyPointsEarned": 45,
      "rating": 5,
      "feedback": "Excellent food and service!"
    }
  ],
  "meta": {
    "total": 15,
    "totalSpent": 1250.75,
    "averageOrderValue": 83.38
  }
}
```

---

## Phase 7: Analytics Testing

### 7.1 Dashboard Analytics

#### Test Case 1: Dashboard Summary
**Endpoint**: `GET http://localhost:3000/api/analytics/dashboard`

**Query Parameters**:
- `period` (today, week, month, year)
- `outletId` (optional)

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "period": "today",
    "date": "2026-01-11",
    "summary": {
      "totalSales": 2450.75,
      "totalOrders": 45,
      "averageOrderValue": 54.46,
      "customersServed": 38,
      "newCustomers": 3,
      "returningCustomers": 35
    },
    "salesTrend": {
      "current": 2450.75,
      "previous": 2200.50,
      "change": 250.25,
      "changePercent": 11.37
    },
    "topItems": [
      {
        "id": "item-1",
        "name": "Grilled Salmon",
        "quantity": 12,
        "revenue": 227.88
      },
      {
        "id": "item-2",
        "name": "Caesar Salad",
        "quantity": 8,
        "revenue": 103.92
      }
    ],
    "hourlyBreakdown": [
      {"hour": 9, "sales": 150.25, "orders": 3},
      {"hour": 10, "sales": 275.50, "orders": 5},
      {"hour": 11, "sales": 425.75, "orders": 8}
    ],
    "paymentMethods": {
      "credit_card": 1470.45,
      "cash": 735.15,
      "mobile_pay": 245.15
    },
    "staffPerformance": [
      {
        "staffId": "staff-1",
        "name": "John Doe",
        "ordersServed": 15,
        "revenue": 815.25,
        "averageRating": 4.8
      }
    ]
  }
}
```

### 7.2 Sales Reports

#### Test Case 1: Daily Sales Report
**Endpoint**: `GET http://localhost:3000/api/analytics/sales/daily`

**Query Parameters**:
- `date` (optional, default: today)
- `outletId` (optional)

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "date": "2026-01-11",
    "totalSales": 2450.75,
    "totalOrders": 45,
    "averageOrderValue": 54.46,
    "hourlyBreakdown": [
      {"hour": 9, "sales": 150.25, "orders": 3, "customers": 3},
      {"hour": 10, "sales": 275.50, "orders": 5, "customers": 4},
      {"hour": 11, "sales": 425.75, "orders": 8, "customers": 7}
    ],
    "categoryBreakdown": [
      {"category": "Main Courses", "sales": 1225.50, "orders": 22},
      {"category": "Appetizers", "sales": 485.25, "orders": 15},
      {"category": "Desserts", "sales": 340.00, "orders": 8}
    ],
    "comparison": {
      "previousDay": {
        "sales": 2200.50,
        "orders": 42,
        "change": 250.25,
        "changePercent": 11.37
      },
      "previousWeek": {
        "sales": 2100.25,
        "orders": 38,
        "change": 350.50,
        "changePercent": 16.69
      }
    }
  }
}
```

### 7.3 Popular Items Report

#### Test Case 1: Popular Items
**Endpoint**: `GET http://localhost:3000/api/analytics/items/popular`

**Query Parameters**:
- `period` (today, week, month)
- `limit` (default: 10)

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "itemId": "item-1",
      "name": "Grilled Salmon",
      "category": "Main Courses",
      "quantitySold": 45,
      "revenue": 854.55,
      "averageRating": 4.8,
      "profitMargin": 52.3,
      "trend": "up" // up, down, stable
    },
    {
      "rank": 2,
      "itemId": "item-2",
      "name": "Caesar Salad",
      "category": "Salads",
      "quantitySold": 32,
      "revenue": 415.68,
      "averageRating": 4.6,
      "profitMargin": 68.5,
      "trend": "stable"
    }
  ],
  "meta": {
    "period": "week",
    "totalItems": 25,
    "totalRevenue": 12450.75
  }
}
```

---

## Phase 8: Error Handling Testing

### 8.1 Authentication Errors

#### Test Case 1: Missing Authorization Header
**Endpoint**: `GET http://localhost:3000/api/menu/items`
**Headers**: None

**Expected Response**:
```json
{
  "success": false,
  "error": "AUTHENTICATION_REQUIRED",
  "message": "Authorization header is required",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```
**Expected Status**: 401

#### Test Case 2: Invalid Token Format
**Headers**: `Authorization: Bearer invalid_token_format`

**Expected Response**:
```json
{
  "success": false,
  "error": "INVALID_TOKEN",
  "message": "Token format is invalid",
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```
**Expected Status**: 401

### 8.2 Validation Errors

#### Test Case 1: Missing Required Fields
**Endpoint**: `POST http://localhost:3000/api/menu/items`
**Request Body**: `{}`

**Expected Response**:
```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required",
      "code": "REQUIRED"
    },
    {
      "field": "price",
      "message": "Price is required",
      "code": "REQUIRED"
    },
    {
      "field": "categoryId",
      "message": "Category ID is required",
      "code": "REQUIRED"
    }
  ],
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```
**Expected Status**: 400

### 8.3 Resource Not Found Errors

#### Test Case 1: Non-existent Resource
**Endpoint**: `GET http://localhost:3000/api/menu/items/non-existent-id`

**Expected Response**:
```json
{
  "success": false,
  "error": "RESOURCE_NOT_FOUND",
  "message": "Menu item not found",
  "details": {
    "resource": "menu_item",
    "id": "non-existent-id"
  },
  "timestamp": "2026-01-11T10:00:00.000Z"
}
```
**Expected Status**: 404

### 8.4 Service Unavailable Errors

#### Test Case 1: Service Down
When a backend service is down, the API Gateway should return:

**Expected Response**:
```json
{
  "success": false,
  "error": "Service temporarily unavailable",
  "service": "menu-service",
  "message": "The menu-service is currently offline. Please try again later.",
  "code": "SERVICE_OFFLINE",
  "timestamp": "2026-01-11T10:00:00.000Z",
  "errorId": "err-1641891600000-abc123"
}
```
**Expected Status**: 503

---

## Phase 9: Performance Testing

### 9.1 Response Time Testing

**Acceptable Response Times**:
- Health checks: < 100ms
- Authentication: < 500ms
- Simple queries: < 1000ms
- Complex queries: < 3000ms
- Reports/Analytics: < 5000ms

### 9.2 Load Testing Scenarios

#### Scenario 1: Concurrent Menu Requests
- **Test**: 50 concurrent requests to `GET /api/menu/items`
- **Expected**: All requests complete successfully
- **Acceptable**: 95% of requests complete within 2 seconds

#### Scenario 2: Bulk Operations
- **Test**: Bulk availability update with 100 items
- **Expected**: Operation completes successfully
- **Acceptable**: Completes within 10 seconds

---

## Phase 10: Integration Testing

### 10.1 Menu-Inventory Integration

#### Test Case 1: Stock Level Affects Availability
1. Create menu item with inventory tracking
2. Set inventory stock below minimum
3. Verify menu item becomes unavailable
4. Restock inventory above minimum
5. Verify menu item becomes available

#### Test Case 2: Menu Item Creation Creates Inventory Link
1. Create menu item with `inventoryTracked: true`
2. Verify corresponding inventory item is created
3. Verify link between menu and inventory items

### 10.2 Staff-Order Integration

#### Test Case 1: Staff Performance Tracking
1. Create orders assigned to specific staff
2. Verify staff performance metrics update
3. Check analytics reflect staff performance

---

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Service Not Responding
**Symptoms**: 503 Service Unavailable errors
**Diagnosis**:
1. Check service health: `curl http://localhost:3001/health`
2. Check service logs in terminal
3. Verify service is running on correct port

**Solutions**:
1. Restart the specific service
2. Check for port conflicts
3. Verify environment variables

#### Issue 2: Authentication Failures
**Symptoms**: 401 Unauthorized errors
**Diagnosis**:
1. Verify token format and expiration
2. Check if user exists in database
3. Verify tenant ID is correct

**Solutions**:
1. Re-login to get fresh token
2. Check user permissions
3. Verify tenant configuration

#### Issue 3: Database Connection Errors
**Symptoms**: 500 Internal Server Error
**Diagnosis**:
1. Check database connection
2. Verify database schema
3. Check for migration issues

**Solutions**:
1. Restart database service
2. Run database migrations
3. Check connection string

#### Issue 4: CORS Errors (Frontend)
**Symptoms**: CORS policy errors in browser
**Diagnosis**:
1. Check API Gateway CORS configuration
2. Verify frontend URL in allowed origins

**Solutions**:
1. Update CORS configuration
2. Restart API Gateway
3. Check frontend URL

---

## Test Data Setup

### Sample Test Data

#### Tenant Data:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Test Restaurant",
  "email": "admin@testrestaurant.com",
  "phone": "+1234567890"
}
```

#### User Data:
```json
{
  "email": "admin@restaurant.com",
  "password": "admin123",
  "role": "admin",
  "tenantId": "550e8400-e29b-41d4-a716-446655440001"
}
```

#### Category Data:
```json
[
  {"name": "Appetizers", "displayOrder": 1},
  {"name": "Main Courses", "displayOrder": 2},
  {"name": "Desserts", "displayOrder": 3},
  {"name": "Beverages", "displayOrder": 4}
]
```

#### Menu Item Data:
```json
[
  {
    "name": "Caesar Salad",
    "description": "Fresh romaine lettuce with Caesar dressing",
    "price": 12.99,
    "cost": 6.50,
    "categoryId": "appetizers-category-id"
  },
  {
    "name": "Grilled Salmon",
    "description": "Fresh Atlantic salmon with herbs",
    "price": 18.99,
    "cost": 9.50,
    "categoryId": "main-courses-category-id"
  }
]
```

---

## Postman Environment Variables

### Environment Setup:
```json
{
  "baseUrl": "http://localhost:3000",
  "token": "",
  "tenantId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "",
  "categoryId": "",
  "menuItemId": "",
  "staffId": "",
  "customerId": "",
  "inventoryItemId": ""
}
```

### Pre-request Scripts:
```javascript
// Auto-set timestamp
pm.environment.set("timestamp", new Date().toISOString());

// Auto-generate request ID
pm.environment.set("requestId", "req-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9));
```

### Test Scripts:
```javascript
// Verify response time
pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Verify status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Verify response structure
pm.test("Response has success field", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('success');
});

// Save token from login response
if (pm.response.json().data && pm.response.json().data.token) {
    pm.environment.set("token", pm.response.json().data.token);
}
```

---

This comprehensive testing plan provides detailed test cases for all admin dashboard backend functionality. Execute tests in the specified phases to ensure complete coverage and identify any issues systematically.
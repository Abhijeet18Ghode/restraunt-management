# Admin Dashboard Manual Testing Guide

## System Status
- ✅ **API Gateway**: Running on http://localhost:3000
- ✅ **Admin Dashboard**: Running on http://localhost:3011
- ✅ **Backend Services**: Starting up
- ✅ **Environment**: Configured with .env.local

## Testing URLs
- **Admin Dashboard**: http://localhost:3011
- **API Gateway Health**: http://localhost:3000/health
- **Services Status**: http://localhost:3000/services/status

---

## 🧪 **TESTING CHECKLIST**

### **1. Environment Configuration Testing**

#### ✅ **Configuration Validation**
- [ ] Open browser console at http://localhost:3011
- [ ] Check for configuration validation messages:
  - Should see: `✅ Admin Dashboard configuration validated successfully`
  - Should NOT see: `❌ Admin Dashboard configuration validation failed`

#### ✅ **API Connectivity**
- [ ] Test API Gateway: http://localhost:3000/health
- [ ] Expected response:
  ```json
  {
    "status": "healthy",
    "service": "api-gateway",
    "timestamp": "2024-01-06T...",
    "uptime": 123.456,
    "memory": {...},
    "version": "1.0.0"
  }
  ```

#### ✅ **Services Status**
- [ ] Test services endpoint: http://localhost:3000/services/status
- [ ] Should show health status of all backend services

---

### **2. Service Integration Testing**

#### ✅ **Authentication Service**
```javascript
// Test in browser console
import { authService } from './app/services';

// Test login (will fail without credentials, but should show proper error)
authService.login('test@example.com', 'password')
  .then(response => console.log('Auth Success:', response))
  .catch(error => console.log('Auth Error (Expected):', error.response?.status));
```

#### ✅ **Customer Service**
```javascript
// Test in browser console
import { customerService } from './app/services';

// Test customer search (should connect to API)
customerService.searchCustomers('outlet1', 'john')
  .then(response => console.log('Customer Search:', response))
  .catch(error => console.log('Customer Error:', error.response?.status));
```

#### ✅ **Inventory Service**
```javascript
// Test in browser console
import { inventoryService } from './app/services';

// Test inventory items
inventoryService.getInventoryItems('outlet1')
  .then(response => console.log('Inventory Items:', response))
  .catch(error => console.log('Inventory Error:', error.response?.status));
```

#### ✅ **Staff Service**
```javascript
// Test in browser console
import { staffService } from './app/services';

// Test staff list
staffService.getStaff('outlet1')
  .then(response => console.log('Staff List:', response))
  .catch(error => console.log('Staff Error:', error.response?.status));
```

#### ✅ **Payment Service**
```javascript
// Test in browser console
import { paymentService } from './app/services';

// Test payment methods
paymentService.getPaymentMethods('outlet1')
  .then(response => console.log('Payment Methods:', response))
  .catch(error => console.log('Payment Error:', error.response?.status));
```

#### ✅ **Online Order Service**
```javascript
// Test in browser console
import { onlineOrderService } from './app/services';

// Test online orders
onlineOrderService.getOnlineOrders('outlet1')
  .then(response => console.log('Online Orders:', response))
  .catch(error => console.log('Online Order Error:', error.response?.status));
```

#### ✅ **Analytics Service**
```javascript
// Test in browser console
import { analyticsService } from './app/services';

// Test sales data
analyticsService.getSalesData('outlet1')
  .then(response => console.log('Sales Data:', response))
  .catch(error => console.log('Analytics Error:', error.response?.status));
```

#### ✅ **Menu Service**
```javascript
// Test in browser console
import { menuService } from './app/services';

// Test menu categories
menuService.getCategories('outlet1')
  .then(response => console.log('Menu Categories:', response))
  .catch(error => console.log('Menu Error:', error.response?.status));
```

#### ✅ **Tenant Service**
```javascript
// Test in browser console
import { tenantService } from './app/services';

// Test tenant info
tenantService.getTenant('tenant1')
  .then(response => console.log('Tenant Info:', response))
  .catch(error => console.log('Tenant Error:', error.response?.status));
```

---

### **3. WebSocket Integration Testing**

#### ✅ **WebSocket Connection**
```javascript
// Test in browser console
import { websocketService } from './app/services';

// Connect WebSocket
websocketService.connect('tenant1', 'user1');

// Check connection status
console.log('WebSocket Status:', websocketService.getConnectionStatus());

// Test event subscription
websocketService.on('connection', (data) => {
  console.log('WebSocket Connection Event:', data);
});

// Subscribe to analytics updates
websocketService.subscribeToAnalytics(['outlet1']);
```

#### ✅ **Real-time Events**
```javascript
// Test event handlers
websocketService.on('salesUpdate', (data) => {
  console.log('Sales Update:', data);
});

websocketService.on('newOrder', (data) => {
  console.log('New Order:', data);
});

websocketService.on('lowStockAlert', (data) => {
  console.log('Low Stock Alert:', data);
});
```

---

### **4. Feature Flag Testing**

#### ✅ **Configuration Features**
```javascript
// Test in browser console
import config from './app/config/env';

console.log('Feature Flags:', {
  realTimeUpdates: config.features.realTimeUpdates,
  multiLocation: config.features.multiLocation,
  advancedAnalytics: config.features.advancedAnalytics,
  offlineMode: config.features.offlineMode
});
```

---

### **5. Error Handling Testing**

#### ✅ **Network Errors**
```javascript
// Test with invalid endpoint
import { customerService } from './app/services';

// This should trigger error handling
customerService.getCustomer('invalid-id')
  .then(response => console.log('Unexpected success:', response))
  .catch(error => {
    console.log('Error handled correctly:', {
      status: error.response?.status,
      message: error.message
    });
  });
```

#### ✅ **Authentication Errors**
```javascript
// Test without authentication
import { staffService } from './app/services';

staffService.getStaff('outlet1')
  .then(response => console.log('Unexpected success:', response))
  .catch(error => {
    console.log('Auth error handled:', error.response?.status === 401);
  });
```

---

### **6. Performance Testing**

#### ✅ **Service Response Times**
```javascript
// Test service performance
const testServicePerformance = async () => {
  const services = [
    { name: 'Customer', fn: () => customerService.searchCustomers('outlet1', 'test') },
    { name: 'Inventory', fn: () => inventoryService.getInventoryItems('outlet1') },
    { name: 'Staff', fn: () => staffService.getStaff('outlet1') },
    { name: 'Analytics', fn: () => analyticsService.getSalesData('outlet1') }
  ];

  for (const service of services) {
    const start = performance.now();
    try {
      await service.fn();
      const end = performance.now();
      console.log(`${service.name} Service: ${(end - start).toFixed(2)}ms`);
    } catch (error) {
      const end = performance.now();
      console.log(`${service.name} Service Error: ${(end - start).toFixed(2)}ms`);
    }
  }
};

testServicePerformance();
```

---

### **7. UI Component Testing**

#### ✅ **Service Index Import**
```javascript
// Test service index
import services from './app/services';

console.log('Available Services:', Object.keys(services));
console.log('Service Instances:', {
  auth: !!services.auth,
  customer: !!services.customer,
  inventory: !!services.inventory,
  staff: !!services.staff,
  payment: !!services.payment,
  analytics: !!services.analytics,
  menu: !!services.menu,
  tenant: !!services.tenant,
  onlineOrder: !!services.onlineOrder,
  websocket: !!services.websocket
});
```

---

### **8. Integration Flow Testing**

#### ✅ **Complete Customer Flow**
```javascript
// Test complete customer management flow
const testCustomerFlow = async () => {
  try {
    // 1. Search customers
    console.log('1. Searching customers...');
    const searchResult = await customerService.searchCustomers('outlet1', 'john');
    
    // 2. Get customer loyalty
    if (searchResult.customers && searchResult.customers.length > 0) {
      console.log('2. Getting customer loyalty...');
      const loyalty = await customerService.getCustomerLoyalty(searchResult.customers[0].id);
    }
    
    // 3. Get customer analytics
    console.log('3. Getting customer analytics...');
    const analytics = await customerService.getCustomerAnalytics('outlet1');
    
    console.log('✅ Customer flow test completed');
  } catch (error) {
    console.log('❌ Customer flow test failed:', error.message);
  }
};

testCustomerFlow();
```

#### ✅ **Complete Inventory Flow**
```javascript
// Test complete inventory management flow
const testInventoryFlow = async () => {
  try {
    // 1. Get inventory items
    console.log('1. Getting inventory items...');
    const items = await inventoryService.getInventoryItems('outlet1');
    
    // 2. Get stock levels
    console.log('2. Getting stock levels...');
    const stock = await inventoryService.getStockLevels('outlet1');
    
    // 3. Get alerts
    console.log('3. Getting inventory alerts...');
    const alerts = await inventoryService.getAlerts('outlet1');
    
    // 4. Get suppliers
    console.log('4. Getting suppliers...');
    const suppliers = await inventoryService.getSuppliers('outlet1');
    
    console.log('✅ Inventory flow test completed');
  } catch (error) {
    console.log('❌ Inventory flow test failed:', error.message);
  }
};

testInventoryFlow();
```

---

## 🎯 **EXPECTED RESULTS**

### **Success Indicators**
- ✅ All service imports work without errors
- ✅ API calls return proper error responses (401/404/500)
- ✅ WebSocket connects successfully
- ✅ Configuration validation passes
- ✅ Feature flags are properly loaded
- ✅ Error handling works correctly

### **Common Issues & Solutions**

#### **Service Connection Errors**
```
Error: Network Error
Solution: Check if API Gateway is running on port 3000
```

#### **Authentication Errors**
```
Error: 401 Unauthorized
Solution: Expected behavior - services require authentication
```

#### **WebSocket Connection Issues**
```
Error: WebSocket connection failed
Solution: Check if WebSocket service is running on port 3010
```

#### **Configuration Errors**
```
Error: Configuration validation failed
Solution: Check .env.local file has all required variables
```

---

## 🚀 **TESTING EXECUTION**

### **Step 1: Open Admin Dashboard**
1. Navigate to http://localhost:3011
2. Open browser developer tools (F12)
3. Go to Console tab

### **Step 2: Run Configuration Tests**
```javascript
// Paste this in console
console.log('🧪 Testing Admin Dashboard Configuration...');
import config from './app/config/env';
console.log('✅ Configuration loaded:', config.appName);
```

### **Step 3: Run Service Tests**
```javascript
// Paste this in console
console.log('🧪 Testing Service Integrations...');
import services from './app/services';
console.log('✅ Services loaded:', Object.keys(services));
```

### **Step 4: Run WebSocket Tests**
```javascript
// Paste this in console
console.log('🧪 Testing WebSocket Integration...');
import { websocketService } from './app/services';
websocketService.connect('tenant1', 'user1');
```

### **Step 5: Run API Tests**
```javascript
// Paste this in console
console.log('🧪 Testing API Connectivity...');
fetch('http://localhost:3000/health')
  .then(r => r.json())
  .then(data => console.log('✅ API Gateway:', data))
  .catch(e => console.log('❌ API Gateway:', e.message));
```

---

## 📊 **TEST RESULTS TRACKING**

### **Configuration Tests**
- [ ] Environment variables loaded
- [ ] Configuration validation passed
- [ ] Feature flags working
- [ ] API URLs correct

### **Service Integration Tests**
- [ ] Customer Service connected
- [ ] Inventory Service connected
- [ ] Staff Service connected
- [ ] Payment Service connected
- [ ] Online Order Service connected
- [ ] Analytics Service connected
- [ ] Menu Service connected
- [ ] Tenant Service connected

### **WebSocket Tests**
- [ ] WebSocket connection established
- [ ] Event subscriptions working
- [ ] Real-time updates functional
- [ ] Connection recovery working

### **Error Handling Tests**
- [ ] Network errors handled
- [ ] Authentication errors handled
- [ ] Validation errors handled
- [ ] Service errors handled

### **Performance Tests**
- [ ] Service response times acceptable
- [ ] WebSocket connection stable
- [ ] Memory usage reasonable
- [ ] No memory leaks detected

---

## 🎉 **COMPLETION CHECKLIST**

- [ ] All services successfully integrated
- [ ] WebSocket real-time features working
- [ ] Error handling robust
- [ ] Configuration system functional
- [ ] Performance acceptable
- [ ] No critical console errors
- [ ] All feature flags working
- [ ] Authentication flow ready
- [ ] API connectivity confirmed
- [ ] Environment configuration validated

**Status**: Ready for comprehensive manual testing! 🚀
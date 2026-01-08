// Service exports for Admin Dashboard
import AuthService from './authService';
import TenantService from './tenantService';
import MenuService from './menuService';
import AnalyticsService from './analyticsService';
import CustomerService from './customerService';
import InventoryService from './inventoryService';
import StaffService from './staffService';
import PaymentService from './paymentService';
import OnlineOrderService from './onlineOrderService';
import websocketService from './websocketService';

// Create service instances
export const authService = new AuthService();
export const tenantService = new TenantService();
export const menuService = new MenuService();
export const analyticsService = new AnalyticsService();
export const customerService = new CustomerService();
export const inventoryService = new InventoryService();
export const staffService = new StaffService();
export const paymentService = new PaymentService();
export const onlineOrderService = new OnlineOrderService();
export { websocketService };

// Service classes for direct instantiation if needed
export {
  AuthService,
  TenantService,
  MenuService,
  AnalyticsService,
  CustomerService,
  InventoryService,
  StaffService,
  PaymentService,
  OnlineOrderService
};

// Default export with all services
export default {
  auth: authService,
  tenant: tenantService,
  menu: menuService,
  analytics: analyticsService,
  customer: customerService,
  inventory: inventoryService,
  staff: staffService,
  payment: paymentService,
  onlineOrder: onlineOrderService,
  websocket: websocketService
};
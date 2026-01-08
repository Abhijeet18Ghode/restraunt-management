// Service exports for POS Interface
import AuthService from './authService';
import { posService } from './posService';
import CustomerService from './customerService';
import PaymentService from './paymentService';
import websocketService from './websocketService';

// Create service instances
export const authService = new AuthService();
export { posService };
export const customerService = new CustomerService();
export const paymentService = new PaymentService();
export { websocketService };

// Service classes for direct instantiation if needed
export {
  AuthService,
  CustomerService,
  PaymentService
};

// Default export with all services
export default {
  auth: authService,
  pos: posService,
  customer: customerService,
  payment: paymentService,
  websocket: websocketService
};
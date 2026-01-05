#!/usr/bin/env node

const chalk = require('chalk');
const { v4: uuidv4 } = require('uuid');

class RestaurantDemo {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.tenantId = null;
    this.outletId = null;
    this.customerId = null;
    this.menuItems = [];
    this.orderId = null;
  }

  async runDemo() {
    console.log(chalk.cyan('🏪 Restaurant Management System - Interactive Demo'));
    console.log(chalk.cyan('=' .repeat(60)));
    console.log();

    try {
      // Step 1: Verify system is running
      await this.verifySystem();
      
      // Step 2: Create a test restaurant
      await this.createRestaurant();
      
      // Step 3: Set up the restaurant
      await this.setupRestaurant();
      
      // Step 4: Add menu items
      await this.addMenuItems();
      
      // Step 5: Add inventory
      await this.addInventory();
      
      // Step 6: Create a customer
      await this.createCustomer();
      
      // Step 7: Process an order
      await this.processOrder();
      
      // Step 8: View analytics
      await this.viewAnalytics();
      
      // Step 9: Test multi-tenant isolation
      await this.testMultiTenant();
      
      console.log(chalk.green('\n🎉 Demo completed successfully!'));
      console.log(chalk.green('✅ All restaurant operations are working correctly'));
      console.log();
      console.log(chalk.blue('📊 Demo Summary:'));
      console.log(chalk.gray(`   Tenant ID: ${this.tenantId}`));
      console.log(chalk.gray(`   Customer ID: ${this.customerId}`));
      console.log(chalk.gray(`   Order ID: ${this.orderId}`));
      console.log(chalk.gray(`   Menu Items: ${this.menuItems.length}`));
      
    } catch (error) {
      console.error(chalk.red('\n💥 Demo failed:'), error.message);
      console.log(chalk.yellow('\n🔧 Troubleshooting:'));
      console.log(chalk.yellow('1. Ensure the system is running: npm run start'));
      console.log(chalk.yellow('2. Check system status: npm run status'));
      console.log(chalk.yellow('3. Run system validation: npm run validate'));
      process.exit(1);
    }
  }

  async verifySystem() {
    console.log(chalk.blue('🔍 Step 1: Verifying system health...'));
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`API Gateway not responding: ${response.status}`);
      }
      
      const health = await response.json();
      console.log(chalk.green('✅ API Gateway is healthy'));
      console.log(chalk.gray(`   Uptime: ${Math.floor(health.uptime / 60)} minutes`));
      
      // Check service status
      const statusResponse = await fetch(`${this.baseUrl}/services/status`);
      if (statusResponse.ok) {
        const status = await statusResponse.json();
        const healthyServices = Object.entries(status.health || {})
          .filter(([name, health]) => health.status === 'healthy').length;
        console.log(chalk.green(`✅ ${healthyServices} services are healthy`));
      }
      
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
    
    console.log();
  }

  async createRestaurant() {
    console.log(chalk.blue('🏪 Step 2: Creating test restaurant...'));
    
    const restaurantData = {
      businessName: 'Demo Restaurant',
      contactEmail: 'demo@restaurant.com',
      contactPhone: '+1234567890',
      address: {
        street: '123 Demo Street',
        city: 'Demo City',
        state: 'DC',
        zipCode: '12345'
      }
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(restaurantData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create restaurant: ${response.status}`);
      }
      
      const tenant = await response.json();
      this.tenantId = tenant.id;
      
      console.log(chalk.green('✅ Restaurant created successfully'));
      console.log(chalk.gray(`   Tenant ID: ${this.tenantId}`));
      console.log(chalk.gray(`   Business Name: ${tenant.businessName}`));
      
    } catch (error) {
      throw new Error(`Restaurant creation failed: ${error.message}`);
    }
    
    console.log();
  }

  async setupRestaurant() {
    console.log(chalk.blue('🏢 Step 3: Setting up restaurant outlet...'));
    
    const outletData = {
      name: 'Main Branch',
      address: {
        street: '456 Main Street',
        city: 'Demo City',
        state: 'DC',
        zipCode: '12345'
      },
      operatingHours: {
        monday: { open: '09:00', close: '22:00' },
        tuesday: { open: '09:00', close: '22:00' },
        wednesday: { open: '09:00', close: '22:00' },
        thursday: { open: '09:00', close: '22:00' },
        friday: { open: '09:00', close: '23:00' },
        saturday: { open: '09:00', close: '23:00' },
        sunday: { open: '10:00', close: '21:00' }
      },
      taxConfiguration: {
        salesTax: 8.5,
        serviceTax: 10.0
      }
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/api/tenants/outlets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId
        },
        body: JSON.stringify(outletData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create outlet: ${response.status}`);
      }
      
      const outlet = await response.json();
      this.outletId = outlet.id;
      
      console.log(chalk.green('✅ Outlet created successfully'));
      console.log(chalk.gray(`   Outlet ID: ${this.outletId}`));
      console.log(chalk.gray(`   Name: ${outlet.name}`));
      
    } catch (error) {
      throw new Error(`Outlet setup failed: ${error.message}`);
    }
    
    console.log();
  }

  async addMenuItems() {
    console.log(chalk.blue('🍽️  Step 4: Adding menu items...'));
    
    const menuItems = [
      {
        name: 'Grilled Chicken Burger',
        description: 'Juicy grilled chicken with fresh vegetables',
        price: 15.99,
        category: 'Main Course',
        preparationTime: 12,
        isAvailable: true
      },
      {
        name: 'Margherita Pizza',
        description: 'Classic pizza with tomato, mozzarella, and basil',
        price: 18.99,
        category: 'Main Course',
        preparationTime: 15,
        isAvailable: true
      },
      {
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing',
        price: 12.99,
        category: 'Salads',
        preparationTime: 8,
        isAvailable: true
      }
    ];
    
    try {
      for (const item of menuItems) {
        const response = await fetch(`${this.baseUrl}/api/menu/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': this.tenantId
          },
          body: JSON.stringify(item)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create menu item: ${response.status}`);
        }
        
        const createdItem = await response.json();
        this.menuItems.push(createdItem);
        
        console.log(chalk.green(`✅ Added: ${item.name} - $${item.price}`));
      }
      
      console.log(chalk.green(`✅ ${this.menuItems.length} menu items added successfully`));
      
    } catch (error) {
      throw new Error(`Menu setup failed: ${error.message}`);
    }
    
    console.log();
  }

  async addInventory() {
    console.log(chalk.blue('📦 Step 5: Adding inventory items...'));
    
    const inventoryItems = [
      {
        name: 'Chicken Breast',
        category: 'Protein',
        unit: 'pieces',
        currentStock: 100,
        minimumStock: 20,
        unitCost: 3.50
      },
      {
        name: 'Pizza Dough',
        category: 'Base',
        unit: 'pieces',
        currentStock: 50,
        minimumStock: 10,
        unitCost: 1.25
      },
      {
        name: 'Lettuce',
        category: 'Vegetables',
        unit: 'heads',
        currentStock: 30,
        minimumStock: 5,
        unitCost: 2.00
      }
    ];
    
    try {
      for (const item of inventoryItems) {
        const response = await fetch(`${this.baseUrl}/api/inventory/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': this.tenantId
          },
          body: JSON.stringify(item)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to create inventory item: ${response.status}`);
        }
        
        console.log(chalk.green(`✅ Added: ${item.name} - ${item.currentStock} ${item.unit}`));
      }
      
      console.log(chalk.green(`✅ ${inventoryItems.length} inventory items added successfully`));
      
    } catch (error) {
      throw new Error(`Inventory setup failed: ${error.message}`);
    }
    
    console.log();
  }

  async createCustomer() {
    console.log(chalk.blue('👤 Step 6: Creating test customer...'));
    
    const customerData = {
      name: 'John Demo',
      email: 'john.demo@example.com',
      phone: '+1987654321',
      address: {
        street: '789 Customer Street',
        city: 'Demo City',
        state: 'DC',
        zipCode: '12345'
      }
    };
    
    try {
      const response = await fetch(`${this.baseUrl}/api/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId
        },
        body: JSON.stringify(customerData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create customer: ${response.status}`);
      }
      
      const customer = await response.json();
      this.customerId = customer.id;
      
      console.log(chalk.green('✅ Customer created successfully'));
      console.log(chalk.gray(`   Customer ID: ${this.customerId}`));
      console.log(chalk.gray(`   Name: ${customer.name}`));
      
    } catch (error) {
      throw new Error(`Customer creation failed: ${error.message}`);
    }
    
    console.log();
  }

  async processOrder() {
    console.log(chalk.blue('🛒 Step 7: Processing a complete order...'));
    
    // Create order
    const orderData = {
      customerId: this.customerId,
      outletId: this.outletId,
      orderType: 'DINE_IN',
      items: [
        {
          menuItemId: this.menuItems[0].id,
          quantity: 1,
          unitPrice: this.menuItems[0].price,
          specialInstructions: 'No onions please'
        },
        {
          menuItemId: this.menuItems[1].id,
          quantity: 1,
          unitPrice: this.menuItems[1].price
        }
      ],
      subtotal: this.menuItems[0].price + this.menuItems[1].price,
      tax: (this.menuItems[0].price + this.menuItems[1].price) * 0.085,
      discount: 0
    };
    
    orderData.total = orderData.subtotal + orderData.tax - orderData.discount;
    
    try {
      // Create order
      const orderResponse = await fetch(`${this.baseUrl}/api/pos/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId
        },
        body: JSON.stringify(orderData)
      });
      
      if (!orderResponse.ok) {
        throw new Error(`Failed to create order: ${orderResponse.status}`);
      }
      
      const order = await orderResponse.json();
      this.orderId = order.id;
      
      console.log(chalk.green('✅ Order created successfully'));
      console.log(chalk.gray(`   Order ID: ${this.orderId}`));
      console.log(chalk.gray(`   Total: $${order.total.toFixed(2)}`));
      
      // Finalize order (generates KOT)
      const finalizeResponse = await fetch(`${this.baseUrl}/api/pos/orders/${this.orderId}/finalize`, {
        method: 'POST',
        headers: { 'x-tenant-id': this.tenantId }
      });
      
      if (!finalizeResponse.ok) {
        throw new Error(`Failed to finalize order: ${finalizeResponse.status}`);
      }
      
      const finalizedOrder = await finalizeResponse.json();
      console.log(chalk.green('✅ Order finalized and KOT generated'));
      console.log(chalk.gray(`   Invoice Number: ${finalizedOrder.invoiceNumber}`));
      
      // Process payment
      const paymentData = {
        orderId: this.orderId,
        amount: order.total,
        paymentMethod: 'credit_card',
        cardDetails: {
          last4: '1234',
          cardType: 'visa'
        }
      };
      
      const paymentResponse = await fetch(`${this.baseUrl}/api/payments/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.tenantId
        },
        body: JSON.stringify(paymentData)
      });
      
      if (!paymentResponse.ok) {
        throw new Error(`Failed to process payment: ${paymentResponse.status}`);
      }
      
      const payment = await paymentResponse.json();
      console.log(chalk.green('✅ Payment processed successfully'));
      console.log(chalk.gray(`   Transaction ID: ${payment.transactionId}`));
      
    } catch (error) {
      throw new Error(`Order processing failed: ${error.message}`);
    }
    
    console.log();
  }

  async viewAnalytics() {
    console.log(chalk.blue('📊 Step 8: Viewing analytics...'));
    
    try {
      // Get daily sales
      const today = new Date().toISOString().split('T')[0];
      const analyticsResponse = await fetch(`${this.baseUrl}/api/analytics/sales/daily?date=${today}`, {
        headers: { 'x-tenant-id': this.tenantId }
      });
      
      if (!analyticsResponse.ok) {
        throw new Error(`Failed to get analytics: ${analyticsResponse.status}`);
      }
      
      const analytics = await analyticsResponse.json();
      console.log(chalk.green('✅ Analytics retrieved successfully'));
      console.log(chalk.gray(`   Total Sales: $${analytics.totalSales || 0}`));
      console.log(chalk.gray(`   Order Count: ${analytics.orderCount || 0}`));
      
      // Get customer loyalty
      const loyaltyResponse = await fetch(`${this.baseUrl}/api/customers/${this.customerId}/loyalty`, {
        headers: { 'x-tenant-id': this.tenantId }
      });
      
      if (loyaltyResponse.ok) {
        const loyalty = await loyaltyResponse.json();
        console.log(chalk.green('✅ Customer loyalty updated'));
        console.log(chalk.gray(`   Loyalty Points: ${loyalty.points || 0}`));
      }
      
    } catch (error) {
      throw new Error(`Analytics retrieval failed: ${error.message}`);
    }
    
    console.log();
  }

  async testMultiTenant() {
    console.log(chalk.blue('🔒 Step 9: Testing multi-tenant isolation...'));
    
    try {
      // Create a second tenant
      const tenant2Data = {
        businessName: 'Second Demo Restaurant',
        contactEmail: 'demo2@restaurant.com'
      };
      
      const tenant2Response = await fetch(`${this.baseUrl}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant2Data)
      });
      
      if (!tenant2Response.ok) {
        throw new Error(`Failed to create second tenant: ${tenant2Response.status}`);
      }
      
      const tenant2 = await tenant2Response.json();
      console.log(chalk.green('✅ Second tenant created'));
      
      // Try to access first tenant's data with second tenant's credentials
      const isolationTestResponse = await fetch(`${this.baseUrl}/api/menu/items`, {
        headers: { 'x-tenant-id': tenant2.id }
      });
      
      if (isolationTestResponse.ok) {
        const items = await isolationTestResponse.json();
        if (items.length === 0) {
          console.log(chalk.green('✅ Multi-tenant isolation working correctly'));
          console.log(chalk.gray('   Second tenant cannot access first tenant\'s menu items'));
        } else {
          throw new Error('Multi-tenant isolation failed: Cross-tenant data access detected');
        }
      }
      
    } catch (error) {
      throw new Error(`Multi-tenant test failed: ${error.message}`);
    }
    
    console.log();
  }
}

// CLI Interface
async function main() {
  const demo = new RestaurantDemo();
  await demo.runDemo();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Demo failed:'), error);
    process.exit(1);
  });
}

module.exports = RestaurantDemo;
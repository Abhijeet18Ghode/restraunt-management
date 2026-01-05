#!/usr/bin/env node

const chalk = require('chalk');

async function testServices() {
  console.log(chalk.cyan('🔍 Testing Restaurant Management System Services'));
  console.log(chalk.cyan('=' .repeat(50)));

  const services = [
    { name: 'tenant-service', port: 3001 },
    { name: 'menu-service', port: 3002 },
    { name: 'inventory-service', port: 3003 },
    { name: 'pos-service', port: 3004 },
    { name: 'online-order-service', port: 3005 },
    { name: 'staff-service', port: 3006 },
    { name: 'customer-service', port: 3007 },
    { name: 'analytics-service', port: 3008 },
    { name: 'payment-service', port: 3009 }
  ];

  let workingServices = 0;

  for (const service of services) {
    try {
      console.log(chalk.blue(`Testing ${service.name} on port ${service.port}...`));
      
      const response = await fetch(`http://localhost:${service.port}/health`);
      
      if (response.ok) {
        const health = await response.json();
        console.log(chalk.green(`✅ ${service.name} is healthy`));
        console.log(chalk.gray(`   Status: ${health.status}`));
        console.log(chalk.gray(`   Uptime: ${Math.floor(health.uptime / 60)} minutes`));
        workingServices++;
      } else {
        console.log(chalk.red(`❌ ${service.name} responded with status ${response.status}`));
      }
    } catch (error) {
      console.log(chalk.red(`❌ ${service.name} is not responding: ${error.message}`));
    }
    
    console.log();
  }

  console.log(chalk.cyan('📊 Summary:'));
  console.log(chalk.green(`✅ Working services: ${workingServices}/${services.length}`));
  
  if (workingServices > 0) {
    console.log(chalk.green('\n🎉 Great! Some services are running. Let\'s test basic functionality...'));
    
    // Test creating a tenant
    if (workingServices >= 3) {
      await testBasicFunctionality();
    }
  } else {
    console.log(chalk.red('\n💥 No services are responding. Please check the system startup.'));
  }
}

async function testBasicFunctionality() {
  console.log(chalk.blue('\n🧪 Testing Basic Functionality'));
  console.log(chalk.blue('─'.repeat(30)));

  try {
    // Test tenant creation
    console.log(chalk.blue('Creating a test tenant...'));
    
    const tenantData = {
      businessName: 'Test Restaurant',
      contactEmail: 'test@restaurant.com',
      contactPhone: '+1234567890'
    };

    const tenantResponse = await fetch('http://localhost:3001/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tenantData)
    });

    if (tenantResponse.ok) {
      const tenant = await tenantResponse.json();
      console.log(chalk.green('✅ Tenant created successfully'));
      console.log(chalk.gray(`   Tenant ID: ${tenant.id}`));
      console.log(chalk.gray(`   Business Name: ${tenant.businessName}`));

      // Test menu service
      console.log(chalk.blue('\nTesting menu service...'));
      
      const menuResponse = await fetch('http://localhost:3002/api/menu/items', {
        headers: { 'x-tenant-id': tenant.id }
      });

      if (menuResponse.ok) {
        const menuItems = await menuResponse.json();
        console.log(chalk.green('✅ Menu service is working'));
        console.log(chalk.gray(`   Menu items: ${menuItems.length}`));
      } else {
        console.log(chalk.yellow('⚠️  Menu service responded but may have issues'));
      }

      // Test inventory service
      console.log(chalk.blue('\nTesting inventory service...'));
      
      const inventoryResponse = await fetch('http://localhost:3003/api/inventory/items', {
        headers: { 'x-tenant-id': tenant.id }
      });

      if (inventoryResponse.ok) {
        const inventoryItems = await inventoryResponse.json();
        console.log(chalk.green('✅ Inventory service is working'));
        console.log(chalk.gray(`   Inventory items: ${inventoryItems.length}`));
      } else {
        console.log(chalk.yellow('⚠️  Inventory service responded but may have issues'));
      }

      console.log(chalk.green('\n🎉 Basic functionality test completed successfully!'));
      console.log(chalk.blue('\n📋 Next Steps:'));
      console.log(chalk.gray('1. Add menu items to your restaurant'));
      console.log(chalk.gray('2. Add inventory items'));
      console.log(chalk.gray('3. Create customers and process orders'));
      console.log(chalk.gray('4. View analytics and reports'));

    } else {
      console.log(chalk.red('❌ Failed to create tenant'));
      const errorText = await tenantResponse.text();
      console.log(chalk.red(`   Error: ${errorText}`));
    }

  } catch (error) {
    console.log(chalk.red('❌ Basic functionality test failed:'), error.message);
  }
}

// Run the test
testServices().catch(error => {
  console.error(chalk.red('💥 Test failed:'), error);
  process.exit(1);
});
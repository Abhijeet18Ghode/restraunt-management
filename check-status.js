async function checkStatus() {
  console.log('🔍 Checking Restaurant Management System Status...\n');

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

  let workingCount = 0;

  for (const service of services) {
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        console.log(`✅ ${service.name} (port ${service.port}) - HEALTHY`);
        workingCount++;
      } else {
        console.log(`❌ ${service.name} (port ${service.port}) - ERROR ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${service.name} (port ${service.port}) - NOT RESPONDING`);
    }
  }

  console.log(`\n📊 Status: ${workingCount}/${services.length} services are healthy`);

  if (workingCount >= 5) {
    console.log('\n🎉 System is ready for testing!');
    console.log('\nYou can now:');
    console.log('1. Create restaurants (tenants)');
    console.log('2. Add menu items and inventory');
    console.log('3. Process orders and payments');
    console.log('4. View analytics and reports');
    
    return true;
  } else {
    console.log('\n⚠️  Some services are not running. System may have limited functionality.');
    return false;
  }
}

checkStatus().catch(console.error);
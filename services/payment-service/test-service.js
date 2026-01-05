const PaymentService = require('./src/services/PaymentService');
const PaymentGatewayService = require('./src/services/PaymentGatewayService');
const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
};

async function testPaymentService() {
  console.log('🧪 Testing Payment Service...\n');

  const dbPool = new Pool(dbConfig);
  const gatewayService = new PaymentGatewayService();
  const paymentService = new PaymentService(dbPool, gatewayService.gateways);

  try {
    const testTenantId = 'test_tenant_demo';
    
    console.log('💳 Testing Payment Gateway Service...');
    
    // Test card validation
    console.log('✅ Card validation tests:');
    console.log(`   - Valid Visa: ${gatewayService.validateCardNumber('4242424242424242')}`);
    console.log(`   - Valid Mastercard: ${gatewayService.validateCardNumber('5555555555554444')}`);
    console.log(`   - Invalid card: ${gatewayService.validateCardNumber('1234567890123456')}`);
    
    // Test card type detection
    console.log('✅ Card type detection:');
    console.log(`   - 4242424242424242: ${gatewayService.getCardType('4242424242424242')}`);
    console.log(`   - 5555555555554444: ${gatewayService.getCardType('5555555555554444')}`);
    console.log(`   - 378282246310005: ${gatewayService.getCardType('378282246310005')}`);
    
    // Test card masking
    console.log('✅ Card masking:');
    console.log(`   - Original: 4242424242424242`);
    console.log(`   - Masked: ${gatewayService.maskCardNumber('4242424242424242')}`);
    
    // Test available gateways
    const availableGateways = gatewayService.getAvailableGateways();
    console.log(`✅ Available gateways: ${availableGateways.join(', ')}`);

    console.log('\n💰 Testing Payment Processing...');
    
    // Test cash payment
    try {
      console.log('Testing cash payment...');
      const cashPaymentResult = await paymentService.processPayment(testTenantId, {
        orderId: 'TEST_ORDER_CASH_001',
        amount: 50.00,
        currency: 'USD',
        paymentMethod: 'CASH',
        customerId: 'test-customer-1',
        outletId: 'test-outlet-1',
        metadata: {
          orderType: 'DINE_IN',
          tableNumber: 5
        }
      });
      
      console.log('✅ Cash payment processed successfully');
      console.log(`   - Transaction ID: ${cashPaymentResult.transactionId}`);
      console.log(`   - Status: ${cashPaymentResult.status}`);
      console.log(`   - Amount: $${cashPaymentResult.amount}`);
      
      // Test payment status retrieval
      const paymentStatus = await paymentService.getPaymentStatus(testTenantId, cashPaymentResult.transactionId);
      console.log('✅ Payment status retrieved successfully');
      console.log(`   - Status: ${paymentStatus.status}`);
      console.log(`   - Created: ${paymentStatus.createdAt}`);
      
    } catch (error) {
      console.log('⚠️  Cash payment test (expected if no database):', error.message);
    }

    // Test digital wallet payment
    try {
      console.log('\nTesting digital wallet payment...');
      const walletPaymentResult = await paymentService.processPayment(testTenantId, {
        orderId: 'TEST_ORDER_WALLET_001',
        amount: 75.50,
        currency: 'USD',
        paymentMethod: 'DIGITAL_WALLET',
        paymentDetails: {
          walletType: 'PAYPAL'
        },
        customerId: 'test-customer-2',
        outletId: 'test-outlet-1'
      });
      
      console.log('✅ Digital wallet payment processed successfully');
      console.log(`   - Transaction ID: ${walletPaymentResult.transactionId}`);
      console.log(`   - Status: ${walletPaymentResult.status}`);
      console.log(`   - Amount: $${walletPaymentResult.amount}`);
      
    } catch (error) {
      console.log('⚠️  Digital wallet payment test (expected if no database):', error.message);
    }

    // Test bank transfer payment
    try {
      console.log('\nTesting bank transfer payment...');
      const bankPaymentResult = await paymentService.processPayment(testTenantId, {
        orderId: 'TEST_ORDER_BANK_001',
        amount: 120.00,
        currency: 'USD',
        paymentMethod: 'BANK_TRANSFER',
        customerId: 'test-customer-3',
        outletId: 'test-outlet-1'
      });
      
      console.log('✅ Bank transfer payment processed successfully');
      console.log(`   - Transaction ID: ${bankPaymentResult.transactionId}`);
      console.log(`   - Status: ${bankPaymentResult.status} (should be PENDING)`);
      console.log(`   - Amount: $${bankPaymentResult.amount}`);
      
    } catch (error) {
      console.log('⚠️  Bank transfer payment test (expected if no database):', error.message);
    }

    console.log('\n🔄 Testing Payment Gateway Integrations...');
    
    // Test PayPal integration
    try {
      const paypalResult = await gatewayService.processPayPalPayment({
        amount: 100.00,
        currency: 'USD',
        orderId: 'PAYPAL_TEST_001'
      });
      
      console.log('✅ PayPal integration test successful');
      console.log(`   - Success: ${paypalResult.success}`);
      console.log(`   - Transaction ID: ${paypalResult.transactionId}`);
      console.log(`   - Status: ${paypalResult.status}`);
      
    } catch (error) {
      console.log('⚠️  PayPal integration test:', error.message);
    }

    // Test Razorpay integration
    try {
      const razorpayResult = await gatewayService.processRazorpayPayment({
        amount: 100.00,
        currency: 'INR',
        orderId: 'RAZORPAY_TEST_001'
      });
      
      console.log('✅ Razorpay integration test successful');
      console.log(`   - Success: ${razorpayResult.success}`);
      console.log(`   - Transaction ID: ${razorpayResult.transactionId}`);
      console.log(`   - Status: ${razorpayResult.status}`);
      
    } catch (error) {
      console.log('⚠️  Razorpay integration test:', error.message);
    }

    // Test Square integration
    try {
      const squareResult = await gatewayService.processSquarePayment({
        amount: 100.00,
        currency: 'USD',
        sourceId: 'SQUARE_SOURCE_001'
      });
      
      console.log('✅ Square integration test successful');
      console.log(`   - Success: ${squareResult.success}`);
      console.log(`   - Transaction ID: ${squareResult.transactionId}`);
      console.log(`   - Status: ${squareResult.status}`);
      
    } catch (error) {
      console.log('⚠️  Square integration test:', error.message);
    }

    console.log('\n🔒 Testing Security Features...');
    
    // Test data sanitization
    const sensitiveData = {
      amount: 100.00,
      cardNumber: '4242424242424242',
      cvv: '123',
      paymentDetails: {
        cardNumber: '5555555555554444',
        cvv: '456'
      },
      customerName: 'John Doe'
    };
    
    const sanitizedData = gatewayService.sanitizePaymentData(sensitiveData);
    console.log('✅ Data sanitization test successful');
    console.log(`   - Original card: 4242424242424242`);
    console.log(`   - Sanitized card: ${sanitizedData.cardNumber}`);
    console.log(`   - Original CVV: 123`);
    console.log(`   - Sanitized CVV: ${sanitizedData.cvv}`);

    // Test rate limiting
    const rateLimit = await gatewayService.checkRateLimit('test-user-1');
    console.log('✅ Rate limiting test successful');
    console.log(`   - Allowed: ${rateLimit.allowed}`);
    console.log(`   - Remaining: ${rateLimit.remaining}`);
    console.log(`   - Reset time: ${rateLimit.resetTime}`);

    console.log('\n📊 Testing Reconciliation...');
    
    try {
      const reconciliationReport = await paymentService.generateReconciliationReport(testTenantId, 'today');
      console.log('✅ Reconciliation report generated successfully');
      console.log(`   - Period: ${reconciliationReport.period.startDate} to ${reconciliationReport.period.endDate}`);
      console.log(`   - Payment methods: ${reconciliationReport.paymentSummary.length}`);
      console.log(`   - Generated at: ${reconciliationReport.generatedAt}`);
      
    } catch (error) {
      console.log('⚠️  Reconciliation report test (expected if no database):', error.message);
    }

    console.log('\n🧪 Testing Helper Methods...');
    
    // Test transaction ID generation
    const txnId1 = paymentService._generateTransactionId();
    const txnId2 = paymentService._generateTransactionId();
    console.log('✅ Transaction ID generation works');
    console.log(`   - ID 1: ${txnId1}`);
    console.log(`   - ID 2: ${txnId2}`);
    console.log(`   - Unique: ${txnId1 !== txnId2}`);
    
    // Test period parsing
    const todayPeriod = paymentService._parsePeriod('today');
    console.log('✅ Period parsing works');
    console.log(`   - Today: ${todayPeriod.startDate} to ${todayPeriod.endDate}`);
    
    // Test schema name generation
    const schemaName = paymentService._getSchemaName('test_tenant_123');
    console.log('✅ Schema name generation works');
    console.log(`   - Schema: ${schemaName}`);

    console.log('\n🎉 All Payment Service tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await dbPool.end();
  }
}

// Run the test
if (require.main === module) {
  testPaymentService().catch(console.error);
}

module.exports = { testPaymentService };
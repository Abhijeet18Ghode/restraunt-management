// Set environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '24h';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.LOYALTY_POINTS_PER_DOLLAR = '1';
process.env.LOYALTY_TIER_THRESHOLDS = '100,500,1000,2000';

const CustomerService = require('./src/services/CustomerService');
const LoyaltyService = require('./src/services/LoyaltyService');
const FeedbackService = require('./src/services/FeedbackService');
const { DatabaseManager } = require('@rms/shared');

async function testCustomerService() {
  console.log('🧪 Testing Customer Relationship Management Service...\n');

  const dbManager = new DatabaseManager();
  const customerService = new CustomerService(dbManager);
  const loyaltyService = new LoyaltyService(dbManager);
  const feedbackService = new FeedbackService(dbManager);

  try {
    // Test 1: Create Customer Profile
    console.log('1️⃣ Testing Customer Profile Creation...');
    const customerData = {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      phone: '+1234567890',
      dateOfBirth: '1985-06-15',
      address: {
        street: '123 Oak Street',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
      preferences: {
        dietaryRestrictions: ['gluten-free'],
        favoriteItems: ['salad', 'grilled chicken'],
        communicationPreference: 'email',
      },
      source: 'ONLINE',
    };

    const customerResult = await customerService.createCustomer('tenant-1', customerData);
    console.log('✅ Customer created successfully:', customerResult.data.firstName, customerResult.data.lastName);
    console.log('   Email:', customerResult.data.email);
    console.log('   Loyalty Tier:', customerResult.data.loyaltyTier);
    console.log('   Source:', customerResult.data.source);

    const customerId = customerResult.data.id;

    // Test 2: Record Customer Orders
    console.log('\n2️⃣ Testing Customer Order Recording...');
    const orderData1 = {
      orderId: 'order-001',
      orderValue: 45.75,
      items: [
        { name: 'Caesar Salad', quantity: 1, price: 12.99 },
        { name: 'Grilled Chicken', quantity: 1, price: 18.99 },
        { name: 'Sparkling Water', quantity: 2, price: 6.99 },
      ],
    };

    const orderResult1 = await customerService.recordCustomerOrder('tenant-1', customerId, orderData1);
    console.log('✅ First order recorded successfully');
    console.log('   Order value:', '$' + orderData1.orderValue);
    console.log('   Points earned:', orderResult1.data.pointsEarned);
    console.log('   Total loyalty points:', orderResult1.data.customer.loyaltyPoints);

    // Record second order
    const orderData2 = {
      orderId: 'order-002',
      orderValue: 32.50,
      items: [
        { name: 'Quinoa Bowl', quantity: 1, price: 15.99 },
        { name: 'Green Smoothie', quantity: 1, price: 8.99 },
        { name: 'Gluten-Free Bread', quantity: 1, price: 7.52 },
      ],
    };

    const orderResult2 = await customerService.recordCustomerOrder('tenant-1', customerId, orderData2);
    console.log('✅ Second order recorded successfully');
    console.log('   Total orders:', orderResult2.data.customer.totalOrders);
    console.log('   Total spent:', '$' + orderResult2.data.customer.totalSpent);
    console.log('   Average order value:', '$' + orderResult2.data.customer.averageOrderValue);

    // Test 3: Loyalty Program - Award Points
    console.log('\n3️⃣ Testing Loyalty Program - Point Management...');
    const bonusPoints = await loyaltyService.awardPoints('tenant-1', customerId, 50, 'Birthday bonus', null);
    console.log('✅ Bonus points awarded successfully');
    console.log('   Bonus points:', bonusPoints.data.points);
    console.log('   Reason:', bonusPoints.data.reason);

    // Test 4: Loyalty Program - Redeem Rewards
    console.log('\n4️⃣ Testing Loyalty Program - Reward Redemption...');
    const loyaltySummary = await loyaltyService.getLoyaltySummary('tenant-1', customerId, customerService);
    console.log('✅ Loyalty summary retrieved');
    console.log('   Current points:', loyaltySummary.data.currentPoints);
    console.log('   Current tier:', loyaltySummary.data.currentTier);
    console.log('   Available rewards:', loyaltySummary.data.availableRewards.length);

    // Redeem a reward
    const redeemResult = await loyaltyService.redeemPoints('tenant-1', customerId, 'reward-free-drink', customerService);
    console.log('✅ Reward redeemed successfully');
    console.log('   Redeemed reward:', redeemResult.data.reward.name);
    console.log('   Points used:', redeemResult.data.reward.pointsCost);
    console.log('   Remaining points:', redeemResult.data.remainingPoints);

    // Test 5: Customer Feedback
    console.log('\n5️⃣ Testing Customer Feedback System...');
    const feedbackData = {
      customerId: customerId,
      orderId: 'order-001',
      rating: 5,
      comment: 'Absolutely fantastic! The Caesar salad was fresh and the grilled chicken was perfectly cooked. Will definitely be back!',
      category: 'FOOD',
      tags: ['delicious', 'fresh', 'excellent service'],
    };

    const feedbackResult = await feedbackService.submitFeedback('tenant-1', feedbackData);
    console.log('✅ Customer feedback submitted successfully');
    console.log('   Rating:', feedbackResult.data.rating + '/5 stars');
    console.log('   Category:', feedbackResult.data.category);
    console.log('   Status:', feedbackResult.data.status);

    const feedbackId = feedbackResult.data.id;

    // Test 6: Feedback Management - Response
    console.log('\n6️⃣ Testing Feedback Management...');
    const responseText = 'Thank you so much for your wonderful feedback, Sarah! We\'re thrilled to hear you enjoyed your meal. We look forward to serving you again soon!';
    const responseResult = await feedbackService.respondToFeedback('tenant-1', feedbackId, responseText, 'manager-1');
    console.log('✅ Feedback response added successfully');
    console.log('   Response status:', responseResult.data.status);
    console.log('   Responded by:', responseResult.data.respondedBy);

    // Make feedback public
    await feedbackService.toggleFeedbackVisibility('tenant-1', feedbackId, true);
    console.log('✅ Feedback made public for display');

    // Test 7: Customer Analytics
    console.log('\n7️⃣ Testing Customer Analytics...');
    const analyticsResult = await customerService.getCustomerAnalytics('tenant-1', customerId);
    console.log('✅ Customer analytics generated successfully');
    console.log('   Total orders:', analyticsResult.data.totalOrders);
    console.log('   Total spent:', '$' + analyticsResult.data.totalSpent);
    console.log('   Loyalty points:', analyticsResult.data.loyaltyPoints);
    console.log('   Favorite items:', analyticsResult.data.favoriteItems.map(item => item.name).join(', '));
    console.log('   Days since last order:', analyticsResult.data.daysSinceLastOrder);

    // Test 8: Customer Search
    console.log('\n8️⃣ Testing Customer Search...');
    const searchResult = await customerService.searchCustomers('tenant-1', 'sarah');
    console.log('✅ Customer search completed successfully');
    console.log('   Search results:', searchResult.data.customers.length);
    console.log('   Found customer:', searchResult.data.customers[0]?.firstName, searchResult.data.customers[0]?.lastName);

    // Test 9: Feedback Analytics
    console.log('\n9️⃣ Testing Feedback Analytics...');
    const feedbackSummary = await feedbackService.getFeedbackSummary('tenant-1');
    console.log('✅ Feedback summary generated successfully');
    console.log('   Total feedback:', feedbackSummary.data.totalFeedback);
    console.log('   Average rating:', feedbackSummary.data.averageRating + '/5');
    console.log('   Response rate:', feedbackSummary.data.responseRate + '%');
    console.log('   Public feedback count:', feedbackSummary.data.publicFeedbackCount);

    // Test 10: Public Feedback Display
    console.log('\n🔟 Testing Public Feedback Display...');
    const publicFeedback = await feedbackService.getPublicFeedback('tenant-1');
    console.log('✅ Public feedback retrieved successfully');
    console.log('   Public reviews:', publicFeedback.data.feedback.length);
    if (publicFeedback.data.feedback.length > 0) {
      const review = publicFeedback.data.feedback[0];
      console.log('   Sample review:', review.rating + '/5 -', review.comment.substring(0, 50) + '...');
    }

    // Test 11: Loyalty Report
    console.log('\n1️⃣1️⃣ Testing Loyalty Program Reporting...');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();

    const loyaltyReport = await loyaltyService.generateLoyaltyReport(
      'tenant-1',
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    console.log('✅ Loyalty report generated successfully');
    console.log('   Points awarded:', loyaltyReport.data.totalPointsAwarded);
    console.log('   Points redeemed:', loyaltyReport.data.totalPointsRedeemed);
    console.log('   Total redemptions:', loyaltyReport.data.totalRedemptions);
    console.log('   Active customers:', loyaltyReport.data.activeCustomers);

    // Test 12: Customer Order History
    console.log('\n1️⃣2️⃣ Testing Customer Order History...');
    const orderHistory = await customerService.getCustomerOrderHistory('tenant-1', customerId);
    console.log('✅ Customer order history retrieved successfully');
    console.log('   Total orders in history:', orderHistory.data.totalOrders);
    console.log('   Recent orders:', orderHistory.data.orderHistory.length);
    if (orderHistory.data.orderHistory.length > 0) {
      const recentOrder = orderHistory.data.orderHistory[0];
      console.log('   Most recent order value:', '$' + recentOrder.orderValue);
      console.log('   Points earned:', recentOrder.pointsEarned);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Customer Relationship Management Service Summary:');
    console.log('   ✅ Customer profile creation and management');
    console.log('   ✅ Order history tracking and analytics');
    console.log('   ✅ Loyalty program with points and tiers');
    console.log('   ✅ Reward catalog and redemption system');
    console.log('   ✅ Customer feedback and review system');
    console.log('   ✅ Feedback management and responses');
    console.log('   ✅ Customer analytics and insights');
    console.log('   ✅ Search and filtering capabilities');
    console.log('   ✅ Public review display system');
    console.log('   ✅ Comprehensive reporting and analytics');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testCustomerService().catch(console.error);
}

module.exports = testCustomerService;
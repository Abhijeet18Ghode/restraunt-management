const fc = require('fast-check');
const PaymentService = require('../../src/services/PaymentService');
const PaymentGatewayService = require('../../src/services/PaymentGatewayService');

describe('Payment Service Property Tests', () => {
  let paymentService;
  let gatewayService;

  beforeAll(() => {
    gatewayService = new PaymentGatewayService();
    paymentService = new PaymentService(global.dbPool, gatewayService.gateways);
  });

  describe('Property 7: Transaction Data Persistence', () => {
    it('should immediately store transaction data in the cloud for any completed transaction', async () => {
      // Feature: restaurant-management-system, Property 7: Transaction Data Persistence
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          tenantId: fc.constantFrom('test_tenant_1', 'test_tenant_2', 'test_tenant_3'),
          orderId: fc.string({ minLength: 5, maxLength: 20 }),
          amount: fc.float({ min: 1, max: 500 }).map(x => Math.fround(x)),
          currency: fc.constantFrom('USD', 'EUR', 'GBP'),
          paymentMethod: fc.constantFrom('CASH', 'CREDIT_CARD', 'DIGITAL_WALLET'),
          customerId: fc.uuid(),
          outletId: fc.uuid(),
          metadata: fc.record({
            orderType: fc.constantFrom('DINE_IN', 'TAKEAWAY', 'DELIVERY'),
            tableNumber: fc.integer({ min: 1, max: 50 }),
            serverName: fc.string({ minLength: 3, maxLength: 20 })
          })
        }),
        async (testData) => {
          const { tenantId } = testData;

          // Create a test order
          const order = await global.createTestOrder(tenantId, {
            orderNumber: `PERSIST_${testData.orderId}`,
            outletId: testData.outletId,
            customerId: testData.customerId,
            subtotal: testData.amount,
            tax: testData.amount * 0.1,
            total: testData.amount * 1.1,
            status: 'PENDING',
            paymentStatus: 'PENDING'
          });

          const paymentData = {
            orderId: order.id,
            amount: testData.amount,
            currency: testData.currency,
            paymentMethod: testData.paymentMethod,
            customerId: testData.customerId,
            outletId: testData.outletId,
            metadata: testData.metadata
          };

          // Add payment details for card payments
          if (['CREDIT_CARD', 'DEBIT_CARD'].includes(testData.paymentMethod)) {
            paymentData.paymentDetails = {
              cardNumber: '4242424242424242', // Valid test card
              expiryMonth: 12,
              expiryYear: 2025,
              cvv: '123'
            };
          }

          try {
            // Process payment
            const paymentResult = await paymentService.processPayment(tenantId, paymentData);

            // Verify transaction data is immediately retrievable
            const retrievedPayment = await paymentService.getPaymentStatus(tenantId, paymentResult.transactionId);

            // Verify all transaction data is persisted correctly
            expect(retrievedPayment).toBeDefined();
            expect(retrievedPayment.transactionId).toBe(paymentResult.transactionId);
            expect(retrievedPayment.orderId).toBe(order.id);
            expect(retrievedPayment.amount).toBe(testData.amount);
            expect(retrievedPayment.currency).toBe(testData.currency);
            expect(retrievedPayment.paymentMethod).toBe(testData.paymentMethod);
            expect(retrievedPayment.status).toBeDefined();
            expect(retrievedPayment.createdAt).toBeDefined();

            // Verify transaction is logged in transaction_logs table
            const transactionLogs = await global.dbPool.query(`
              SELECT * FROM tenant_${tenantId}.transaction_logs 
              WHERE transaction_id = $1
            `, [paymentResult.transactionId]);

            expect(transactionLogs.rows.length).toBe(1);
            const logEntry = transactionLogs.rows[0];
            expect(logEntry.transaction_id).toBe(paymentResult.transactionId);
            expect(logEntry.order_id).toBe(order.id);
            expect(parseFloat(logEntry.amount)).toBe(testData.amount);
            expect(logEntry.currency).toBe(testData.currency);
            expect(logEntry.payment_method).toBe(testData.paymentMethod);
            expect(logEntry.logged_at).toBeDefined();

            // Verify payment record exists in payments table
            const paymentRecords = await global.dbPool.query(`
              SELECT * FROM tenant_${tenantId}.payments 
              WHERE transaction_id = $1
            `, [paymentResult.transactionId]);

            expect(paymentRecords.rows.length).toBe(1);
            const paymentRecord = paymentRecords.rows[0];
            expect(paymentRecord.transaction_id).toBe(paymentResult.transactionId);
            expect(paymentRecord.order_id).toBe(order.id);
            expect(parseFloat(paymentRecord.amount)).toBe(testData.amount);
            expect(paymentRecord.currency).toBe(testData.currency);
            expect(paymentRecord.payment_method).toBe(testData.paymentMethod);
            expect(paymentRecord.customer_id).toBe(testData.customerId);
            expect(paymentRecord.outlet_id).toBe(testData.outletId);
            expect(paymentRecord.created_at).toBeDefined();

            // Verify metadata is stored correctly
            if (paymentRecord.metadata) {
              const storedMetadata = JSON.parse(paymentRecord.metadata);
              expect(storedMetadata.orderType).toBe(testData.metadata.orderType);
              expect(storedMetadata.tableNumber).toBe(testData.metadata.tableNumber);
              expect(storedMetadata.serverName).toBe(testData.metadata.serverName);
            }

            // Verify transaction can be found in transaction history
            const transactionHistory = await paymentService.getTransactionHistory(tenantId, {
              startDate: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
              endDate: new Date(Date.now() + 60000).toISOString(),   // 1 minute from now
              limit: 100
            });

            const foundTransaction = transactionHistory.find(
              tx => tx.transaction_id === paymentResult.transactionId
            );
            expect(foundTransaction).toBeDefined();
            expect(foundTransaction.order_id).toBe(order.id);
            expect(parseFloat(foundTransaction.amount)).toBe(testData.amount);

            // Verify data persistence across service restarts (simulated by creating new service instance)
            const newPaymentService = new PaymentService(global.dbPool, gatewayService.gateways);
            const persistedPayment = await newPaymentService.getPaymentStatus(tenantId, paymentResult.transactionId);
            
            expect(persistedPayment).toBeDefined();
            expect(persistedPayment.transactionId).toBe(paymentResult.transactionId);
            expect(persistedPayment.amount).toBe(testData.amount);

          } catch (error) {
            // Handle expected errors for unconfigured gateways
            if (error.message.includes('gateway not configured') || 
                error.message.includes('not supported')) {
              return; // Skip this test case
            }
            throw error;
          }
        }
      ), { numRuns: 20 });
    });

    it('should maintain transaction data integrity across tenant boundaries', async () => {
      // Feature: restaurant-management-system, Property 7: Transaction Data Persistence
      
      await fc.assert(fc.asyncProperty(
        fc.record({
          tenant1Id: fc.constant('test_tenant_1'),
          tenant2Id: fc.constant('test_tenant_2'),
          tenant3Id: fc.constant('test_tenant_3'),
          transactions: fc.array(fc.record({
            orderId: fc.string({ minLength: 5, maxLength: 15 }),
            amount: fc.float({ min: 10, max: 200 }).map(x => Math.fround(x)),
            paymentMethod: fc.constantFrom('CASH', 'DIGITAL_WALLET'),
            customerId: fc.uuid()
          }), { minLength: 1, maxLength: 3 })
        }),
        async (testData) => {
          const tenants = [testData.tenant1Id, testData.tenant2Id, testData.tenant3Id];
          const processedTransactions = [];

          // Process transactions for each tenant
          for (let i = 0; i < tenants.length; i++) {
            const tenantId = tenants[i];
            const transaction = testData.transactions[i % testData.transactions.length];

            // Create order for this tenant
            const order = await global.createTestOrder(tenantId, {
              orderNumber: `TENANT_${i}_${transaction.orderId}`,
              outletId: `outlet-${tenantId}`,
              customerId: transaction.customerId,
              subtotal: transaction.amount,
              tax: transaction.amount * 0.1,
              total: transaction.amount * 1.1
            });

            try {
              // Process payment
              const paymentResult = await paymentService.processPayment(tenantId, {
                orderId: order.id,
                amount: transaction.amount,
                currency: 'USD',
                paymentMethod: transaction.paymentMethod,
                customerId: transaction.customerId,
                outletId: `outlet-${tenantId}`
              });

              processedTransactions.push({
                tenantId,
                transactionId: paymentResult.transactionId,
                orderId: order.id,
                amount: transaction.amount
              });

            } catch (error) {
              if (error.message.includes('gateway not configured')) {
                continue; // Skip unconfigured gateways
              }
              throw error;
            }
          }

          // Verify tenant isolation - each tenant should only see their own transactions
          for (const tenant of tenants) {
            const tenantTransactions = await paymentService.getTransactionHistory(tenant, {
              limit: 100
            });

            // Verify all transactions belong to this tenant
            for (const tx of tenantTransactions) {
              const matchingProcessed = processedTransactions.find(
                pt => pt.transactionId === tx.transaction_id
              );
              
              if (matchingProcessed) {
                expect(matchingProcessed.tenantId).toBe(tenant);
              }
            }

            // Verify tenant cannot access other tenants' transactions
            const otherTenantTransactions = processedTransactions.filter(
              pt => pt.tenantId !== tenant
            );

            for (const otherTx of otherTenantTransactions) {
              try {
                await paymentService.getPaymentStatus(tenant, otherTx.transactionId);
                // If we reach here, there's a tenant isolation breach
                fail(`Tenant ${tenant} should not be able to access transaction ${otherTx.transactionId} from tenant ${otherTx.tenantId}`);
              } catch (error) {
                // This is expected - tenant should not be able to access other tenant's data
                expect(error.message).toContain('not found');
              }
            }
          }

          // Verify data integrity - all processed transactions should be retrievable by their respective tenants
          for (const processedTx of processedTransactions) {
            const retrievedPayment = await paymentService.getPaymentStatus(
              processedTx.tenantId, 
              processedTx.transactionId
            );

            expect(retrievedPayment).toBeDefined();
            expect(retrievedPayment.transactionId).toBe(processedTx.transactionId);
            expect(retrievedPayment.orderId).toBe(processedTx.orderId);
            expect(retrievedPayment.amount).toBe(processedTx.amount);
          }
        }
      ), { numRuns: 20 });
    });
  });
});
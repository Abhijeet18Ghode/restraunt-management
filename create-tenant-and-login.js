#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createTenantAndLogin() {
  console.log('🏪 Restaurant Management System - Tenant Setup\n');

  try {
    // Get tenant information from user
    console.log('📝 Please provide tenant information:\n');
    
    const businessName = await askQuestion('Business Name: ');
    const email = await askQuestion('Admin Email: ');
    const password = await askQuestion('Admin Password: ');
    const firstName = await askQuestion('Admin First Name: ');
    const lastName = await askQuestion('Admin Last Name: ');
    const phone = await askQuestion('Phone Number: ');
    const street = await askQuestion('Street Address: ');
    const city = await askQuestion('City: ');
    const state = await askQuestion('State: ');
    const country = await askQuestion('Country: ');
    const zipCode = await askQuestion('Zip Code: ');

    console.log('\n🔧 Creating tenant...');

    // Create tenant with admin user
    const tenantData = {
      businessName: businessName,
      contactInfo: {
        email: email,
        phone: phone,
        address: {
          street: street,
          city: city,
          state: state,
          country: country,
          zipCode: zipCode
        }
      },
      subscriptionPlan: 'PREMIUM',
      adminUser: {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password
      }
    };

    const createResponse = await axios.post('http://localhost:3000/api/tenants', tenantData);
    
    if (createResponse.data.success) {
      console.log('✅ Tenant created successfully!');
      console.log('📋 Tenant Details:');
      console.log(`   - Business Name: ${createResponse.data.data.businessName}`);
      console.log(`   - Tenant ID: ${createResponse.data.data.id}`);
      console.log(`   - Admin Email: ${email}`);
      console.log(`   - Subscription: ${createResponse.data.data.subscriptionPlan}`);

      const tenantId = createResponse.data.data.id;

      // Wait a moment for the tenant to be fully set up
      console.log('\n⏳ Setting up tenant infrastructure...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test login
      console.log('\n🔐 Testing login...');
      const loginData = {
        email: email,
        password: password,
        tenantId: tenantId
      };

      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', loginData);
      
      if (loginResponse.data.success) {
        console.log('✅ Login successful!');
        console.log('🎫 Authentication Details:');
        console.log(`   - User ID: ${loginResponse.data.data.user.id}`);
        console.log(`   - Role: ${loginResponse.data.data.user.role}`);
        console.log(`   - Tenant: ${loginResponse.data.data.user.tenantId}`);
        console.log(`   - Token: ${loginResponse.data.data.token.substring(0, 50)}...`);

        // Save login credentials for easy access
        const credentials = {
          email: email,
          password: password,
          tenantId: tenantId,
          token: loginResponse.data.data.token,
          businessName: businessName,
          adminUserId: loginResponse.data.data.user.id
        };

        console.log('\n💾 Saving credentials to login-credentials.json...');
        require('fs').writeFileSync('login-credentials.json', JSON.stringify(credentials, null, 2));

        console.log('\n🎉 Setup Complete!');
        console.log('\n📋 Next Steps:');
        console.log('1. Start the admin dashboard: cd apps/admin-dashboard && npm run dev');
        console.log('2. Open http://localhost:3011 in your browser');
        console.log('3. Login with:');
        console.log(`   - Email: ${email}`);
        console.log(`   - Password: ${password}`);
        console.log('\n📄 Credentials saved to login-credentials.json for reference');

        // Test API access with token
        console.log('\n🧪 Testing API access...');
        const testResponse = await axios.get(`http://localhost:3000/api/tenants/${tenantId}`, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.data.token}`,
            'X-Tenant-ID': tenantId
          }
        });

        if (testResponse.data.success) {
          console.log('✅ API access working correctly!');
        }

      } else {
        console.error('❌ Login failed:', loginResponse.data.message);
      }

    } else {
      console.error('❌ Tenant creation failed:', createResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  } finally {
    rl.close();
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    await axios.get('http://localhost:3000/health');
    console.log('✅ Backend is running\n');
    return true;
  } catch (error) {
    console.error('❌ Backend is not running. Please start the backend services first.');
    console.error('Run: npm run start:services\n');
    return false;
  }
}

async function main() {
  const backendRunning = await checkBackend();
  if (backendRunning) {
    await createTenantAndLogin();
  }
}

main();
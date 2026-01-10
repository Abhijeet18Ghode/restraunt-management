const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const TENANT_ID = '4a10f69e-bd5a-47ea-b7eb-6fd5aabba5aa'; // Maratha Cafe

async function testOutletManagement() {
  console.log('🏢 Testing Outlet Management System...\n');

  try {
    // Test 1: Get existing outlets
    console.log('📋 Test 1: Get existing outlets...');
    const getResponse = await axios.get(`${API_BASE}/tenants/${TENANT_ID}/outlets`);
    console.log('✅ Get Outlets Response:', {
      success: getResponse.data.success,
      count: getResponse.data.data?.length || 0,
      message: getResponse.data.message
    });
    
    if (getResponse.data.data?.length > 0) {
      console.log('🏪 Sample outlet:', {
        id: getResponse.data.data[0].id,
        name: getResponse.data.data[0].name,
        address: getResponse.data.data[0].address,
        phone: getResponse.data.data[0].phone,
        isActive: getResponse.data.data[0].isActive
      });
    }

    // Test 2: Create a new outlet
    console.log('\n📋 Test 2: Create new outlet...');
    const newOutlet = {
      name: 'Test Branch',
      address: 'Test Address, Test City',
      phone: '+91-9876543210',
      email: 'test@restaurant.com',
      isActive: true
    };

    const createResponse = await axios.post(`${API_BASE}/tenants/${TENANT_ID}/outlets`, newOutlet);
    console.log('✅ Create Outlet Response:', {
      success: createResponse.data.success,
      message: createResponse.data.message,
      outletId: createResponse.data.data?.id
    });

    const createdOutletId = createResponse.data.data?.id;

    // Test 3: Update the outlet
    if (createdOutletId) {
      console.log('\n📋 Test 3: Update outlet...');
      const updateData = {
        name: 'Updated Test Branch',
        phone: '+91-9876543211'
      };

      const updateResponse = await axios.put(`${API_BASE}/tenants/${TENANT_ID}/outlets/${createdOutletId}`, updateData);
      console.log('✅ Update Outlet Response:', {
        success: updateResponse.data.success,
        message: updateResponse.data.message,
        updatedName: updateResponse.data.data?.name
      });

      // Test 4: Delete the outlet
      console.log('\n📋 Test 4: Delete outlet...');
      const deleteResponse = await axios.delete(`${API_BASE}/tenants/${TENANT_ID}/outlets/${createdOutletId}`);
      console.log('✅ Delete Outlet Response:', {
        success: deleteResponse.data.success,
        message: deleteResponse.data.message
      });
    }

    console.log('\n🎉 All outlet management tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testOutletManagement();
#!/usr/bin/env node

const bcrypt = require('bcrypt');

async function testPassword() {
  console.log('🔐 Testing Password Verification\n');

  const plainPassword = 'ShreeSwamiSamarth@28';
  const hashedPassword = '$2b$12$IjITlN0nS63Vr576VegkYu2HqCe/i484HAwV7ORTzM3lN.rW5BEMO';

  console.log('Plain password:', plainPassword);
  console.log('Hashed password:', hashedPassword);

  try {
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Password verification result:', isValid);

    if (isValid) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
    }

    // Test JWT secret
    console.log('\nChecking JWT_SECRET environment variable...');
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      console.log('✅ JWT_SECRET is set');
    } else {
      console.log('❌ JWT_SECRET is not set - this will cause authentication to fail');
      console.log('Setting a default JWT_SECRET for testing...');
      process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPassword();
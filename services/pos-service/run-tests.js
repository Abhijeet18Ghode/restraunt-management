#!/usr/bin/env node

// Simple test runner to avoid debugger issues
const { execSync } = require('child_process');

try {
  console.log('Running POS Service tests...');
  
  // Run Jest with specific configuration
  const result = execSync('npx jest --no-coverage --forceExit --detectOpenHandles --verbose', {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_OPTIONS: '' }
  });
  
  console.log('Tests completed successfully');
} catch (error) {
  console.error('Test execution failed:', error.message);
  process.exit(1);
}
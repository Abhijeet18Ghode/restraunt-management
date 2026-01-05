console.log('Testing Node.js execution...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Current directory:', process.cwd());

// Test if fetch is available
if (typeof fetch !== 'undefined') {
  console.log('✅ Fetch is available');
} else {
  console.log('❌ Fetch is not available');
}

console.log('✅ Node.js is working correctly!');
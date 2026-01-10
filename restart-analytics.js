const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting Analytics Service...\n');

// Change to analytics service directory
const analyticsDir = path.join(__dirname, 'services', 'analytics-service');

// Start the analytics service
const analyticsProcess = spawn('npm', ['start'], {
  cwd: analyticsDir,
  stdio: 'inherit',
  shell: true
});

analyticsProcess.on('error', (error) => {
  console.error('❌ Failed to start analytics service:', error);
});

analyticsProcess.on('close', (code) => {
  console.log(`Analytics service exited with code ${code}`);
});

console.log('✅ Analytics service starting...');
console.log('📋 Check http://localhost:3008/health to verify it\'s running');

// Keep the process alive
process.on('SIGINT', () => {
  console.log('\n🔄 Stopping analytics service...');
  analyticsProcess.kill('SIGINT');
  process.exit(0);
});
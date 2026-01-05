#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

// Service configuration
const services = [
  { name: 'api-gateway', port: 3000, path: 'services/api-gateway' },
  { name: 'tenant-service', port: 3001, path: 'services/tenant-service' },
  { name: 'menu-service', port: 3002, path: 'services/menu-service' },
  { name: 'inventory-service', port: 3003, path: 'services/inventory-service' },
  { name: 'pos-service', port: 3004, path: 'services/pos-service' },
  { name: 'online-order-service', port: 3005, path: 'services/online-order-service' },
  { name: 'staff-service', port: 3006, path: 'services/staff-service' },
  { name: 'customer-service', port: 3007, path: 'services/customer-service' },
  { name: 'analytics-service', port: 3008, path: 'services/analytics-service' },
  { name: 'payment-service', port: 3009, path: 'services/payment-service' },
  { name: 'websocket-service', port: 3010, path: 'services/websocket-service' }
];

class SimpleSystemManager {
  constructor() {
    this.processes = new Map();
  }

  async installDependencies() {
    console.log(chalk.cyan('📦 Installing dependencies for all services...'));
    
    for (const service of services) {
      console.log(chalk.blue(`Installing dependencies for ${service.name}...`));
      
      try {
        await this.runCommand('npm', ['install'], service.path);
        console.log(chalk.green(`✅ Dependencies installed for ${service.name}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Could not install dependencies for ${service.name}: ${error.message}`));
      }
    }
  }

  async startService(service) {
    console.log(chalk.blue(`🚀 Starting ${service.name} on port ${service.port}...`));

    const env = {
      ...process.env,
      PORT: service.port,
      NODE_ENV: 'development',
      SERVICE_NAME: service.name
    };

    const serviceProcess = spawn('node', ['src/app.js'], {
      cwd: path.resolve(process.cwd(), service.path),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true // Use shell for Windows compatibility
    });

    // Handle service output
    serviceProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(chalk.green(`[${service.name}]`), output);
      }
    });

    serviceProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(chalk.red(`[${service.name}]`), output);
      }
    });

    serviceProcess.on('close', (code) => {
      console.log(chalk.red(`💥 Service ${service.name} exited with code ${code}`));
      this.processes.delete(service.name);
    });

    serviceProcess.on('error', (error) => {
      console.log(chalk.red(`❌ Failed to start ${service.name}:`, error.message));
    });

    this.processes.set(service.name, {
      process: serviceProcess,
      service,
      startTime: new Date()
    });

    // Wait a bit for the service to start
    await this.sleep(3000);

    // Check if service is responding
    try {
      const response = await fetch(`http://localhost:${service.port}/health`);
      if (response.ok) {
        console.log(chalk.green(`✅ ${service.name} is ready on port ${service.port}`));
      } else {
        console.log(chalk.yellow(`⚠️  ${service.name} started but health check failed`));
      }
    } catch (error) {
      console.log(chalk.yellow(`⚠️  ${service.name} started but not responding to health checks yet`));
    }
  }

  async startAllServices() {
    console.log(chalk.cyan('🌟 Starting Restaurant Management System (Simple Mode)...'));
    
    for (const service of services) {
      try {
        await this.startService(service);
        await this.sleep(2000); // Wait between services
      } catch (error) {
        console.log(chalk.red(`❌ Failed to start ${service.name}, continuing...`));
      }
    }

    console.log(chalk.green('🎉 System startup completed!'));
    this.printStatus();
  }

  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd: path.resolve(process.cwd(), cwd),
        stdio: 'inherit',
        shell: true // Use shell for Windows compatibility
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      childProcess.on('error', reject);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  printStatus() {
    console.log(chalk.cyan('\n📊 System Status:'));
    console.log(chalk.cyan('─'.repeat(50)));

    for (const [serviceName, serviceInfo] of this.processes) {
      const uptime = Math.floor((Date.now() - serviceInfo.startTime.getTime()) / 1000);
      console.log(chalk.green(`✅ ${serviceName.padEnd(20)} Port: ${serviceInfo.service.port} Uptime: ${uptime}s`));
    }

    const stoppedServices = services.filter(s => !this.processes.has(s.name));
    for (const service of stoppedServices) {
      console.log(chalk.red(`❌ ${service.name.padEnd(20)} Not running`));
    }

    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.green(`🏃 Running: ${this.processes.size}/${services.length} services`));
  }

  async stopAllServices() {
    console.log(chalk.cyan('🛑 Shutting down all services...'));
    
    for (const [serviceName, serviceInfo] of this.processes) {
      try {
        serviceInfo.process.kill('SIGTERM');
        console.log(chalk.green(`✅ ${serviceName} stopped`));
      } catch (error) {
        console.log(chalk.red(`❌ Error stopping ${serviceName}:`, error.message));
      }
    }
    
    this.processes.clear();
    console.log(chalk.green('✅ System shutdown completed'));
  }
}

async function main() {
  const manager = new SimpleSystemManager();
  
  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🔔 Received SIGINT, shutting down...'));
    await manager.stopAllServices();
    process.exit(0);
  });

  const command = process.argv[2];

  switch (command) {
    case 'install':
      await manager.installDependencies();
      break;
    case 'start':
      await manager.startAllServices();
      break;
    default:
      console.log(chalk.cyan('Simple System Manager'));
      console.log('Usage:');
      console.log('  node scripts/simple-start.js install  - Install dependencies');
      console.log('  node scripts/simple-start.js start    - Start all services');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  });
}
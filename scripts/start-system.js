#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

// Service configuration
const services = {
  'api-gateway': { port: 3000, path: 'services/api-gateway', priority: 1 },
  'tenant-service': { port: 3001, path: 'services/tenant-service', priority: 2 },
  'menu-service': { port: 3002, path: 'services/menu-service', priority: 3 },
  'inventory-service': { port: 3003, path: 'services/inventory-service', priority: 3 },
  'pos-service': { port: 3004, path: 'services/pos-service', priority: 4 },
  'online-order-service': { port: 3005, path: 'services/online-order-service', priority: 4 },
  'staff-service': { port: 3006, path: 'services/staff-service', priority: 3 },
  'customer-service': { port: 3007, path: 'services/customer-service', priority: 3 },
  'analytics-service': { port: 3008, path: 'services/analytics-service', priority: 5 },
  'payment-service': { port: 3009, path: 'services/payment-service', priority: 4 },
  'websocket-service': { port: 3010, path: 'services/websocket-service', priority: 5 }
};

class SystemManager {
  constructor() {
    this.processes = new Map();
    this.startupOrder = this.getStartupOrder();
    this.isShuttingDown = false;
  }

  getStartupOrder() {
    return Object.entries(services)
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([name]) => name);
  }

  async checkServiceExists(serviceName) {
    const config = services[serviceName];
    if (!config) return false;

    try {
      const servicePath = path.resolve(process.cwd(), config.path);
      await fs.access(path.join(servicePath, 'src/app.js'));
      return true;
    } catch {
      return false;
    }
  }

  async startService(serviceName) {
    if (this.processes.has(serviceName)) {
      console.log(chalk.yellow(`⚠️  Service ${serviceName} is already running`));
      return;
    }

    const config = services[serviceName];
    const servicePath = path.resolve(process.cwd(), config.path);

    console.log(chalk.blue(`🚀 Starting ${serviceName}...`));

    try {
      // Check if package.json exists and install dependencies if needed
      const packageJsonPath = path.join(servicePath, 'package.json');
      try {
        await fs.access(packageJsonPath);
        await fs.access(path.join(servicePath, 'node_modules'));
      } catch {
        console.log(chalk.yellow(`📦 Installing dependencies for ${serviceName}...`));
        await this.runCommand('npm', ['install'], servicePath);
      }

      // Set environment variables
      const env = {
        ...process.env,
        PORT: config.port,
        NODE_ENV: process.env.NODE_ENV || 'development',
        SERVICE_NAME: serviceName,
        API_GATEWAY_URL: 'http://localhost:3000'
      };

      // Start the service
      const isWindows = process.platform === 'win32';
      const nodeCommand = isWindows ? 'node.exe' : 'node';
      
      const serviceProcess = spawn(nodeCommand, ['src/app.js'], {
        cwd: servicePath,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: isWindows // Use shell on Windows for better compatibility
      });

      // Handle service output
      serviceProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(chalk.green(`[${serviceName}]`), output);
        }
      });

      serviceProcess.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(chalk.red(`[${serviceName}]`), output);
        }
      });

      serviceProcess.on('close', (code) => {
        if (!this.isShuttingDown) {
          console.log(chalk.red(`💥 Service ${serviceName} exited with code ${code}`));
        }
        this.processes.delete(serviceName);
      });

      serviceProcess.on('error', (error) => {
        console.log(chalk.red(`❌ Failed to start ${serviceName}:`, error.message));
        this.processes.delete(serviceName);
      });

      // Store process info
      this.processes.set(serviceName, {
        process: serviceProcess,
        config,
        startTime: new Date()
      });

      // Wait for service to be ready
      await this.waitForService(serviceName, config.port);
      console.log(chalk.green(`✅ ${serviceName} is ready on port ${config.port}`));

    } catch (error) {
      console.log(chalk.red(`❌ Failed to start ${serviceName}:`, error.message));
      throw error;
    }
  }

  async stopService(serviceName) {
    const serviceInfo = this.processes.get(serviceName);
    if (!serviceInfo) {
      console.log(chalk.yellow(`⚠️  Service ${serviceName} is not running`));
      return;
    }

    console.log(chalk.blue(`🛑 Stopping ${serviceName}...`));

    try {
      // Graceful shutdown
      serviceInfo.process.kill('SIGTERM');

      // Wait for graceful shutdown, then force kill if needed
      setTimeout(() => {
        if (this.processes.has(serviceName)) {
          console.log(chalk.yellow(`⚡ Force killing ${serviceName}...`));
          serviceInfo.process.kill('SIGKILL');
        }
      }, 10000);

      console.log(chalk.green(`✅ ${serviceName} stopped`));
    } catch (error) {
      console.log(chalk.red(`❌ Error stopping ${serviceName}:`, error.message));
    }
  }

  async startAllServices() {
    console.log(chalk.cyan('🌟 Starting Restaurant Management System...'));
    console.log(chalk.cyan('📋 Startup order:', this.startupOrder.join(' → ')));

    for (const serviceName of this.startupOrder) {
      try {
        const exists = await this.checkServiceExists(serviceName);
        if (!exists) {
          console.log(chalk.yellow(`⚠️  Skipping ${serviceName} (not found)`));
          continue;
        }

        await this.startService(serviceName);
        
        // Wait between service starts
        if (serviceName !== this.startupOrder[this.startupOrder.length - 1]) {
          await this.sleep(2000);
        }
      } catch (error) {
        console.log(chalk.red(`❌ Failed to start ${serviceName}, continuing...`));
      }
    }

    console.log(chalk.green('🎉 System startup completed!'));
    this.printStatus();
  }

  async stopAllServices() {
    console.log(chalk.cyan('🛑 Shutting down Restaurant Management System...'));
    this.isShuttingDown = true;

    // Stop in reverse order
    const stopOrder = [...this.startupOrder].reverse();
    
    for (const serviceName of stopOrder) {
      if (this.processes.has(serviceName)) {
        await this.stopService(serviceName);
      }
    }

    console.log(chalk.green('✅ System shutdown completed'));
  }

  async waitForService(serviceName, port, timeout = 30000) {
    const startTime = Date.now();
    const checkInterval = 1000;

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}/health`);
        if (response.ok) {
          return;
        }
      } catch {
        // Service not ready yet
      }

      await this.sleep(checkInterval);
    }

    throw new Error(`Service ${serviceName} did not become ready within ${timeout}ms`);
  }

  async runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
      // Fix for Windows - use .cmd extension for npm
      const isWindows = process.platform === 'win32';
      const actualCommand = isWindows && command === 'npm' ? 'npm.cmd' : command;
      
      const childProcess = spawn(actualCommand, args, { 
        cwd, 
        stdio: 'inherit',
        shell: isWindows // Use shell on Windows for better compatibility
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
      console.log(chalk.green(`✅ ${serviceName.padEnd(20)} Port: ${serviceInfo.config.port} Uptime: ${uptime}s`));
    }

    const stoppedServices = this.startupOrder.filter(name => !this.processes.has(name));
    for (const serviceName of stoppedServices) {
      console.log(chalk.red(`❌ ${serviceName.padEnd(20)} Not running`));
    }

    console.log(chalk.cyan('─'.repeat(50)));
    console.log(chalk.green(`🏃 Running: ${this.processes.size}/${this.startupOrder.length} services`));
  }

  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(chalk.yellow(`\n🔔 Received ${signal}, shutting down gracefully...`));
      await this.stopAllServices();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// CLI Interface
async function main() {
  const manager = new SystemManager();
  manager.setupSignalHandlers();

  const command = process.argv[2];
  const serviceName = process.argv[3];

  try {
    switch (command) {
      case 'start':
        if (serviceName) {
          await manager.startService(serviceName);
        } else {
          await manager.startAllServices();
        }
        break;

      case 'stop':
        if (serviceName) {
          await manager.stopService(serviceName);
        } else {
          await manager.stopAllServices();
          process.exit(0);
        }
        break;

      case 'restart':
        if (serviceName) {
          await manager.stopService(serviceName);
          await manager.sleep(2000);
          await manager.startService(serviceName);
        } else {
          await manager.stopAllServices();
          await manager.sleep(3000);
          await manager.startAllServices();
        }
        break;

      case 'status':
        manager.printStatus();
        break;

      case 'list':
        console.log(chalk.cyan('Available services:'));
        for (const [name, config] of Object.entries(services)) {
          console.log(chalk.blue(`  ${name.padEnd(20)} Port: ${config.port} Priority: ${config.priority}`));
        }
        break;

      default:
        console.log(chalk.cyan('Restaurant Management System - Service Manager'));
        console.log(chalk.cyan('Usage:'));
        console.log('  node scripts/start-system.js start [service-name]  - Start all services or specific service');
        console.log('  node scripts/start-system.js stop [service-name]   - Stop all services or specific service');
        console.log('  node scripts/start-system.js restart [service-name] - Restart all services or specific service');
        console.log('  node scripts/start-system.js status               - Show service status');
        console.log('  node scripts/start-system.js list                 - List available services');
        console.log(chalk.cyan('\nExamples:'));
        console.log('  node scripts/start-system.js start                - Start all services');
        console.log('  node scripts/start-system.js start pos-service    - Start only POS service');
        console.log('  node scripts/start-system.js stop                 - Stop all services');
        break;
    }
  } catch (error) {
    console.log(chalk.red('❌ Error:', error.message));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = SystemManager;
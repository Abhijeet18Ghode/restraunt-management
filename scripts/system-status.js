#!/usr/bin/env node

const chalk = require('chalk');
const { spawn } = require('child_process');

class SystemStatusDashboard {
  constructor() {
    this.services = {
      'api-gateway': { port: 3000, name: 'API Gateway' },
      'tenant-service': { port: 3001, name: 'Tenant Service' },
      'menu-service': { port: 3002, name: 'Menu Service' },
      'inventory-service': { port: 3003, name: 'Inventory Service' },
      'pos-service': { port: 3004, name: 'POS Service' },
      'online-order-service': { port: 3005, name: 'Online Order Service' },
      'staff-service': { port: 3006, name: 'Staff Service' },
      'customer-service': { port: 3007, name: 'Customer Service' },
      'analytics-service': { port: 3008, name: 'Analytics Service' },
      'payment-service': { port: 3009, name: 'Payment Service' },
      'websocket-service': { port: 3010, name: 'WebSocket Service' }
    };
  }

  async displayStatus() {
    console.clear();
    console.log(chalk.cyan('🏪 Restaurant Management System - Status Dashboard'));
    console.log(chalk.cyan('=' .repeat(70)));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleString()}`));
    console.log();

    // Check overall system health
    const systemHealth = await this.checkSystemHealth();
    this.displaySystemOverview(systemHealth);

    // Check individual services
    const serviceStatuses = await this.checkAllServices();
    this.displayServiceStatus(serviceStatuses);

    // Check frontend applications
    const frontendStatus = await this.checkFrontendApps();
    this.displayFrontendStatus(frontendStatus);

    // Display system metrics
    const metrics = await this.getSystemMetrics();
    this.displaySystemMetrics(metrics);

    // Display recent activity
    await this.displayRecentActivity();

    console.log();
    console.log(chalk.gray('Press Ctrl+C to exit, or run with --watch for continuous monitoring'));
  }

  async checkSystemHealth() {
    try {
      const response = await fetch('http://localhost:3000/health');
      if (response.ok) {
        const health = await response.json();
        return {
          status: 'healthy',
          uptime: health.uptime,
          memory: health.memory,
          version: health.version
        };
      } else {
        return { status: 'unhealthy', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  displaySystemOverview(health) {
    console.log(chalk.blue('📊 System Overview'));
    console.log(chalk.blue('─'.repeat(20)));

    if (health.status === 'healthy') {
      console.log(chalk.green('✅ System Status: HEALTHY'));
      console.log(chalk.gray(`   Uptime: ${Math.floor(health.uptime / 60)} minutes`));
      console.log(chalk.gray(`   Memory: ${(health.memory?.used / 1024 / 1024).toFixed(1)} MB used`));
      console.log(chalk.gray(`   Version: ${health.version}`));
    } else if (health.status === 'unhealthy') {
      console.log(chalk.yellow('⚠️  System Status: UNHEALTHY'));
      console.log(chalk.yellow(`   Error: ${health.error}`));
    } else {
      console.log(chalk.red('❌ System Status: OFFLINE'));
      console.log(chalk.red(`   Error: ${health.error}`));
    }
    console.log();
  }

  async checkAllServices() {
    const statuses = {};

    // Check through API Gateway service status endpoint
    try {
      const response = await fetch('http://localhost:3000/services/status');
      if (response.ok) {
        const data = await response.json();
        
        // Map the health data to our service structure
        for (const [serviceKey, serviceInfo] of Object.entries(this.services)) {
          const healthData = data.health?.[serviceKey];
          if (healthData) {
            statuses[serviceKey] = {
              status: healthData.status === 'healthy' ? 'running' : 'unhealthy',
              ...healthData
            };
          } else {
            statuses[serviceKey] = { status: 'unknown' };
          }
        }
      }
    } catch (error) {
      // Fallback to individual health checks
      for (const [serviceKey, serviceInfo] of Object.entries(this.services)) {
        statuses[serviceKey] = await this.checkIndividualService(serviceInfo.port);
      }
    }

    return statuses;
  }

  async checkIndividualService(port) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        timeout: 5000
      });
      
      if (response.ok) {
        const health = await response.json();
        return {
          status: 'running',
          uptime: health.uptime,
          memory: health.memory
        };
      } else {
        return { status: 'unhealthy', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }

  displayServiceStatus(statuses) {
    console.log(chalk.blue('🔧 Microservices Status'));
    console.log(chalk.blue('─'.repeat(25)));

    const runningServices = Object.values(statuses).filter(s => s.status === 'running').length;
    const totalServices = Object.keys(statuses).length;

    console.log(chalk.gray(`Services: ${runningServices}/${totalServices} running`));
    console.log();

    for (const [serviceKey, serviceInfo] of Object.entries(this.services)) {
      const status = statuses[serviceKey] || { status: 'unknown' };
      const statusIcon = this.getStatusIcon(status.status);
      const statusColor = this.getStatusColor(status.status);
      
      console.log(`${statusIcon} ${statusColor(serviceInfo.name.padEnd(20))} Port: ${serviceInfo.port} ${this.getStatusText(status)}`);
    }
    console.log();
  }

  async checkFrontendApps() {
    const apps = {
      'admin-dashboard': { port: 3001, name: 'Admin Dashboard' },
      'pos-interface': { port: 3002, name: 'POS Interface' }
    };

    const statuses = {};
    
    for (const [appKey, appInfo] of Object.entries(apps)) {
      try {
        // Check if the app is running (this would typically be a different check in production)
        const response = await fetch(`http://localhost:${appInfo.port}`, {
          timeout: 5000
        });
        
        statuses[appKey] = {
          status: response.ok ? 'running' : 'error',
          port: appInfo.port
        };
      } catch (error) {
        statuses[appKey] = {
          status: 'offline',
          error: error.message
        };
      }
    }

    return { apps, statuses };
  }

  displayFrontendStatus(frontendData) {
    console.log(chalk.blue('🖥️  Frontend Applications'));
    console.log(chalk.blue('─'.repeat(25)));

    for (const [appKey, appInfo] of Object.entries(frontendData.apps)) {
      const status = frontendData.statuses[appKey];
      const statusIcon = this.getStatusIcon(status.status);
      const statusColor = this.getStatusColor(status.status);
      
      console.log(`${statusIcon} ${statusColor(appInfo.name.padEnd(20))} Port: ${appInfo.port} ${this.getStatusText(status)}`);
    }
    console.log();
  }

  async getSystemMetrics() {
    try {
      const response = await fetch('http://localhost:3000/services/status');
      if (response.ok) {
        const data = await response.json();
        return {
          loadBalancer: data.loadBalancer || {},
          orchestrator: data.orchestrator || {},
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return { error: error.message };
    }
    
    return {};
  }

  displaySystemMetrics(metrics) {
    console.log(chalk.blue('📈 System Metrics'));
    console.log(chalk.blue('─'.repeat(18)));

    if (metrics.error) {
      console.log(chalk.red(`❌ Could not retrieve metrics: ${metrics.error}`));
    } else {
      // Display load balancer stats if available
      if (metrics.loadBalancer && Object.keys(metrics.loadBalancer).length > 0) {
        console.log(chalk.gray('Load Balancer:'));
        for (const [service, stats] of Object.entries(metrics.loadBalancer)) {
          console.log(chalk.gray(`  ${service}: ${stats.requests || 0} requests`));
        }
      }

      // Display orchestrator stats if available
      if (metrics.orchestrator && Object.keys(metrics.orchestrator).length > 0) {
        console.log(chalk.gray('Service Orchestrator:'));
        const runningCount = Object.values(metrics.orchestrator)
          .filter(service => service.status === 'running').length;
        console.log(chalk.gray(`  Running services: ${runningCount}`));
      }

      console.log(chalk.gray(`Last updated: ${new Date(metrics.timestamp).toLocaleTimeString()}`));
    }
    console.log();
  }

  async displayRecentActivity() {
    console.log(chalk.blue('📝 Recent Activity'));
    console.log(chalk.blue('─'.repeat(18)));

    // This would typically read from log files or a monitoring system
    // For now, we'll show a simple status
    console.log(chalk.gray('• System health checks completed'));
    console.log(chalk.gray('• All services monitored'));
    console.log(chalk.gray('• Status dashboard updated'));
    console.log();
  }

  getStatusIcon(status) {
    switch (status) {
      case 'running':
      case 'healthy':
        return chalk.green('✅');
      case 'unhealthy':
      case 'error':
        return chalk.yellow('⚠️ ');
      case 'offline':
        return chalk.red('❌');
      default:
        return chalk.gray('❓');
    }
  }

  getStatusColor(status) {
    switch (status) {
      case 'running':
      case 'healthy':
        return chalk.green;
      case 'unhealthy':
      case 'error':
        return chalk.yellow;
      case 'offline':
        return chalk.red;
      default:
        return chalk.gray;
    }
  }

  getStatusText(status) {
    const baseText = status.status.toUpperCase();
    
    if (status.uptime) {
      return `${baseText} (${Math.floor(status.uptime / 60)}m uptime)`;
    }
    
    if (status.error) {
      return `${baseText} (${status.error})`;
    }
    
    return baseText;
  }

  async watchMode() {
    console.log(chalk.cyan('🔄 Starting continuous monitoring mode...'));
    console.log(chalk.gray('Press Ctrl+C to exit'));
    console.log();

    const updateInterval = 5000; // 5 seconds

    const update = async () => {
      await this.displayStatus();
      setTimeout(update, updateInterval);
    };

    await update();
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    watch: false,
    help: false
  };

  // Parse command line arguments
  for (const arg of args) {
    switch (arg) {
      case '--watch':
      case '-w':
        options.watch = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  if (options.help) {
    printHelp();
    return;
  }

  const dashboard = new SystemStatusDashboard();

  if (options.watch) {
    await dashboard.watchMode();
  } else {
    await dashboard.displayStatus();
  }
}

function printHelp() {
  console.log(`
System Status Dashboard for Restaurant Management System

Usage: node scripts/system-status.js [options]

Options:
  --watch, -w    Continuous monitoring mode (updates every 5 seconds)
  --help, -h     Show this help message

Examples:
  node scripts/system-status.js           # Show current status
  node scripts/system-status.js --watch   # Continuous monitoring
`);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Exiting system status dashboard...'));
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Status dashboard failed:'), error);
    process.exit(1);
  });
}

module.exports = SystemStatusDashboard;
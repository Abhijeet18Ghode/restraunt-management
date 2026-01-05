#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

class IntegrationTestRunner {
  constructor() {
    this.testSuites = {
      'system': {
        name: 'Complete System Integration',
        file: 'tests/integration/systemIntegration.test.js',
        description: 'End-to-end system functionality tests'
      },
      'workflow': {
        name: 'Order-to-Payment Workflows',
        file: 'tests/integration/orderToPaymentWorkflow.test.js',
        description: 'Complete business workflow validation'
      },
      'isolation': {
        name: 'Multi-Tenant Isolation',
        file: 'tests/integration/multiTenantIsolation.test.js',
        description: 'Data isolation and security tests'
      },
      'performance': {
        name: 'Performance and Load Testing',
        file: 'tests/integration/performanceLoad.test.js',
        description: 'System performance under load'
      },
      'gateway': {
        name: 'API Gateway Integration',
        file: 'services/api-gateway/tests/integration/endToEnd.integration.test.js',
        description: 'API Gateway specific integration tests'
      }
    };
  }

  async run(options = {}) {
    console.log(chalk.cyan('🧪 Restaurant Management System - Integration Test Runner'));
    console.log(chalk.cyan('=' .repeat(60)));

    try {
      // Validate environment
      await this.validateEnvironment();

      // Run selected test suites
      const suitesToRun = options.suites || Object.keys(this.testSuites);
      const results = {};

      for (const suiteKey of suitesToRun) {
        if (!this.testSuites[suiteKey]) {
          console.log(chalk.red(`❌ Unknown test suite: ${suiteKey}`));
          continue;
        }

        const suite = this.testSuites[suiteKey];
        console.log(chalk.blue(`\n🔍 Running: ${suite.name}`));
        console.log(chalk.gray(`   ${suite.description}`));

        const result = await this.runTestSuite(suite, options);
        results[suiteKey] = result;

        if (result.success) {
          console.log(chalk.green(`✅ ${suite.name} - PASSED`));
        } else {
          console.log(chalk.red(`❌ ${suite.name} - FAILED`));
          if (options.failFast) {
            break;
          }
        }
      }

      // Generate summary report
      await this.generateSummaryReport(results);

      // Exit with appropriate code
      const allPassed = Object.values(results).every(r => r.success);
      process.exit(allPassed ? 0 : 1);

    } catch (error) {
      console.error(chalk.red('💥 Integration test runner failed:'), error.message);
      process.exit(1);
    }
  }

  async validateEnvironment() {
    console.log(chalk.blue('🔍 Validating test environment...'));

    // Check if API Gateway is running
    try {
      const response = await fetch('http://localhost:3000/health');
      if (!response.ok) {
        throw new Error(`API Gateway returned ${response.status}`);
      }
      console.log(chalk.green('✅ API Gateway is responding'));
    } catch (error) {
      console.log(chalk.red('❌ API Gateway is not running'));
      console.log(chalk.yellow('💡 Start the system with: npm run start'));
      throw new Error('API Gateway not available');
    }

    // Check service health
    try {
      const response = await fetch('http://localhost:3000/services/status');
      const status = await response.json();
      
      const healthyServices = Object.entries(status.health || {})
        .filter(([name, health]) => health.status === 'healthy')
        .length;
      
      console.log(chalk.green(`✅ ${healthyServices} services are healthy`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not verify service health'));
    }

    // Check test files exist
    for (const [key, suite] of Object.entries(this.testSuites)) {
      try {
        await fs.access(suite.file);
        console.log(chalk.green(`✅ Test suite found: ${suite.name}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠️  Test suite not found: ${suite.file}`));
      }
    }
  }

  async runTestSuite(suite, options) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const jestArgs = [
        '--config', 'tests/integration/jest.config.js',
        '--testPathPattern', suite.file,
        '--verbose'
      ];

      if (options.coverage) {
        jestArgs.push('--coverage');
      }

      if (options.updateSnapshots) {
        jestArgs.push('--updateSnapshot');
      }

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      let errorOutput = '';

      jestProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (options.verbose) {
          process.stdout.write(text);
        }
      });

      jestProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (options.verbose) {
          process.stderr.write(text);
        }
      });

      jestProcess.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          success: code === 0,
          exitCode: code,
          duration,
          output,
          errorOutput,
          suite: suite.name
        });
      });

      jestProcess.on('error', (error) => {
        resolve({
          success: false,
          exitCode: -1,
          duration: Date.now() - startTime,
          output,
          errorOutput: error.message,
          suite: suite.name
        });
      });
    });
  }

  async generateSummaryReport(results) {
    console.log(chalk.cyan('\n📊 Integration Test Summary'));
    console.log(chalk.cyan('=' .repeat(60)));

    const totalSuites = Object.keys(results).length;
    const passedSuites = Object.values(results).filter(r => r.success).length;
    const failedSuites = totalSuites - passedSuites;
    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Test Suites: ${totalSuites}`);
    console.log(chalk.green(`Passed: ${passedSuites}`));
    console.log(chalk.red(`Failed: ${failedSuites}`));
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);

    console.log(chalk.cyan('\n📋 Detailed Results:'));
    
    for (const [key, result] of Object.entries(results)) {
      const status = result.success ? chalk.green('PASS') : chalk.red('FAIL');
      const duration = (result.duration / 1000).toFixed(2);
      
      console.log(`  ${status} ${result.suite} (${duration}s)`);
      
      if (!result.success && result.errorOutput) {
        console.log(chalk.red(`    Error: ${result.errorOutput.split('\n')[0]}`));
      }
    }

    // Generate HTML report
    await this.generateHTMLReport(results);
  }

  async generateHTMLReport(results) {
    const reportDir = 'tests/integration/reports';
    
    try {
      await fs.mkdir(reportDir, { recursive: true });
      
      const htmlContent = this.generateHTMLContent(results);
      const reportPath = path.join(reportDir, 'integration-summary.html');
      
      await fs.writeFile(reportPath, htmlContent);
      console.log(chalk.blue(`\n📄 HTML report generated: ${reportPath}`));
    } catch (error) {
      console.log(chalk.yellow(`⚠️  Could not generate HTML report: ${error.message}`));
    }
  }

  generateHTMLContent(results) {
    const totalSuites = Object.keys(results).length;
    const passedSuites = Object.values(results).filter(r => r.success).length;
    const failedSuites = totalSuites - passedSuites;
    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.duration, 0);

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Integration Test Report - Restaurant Management System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .pass { color: #28a745; }
        .fail { color: #dc3545; }
        .suite { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .suite.passed { border-left: 5px solid #28a745; }
        .suite.failed { border-left: 5px solid #dc3545; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Integration Test Report</h1>
        <p>Restaurant Management System</p>
        <p class="timestamp">Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Suites</h3>
            <p style="font-size: 2em; margin: 0;">${totalSuites}</p>
        </div>
        <div class="metric">
            <h3>Passed</h3>
            <p style="font-size: 2em; margin: 0; color: #28a745;">${passedSuites}</p>
        </div>
        <div class="metric">
            <h3>Failed</h3>
            <p style="font-size: 2em; margin: 0; color: #dc3545;">${failedSuites}</p>
        </div>
        <div class="metric">
            <h3>Duration</h3>
            <p style="font-size: 2em; margin: 0;">${(totalDuration / 1000).toFixed(2)}s</p>
        </div>
    </div>

    <h2>Test Suite Results</h2>
    ${Object.entries(results).map(([key, result]) => `
        <div class="suite ${result.success ? 'passed' : 'failed'}">
            <h3>${result.suite} <span class="${result.success ? 'pass' : 'fail'}">${result.success ? 'PASS' : 'FAIL'}</span></h3>
            <p>Duration: ${(result.duration / 1000).toFixed(2)}s</p>
            ${!result.success ? `<p style="color: #dc3545;">Error: ${result.errorOutput.split('\n')[0]}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    suites: [],
    verbose: false,
    coverage: false,
    failFast: false,
    updateSnapshots: false
  };

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--coverage':
        options.coverage = true;
        break;
      case '--fail-fast':
        options.failFast = true;
        break;
      case '--update-snapshots':
        options.updateSnapshots = true;
        break;
      case '--suites':
        i++;
        if (args[i]) {
          options.suites = args[i].split(',');
        }
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('--')) {
          options.suites.push(arg);
        }
    }
  }

  const runner = new IntegrationTestRunner();
  await runner.run(options);
}

function printHelp() {
  console.log(`
Integration Test Runner for Restaurant Management System

Usage: node scripts/run-integration-tests.js [options] [suites...]

Options:
  --verbose, -v          Show detailed test output
  --coverage             Generate coverage report
  --fail-fast            Stop on first test suite failure
  --update-snapshots     Update Jest snapshots
  --suites <list>        Comma-separated list of test suites to run
  --help, -h             Show this help message

Available Test Suites:
  system                 Complete system integration tests
  workflow               Order-to-payment workflow tests
  isolation              Multi-tenant isolation tests
  performance            Performance and load tests
  gateway                API Gateway integration tests

Examples:
  node scripts/run-integration-tests.js
  node scripts/run-integration-tests.js --verbose
  node scripts/run-integration-tests.js system workflow
  node scripts/run-integration-tests.js --suites system,isolation --fail-fast
`);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = IntegrationTestRunner;
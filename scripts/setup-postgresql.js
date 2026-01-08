#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class PostgreSQLSetup {
  constructor() {
    // Use environment variable or default path
    this.psqlPath = process.env.PSQL_PATH || 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
  }

  async runPsqlCommand(command, database = 'postgres') {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Running: ${command}`);
      
      const psql = spawn(this.psqlPath, ['-U', 'postgres', '-d', database, '-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: 'postgres' }
      });

      let output = '';
      let error = '';

      psql.stdout.on('data', (data) => {
        output += data.toString();
      });

      psql.stderr.on('data', (data) => {
        error += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Command successful: ${output.trim()}`);
          resolve(output);
        } else {
          console.log(`❌ Command failed: ${error.trim()}`);
          reject(new Error(`Command failed with code ${code}: ${error}`));
        }
      });

      psql.on('error', (err) => {
        reject(err);
      });
    });
  }

  async setupDatabase() {
    console.log('🚀 Setting up PostgreSQL database for Restaurant Management System...');

    try {
      // Step 1: Create user if not exists
      console.log('\n📝 Step 1: Creating database user...');
      try {
        await this.runPsqlCommand("CREATE USER rms_user WITH PASSWORD 'rms_password';");
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ User rms_user already exists');
        } else {
          throw error;
        }
      }

      // Step 2: Create database if not exists
      console.log('\n📝 Step 2: Creating database...');
      try {
        await this.runPsqlCommand("CREATE DATABASE restaurant_management OWNER rms_user;");
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Database restaurant_management already exists');
        } else {
          throw error;
        }
      }

      // Step 3: Grant privileges
      console.log('\n📝 Step 3: Granting privileges...');
      await this.runPsqlCommand("GRANT ALL PRIVILEGES ON DATABASE restaurant_management TO rms_user;");
      await this.runPsqlCommand("ALTER USER rms_user CREATEDB;");

      // Step 4: Initialize database schema
      console.log('\n📝 Step 4: Initializing database schema...');
      const initSqlPath = path.join(__dirname, 'init-db.sql');
      
      if (fs.existsSync(initSqlPath)) {
        await this.runSqlFile(initSqlPath);
      } else {
        console.log('⚠️  init-db.sql not found, skipping schema initialization');
      }

      // Step 5: Test connection with new user
      console.log('\n📝 Step 5: Testing connection...');
      await this.testConnection();

      console.log('\n🎉 PostgreSQL setup completed successfully!');
      console.log('\n📋 Database Details:');
      console.log('  Host: localhost');
      console.log('  Port: 5432');
      console.log('  Database: restaurant_management');
      console.log('  User: rms_user');
      console.log('  Password: rms_password');

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      throw error;
    }
  }

  async runSqlFile(filePath) {
    return new Promise((resolve, reject) => {
      console.log(`📄 Running SQL file: ${filePath}`);
      
      const psql = spawn(this.psqlPath, ['-U', 'rms_user', '-d', 'restaurant_management', '-f', filePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: 'rms_password' }
      });

      let output = '';
      let error = '';

      psql.stdout.on('data', (data) => {
        output += data.toString();
      });

      psql.stderr.on('data', (data) => {
        error += data.toString();
      });

      psql.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ SQL file executed successfully`);
          resolve(output);
        } else {
          console.log(`❌ SQL file execution failed: ${error.trim()}`);
          reject(new Error(`SQL file execution failed with code ${code}: ${error}`));
        }
      });

      psql.on('error', (err) => {
        reject(err);
      });
    });
  }

  async testConnection() {
    try {
      const psql = spawn(this.psqlPath, ['-U', 'rms_user', '-d', 'restaurant_management', '-c', "SELECT 'Connection successful' as status;"], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: 'rms_password' }
      });

      let output = '';
      let error = '';

      psql.stdout.on('data', (data) => {
        output += data.toString();
      });

      psql.stderr.on('data', (data) => {
        error += data.toString();
      });

      return new Promise((resolve, reject) => {
        psql.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Database connection test passed');
            resolve(output);
          } else {
            console.log('❌ Database connection test failed');
            reject(new Error(`Connection test failed with code ${code}: ${error}`));
          }
        });

        psql.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      console.log('❌ Database connection test failed');
      throw error;
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new PostgreSQLSetup();
  setup.setupDatabase()
    .then(() => {
      console.log('\n🚀 Ready to run: node scripts/seed-database.js');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    });
}

module.exports = PostgreSQLSetup;
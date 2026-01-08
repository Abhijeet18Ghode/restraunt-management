#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseSetup {
  constructor() {
    // Connect as postgres superuser first
    this.adminClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: 'pass123' // Common default passwords
    });

    // Connection for the app user
    this.appClient = new Client({
      host: 'localhost',
      port: 5432,
      database: 'restaurant_management',
      user: 'rms_user',
      password: 'rms_password'
    });
  }

  async setupDatabase() {
    console.log('🚀 Setting up PostgreSQL database for Restaurant Management System...');

    try {
      // Step 1: Connect as admin
      console.log('\n📝 Step 1: Connecting as admin...');
      await this.adminClient.connect();
      console.log('✅ Connected to PostgreSQL as admin');

      // Step 2: Create user if not exists
      console.log('\n📝 Step 2: Creating database user...');
      try {
        await this.adminClient.query(`
          CREATE USER rms_user WITH PASSWORD 'rms_password';
        `);
        console.log('✅ User rms_user created');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ User rms_user already exists');
        } else {
          throw error;
        }
      }

      // Step 3: Create database if not exists
      console.log('\n📝 Step 3: Creating database...');
      try {
        await this.adminClient.query(`
          CREATE DATABASE restaurant_management OWNER rms_user;
        `);
        console.log('✅ Database restaurant_management created');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('✅ Database restaurant_management already exists');
        } else {
          throw error;
        }
      }

      // Step 4: Grant privileges
      console.log('\n📝 Step 4: Granting privileges...');
      await this.adminClient.query(`
        GRANT ALL PRIVILEGES ON DATABASE restaurant_management TO rms_user;
      `);
      await this.adminClient.query(`
        ALTER USER rms_user CREATEDB;
      `);
      console.log('✅ Privileges granted');

      // Close admin connection
      await this.adminClient.end();

      // Step 5: Connect as app user and initialize schema
      console.log('\n📝 Step 5: Initializing database schema...');
      await this.appClient.connect();
      console.log('✅ Connected as rms_user');

      // Run init SQL
      const initSqlPath = path.join(__dirname, 'init-db.sql');
      if (fs.existsSync(initSqlPath)) {
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        await this.appClient.query(initSql);
        console.log('✅ Database schema initialized');
      } else {
        console.log('⚠️  init-db.sql not found, skipping schema initialization');
      }

      // Step 6: Test connection
      console.log('\n📝 Step 6: Testing connection...');
      const result = await this.appClient.query("SELECT 'Connection successful' as status, NOW() as timestamp;");
      console.log('✅ Database connection test passed:', result.rows[0]);

      await this.appClient.end();

      console.log('\n🎉 PostgreSQL setup completed successfully!');
      console.log('\n📋 Database Details:');
      console.log('  Host: localhost');
      console.log('  Port: 5432');
      console.log('  Database: restaurant_management');
      console.log('  User: rms_user');
      console.log('  Password: rms_password');

      return true;

    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      
      // Try to close connections
      try {
        await this.adminClient.end();
      } catch {}
      try {
        await this.appClient.end();
      } catch {}
      
      throw error;
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.setupDatabase()
    .then(() => {
      console.log('\n🚀 Ready to run: node scripts/seed-database.js');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Setup failed:', error.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure PostgreSQL is running');
      console.log('2. Check if the postgres user password is correct');
      console.log('3. Try: SET PGPASSWORD=your_postgres_password && node scripts/setup-database-simple.js');
      process.exit(1);
    });
}

module.exports = DatabaseSetup;
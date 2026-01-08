#!/usr/bin/env node

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'restaurant_management',
  user: process.env.DB_USER || 'rms_user',
  password: process.env.DB_PASSWORD || 'rms_password',
};

class DatabaseSeeder {
  constructor() {
    this.pool = new Pool(dbConfig);
  }

  async seedDatabase() {
    console.log('🌱 Starting database seeding...');
    
    try {
      // Test connection
      await this.testConnection();
      
      // Seed tenant registry
      await this.seedTenantRegistry();
      
      // Create tenant schemas and seed data
      await this.seedTenantData();
      
      // Seed system users
      await this.seedSystemUsers();
      
      console.log('✅ Database seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  async testConnection() {
    console.log('🔍 Testing database connection...');
    const client = await this.pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected at:', result.rows[0].now);
    client.release();
  }

  async seedTenantRegistry() {
    console.log('🏢 Seeding tenant registry...');
    
    const tenants = [
      {
        tenant_id: 'pizza-palace',
        business_name: 'Pizza Palace',
        schema_name: 'tenant_pizza_palace',
        subscription_plan: 'premium'
      },
      {
        tenant_id: 'burger-barn',
        business_name: 'Burger Barn',
        schema_name: 'tenant_burger_barn',
        subscription_plan: 'basic'
      },
      {
        tenant_id: 'sushi-spot',
        business_name: 'Sushi Spot',
        schema_name: 'tenant_sushi_spot',
        subscription_plan: 'enterprise'
      }
    ];

    for (const tenant of tenants) {
      await this.pool.query(`
        INSERT INTO tenant_registry (tenant_id, business_name, schema_name, subscription_plan)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (tenant_id) DO UPDATE SET
          business_name = EXCLUDED.business_name,
          subscription_plan = EXCLUDED.subscription_plan,
          updated_at = NOW()
      `, [tenant.tenant_id, tenant.business_name, tenant.schema_name, tenant.subscription_plan]);
      
      console.log(`  ✅ Tenant: ${tenant.business_name}`);
    }
  }

  async seedTenantData() {
    console.log('🍽️ Seeding tenant-specific data...');
    
    const tenants = await this.pool.query('SELECT * FROM tenant_registry WHERE is_active = true');
    
    for (const tenant of tenants.rows) {
      console.log(`  📋 Setting up ${tenant.business_name}...`);
      
      // Create tenant schema
      await this.pool.query(`SELECT create_tenant_schema($1)`, [tenant.schema_name]);
      
      // Create tenant tables
      await this.createTenantTables(tenant.schema_name);
      
      // Seed tenant data
      await this.seedTenantMenuItems(tenant.schema_name, tenant.business_name);
      await this.seedTenantInventory(tenant.schema_name);
      await this.seedTenantStaff(tenant.schema_name);
      await this.seedTenantCustomers(tenant.schema_name);
    }
  }

  async createTenantTables(schemaName) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      // Menu items table
      await client.query(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          description TEXT,
          is_available BOOLEAN DEFAULT true,
          preparation_time INTEGER DEFAULT 0,
          ingredients TEXT[],
          allergens TEXT[],
          calories INTEGER,
          image_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Inventory table
      await client.query(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
          min_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
          max_stock DECIMAL(10,2) NOT NULL DEFAULT 100,
          unit VARCHAR(50) NOT NULL,
          cost_per_unit DECIMAL(10,2) NOT NULL,
          supplier VARCHAR(255),
          expiry_date DATE,
          last_restocked TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Staff table
      await client.query(`
        CREATE TABLE IF NOT EXISTS staff (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          employee_id VARCHAR(50) UNIQUE NOT NULL,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(50) NOT NULL,
          department VARCHAR(50) NOT NULL,
          hire_date DATE NOT NULL,
          hourly_rate DECIMAL(10,2),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Customers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20),
          address JSONB,
          loyalty_points INTEGER DEFAULT 0,
          total_orders INTEGER DEFAULT 0,
          total_spent DECIMAL(10,2) DEFAULT 0,
          last_visit TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          order_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id UUID REFERENCES customers(id),
          order_type VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          items JSONB NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          total_amount DECIMAL(10,2) NOT NULL,
          payment_status VARCHAR(20) DEFAULT 'pending',
          table_number INTEGER,
          special_instructions TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      console.log(`    ✅ Tables created for ${schemaName}`);
      
    } finally {
      client.release();
    }
  }

  async seedTenantMenuItems(schemaName, businessName) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      let menuItems = [];
      
      if (businessName.includes('Pizza')) {
        menuItems = [
          {
            name: 'Margherita Pizza',
            category: 'Pizza',
            price: 12.99,
            description: 'Fresh tomatoes, mozzarella, basil',
            preparation_time: 15,
            ingredients: ['tomatoes', 'mozzarella', 'basil'],
            allergens: ['dairy', 'gluten'],
            calories: 280
          },
          {
            name: 'Pepperoni Pizza',
            category: 'Pizza',
            price: 14.99,
            description: 'Classic pepperoni with mozzarella',
            preparation_time: 15,
            ingredients: ['pepperoni', 'mozzarella', 'tomato sauce'],
            allergens: ['dairy', 'gluten'],
            calories: 320
          }
        ];
      } else if (businessName.includes('Burger')) {
        menuItems = [
          {
            name: 'Classic Burger',
            category: 'Burgers',
            price: 9.99,
            description: 'Beef patty with lettuce, tomato, onion',
            preparation_time: 12,
            ingredients: ['beef', 'lettuce', 'tomato', 'onion'],
            allergens: ['gluten'],
            calories: 450
          },
          {
            name: 'Cheese Burger',
            category: 'Burgers',
            price: 10.99,
            description: 'Classic burger with cheese',
            preparation_time: 12,
            ingredients: ['beef', 'cheese', 'lettuce', 'tomato'],
            allergens: ['dairy', 'gluten'],
            calories: 520
          }
        ];
      } else {
        menuItems = [
          {
            name: 'California Roll',
            category: 'Sushi',
            price: 8.99,
            description: 'Crab, avocado, cucumber',
            preparation_time: 10,
            ingredients: ['crab', 'avocado', 'cucumber', 'rice'],
            allergens: ['shellfish'],
            calories: 200
          },
          {
            name: 'Salmon Nigiri',
            category: 'Sushi',
            price: 6.99,
            description: 'Fresh salmon over rice',
            preparation_time: 5,
            ingredients: ['salmon', 'rice'],
            allergens: ['fish'],
            calories: 150
          }
        ];
      }

      for (const item of menuItems) {
        await client.query(`
          INSERT INTO menu_items (name, category, price, description, preparation_time, ingredients, allergens, calories)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [item.name, item.category, item.price, item.description, item.preparation_time, item.ingredients, item.allergens, item.calories]);
      }
      
      console.log(`    ✅ Menu items seeded for ${businessName}`);
      
    } finally {
      client.release();
    }
  }

  async seedTenantInventory(schemaName) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      const inventoryItems = [
        {
          name: 'Tomatoes',
          category: 'Vegetables',
          current_stock: 45.5,
          min_stock: 20,
          max_stock: 100,
          unit: 'kg',
          cost_per_unit: 2.50,
          supplier: 'Fresh Farms Co.'
        },
        {
          name: 'Mozzarella Cheese',
          category: 'Dairy',
          current_stock: 12.0,
          min_stock: 15,
          max_stock: 50,
          unit: 'kg',
          cost_per_unit: 8.99,
          supplier: 'Dairy Fresh Ltd.'
        },
        {
          name: 'Ground Beef',
          category: 'Meat',
          current_stock: 25.0,
          min_stock: 10,
          max_stock: 40,
          unit: 'kg',
          cost_per_unit: 12.50,
          supplier: 'Premium Meats Inc.'
        }
      ];

      for (const item of inventoryItems) {
        await client.query(`
          INSERT INTO inventory_items (name, category, current_stock, min_stock, max_stock, unit, cost_per_unit, supplier, last_restocked)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        `, [item.name, item.category, item.current_stock, item.min_stock, item.max_stock, item.unit, item.cost_per_unit, item.supplier]);
      }
      
      console.log(`    ✅ Inventory seeded for ${schemaName}`);
      
    } finally {
      client.release();
    }
  }

  async seedTenantStaff(schemaName) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      const staffMembers = [
        {
          employee_id: 'EMP001',
          first_name: 'Alice',
          last_name: 'Johnson',
          email: 'alice@restaurant.com',
          phone: '+1-555-0201',
          role: 'chef',
          department: 'kitchen',
          hire_date: '2023-03-15',
          hourly_rate: 18.50
        },
        {
          employee_id: 'EMP002',
          first_name: 'Bob',
          last_name: 'Wilson',
          email: 'bob@restaurant.com',
          phone: '+1-555-0202',
          role: 'waiter',
          department: 'service',
          hire_date: '2023-06-20',
          hourly_rate: 15.00
        }
      ];

      for (const staff of staffMembers) {
        await client.query(`
          INSERT INTO staff (employee_id, first_name, last_name, email, phone, role, department, hire_date, hourly_rate)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [staff.employee_id, staff.first_name, staff.last_name, staff.email, staff.phone, staff.role, staff.department, staff.hire_date, staff.hourly_rate]);
      }
      
      console.log(`    ✅ Staff seeded for ${schemaName}`);
      
    } finally {
      client.release();
    }
  }

  async seedTenantCustomers(schemaName) {
    const client = await this.pool.connect();
    
    try {
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      const customers = [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@email.com',
          phone: '+1-555-0101',
          address: JSON.stringify({
            street: '123 Main St',
            city: 'Anytown',
            state: 'ST',
            zipCode: '12345'
          }),
          loyalty_points: 150,
          total_orders: 5,
          total_spent: 89.95
        },
        {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane.smith@email.com',
          phone: '+1-555-0102',
          address: JSON.stringify({
            street: '456 Oak Ave',
            city: 'Somewhere',
            state: 'ST',
            zipCode: '54321'
          }),
          loyalty_points: 75,
          total_orders: 3,
          total_spent: 45.50
        }
      ];

      for (const customer of customers) {
        await client.query(`
          INSERT INTO customers (first_name, last_name, email, phone, address, loyalty_points, total_orders, total_spent, last_visit)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '2 days')
        `, [customer.first_name, customer.last_name, customer.email, customer.phone, customer.address, customer.loyalty_points, customer.total_orders, customer.total_spent]);
      }
      
      console.log(`    ✅ Customers seeded for ${schemaName}`);
      
    } finally {
      client.release();
    }
  }

  async seedSystemUsers() {
    console.log('👥 Seeding system users...');
    
    // This would typically be in a separate users table
    // For now, we'll just log that this step would happen
    console.log('  ✅ System admin users would be created here');
  }
}

// Run seeding if called directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder.seedDatabase()
    .then(() => {
      console.log('🎉 Database seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseSeeder;
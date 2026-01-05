-- Initialize Restaurant Management System Database
-- This script sets up the main database and creates necessary extensions

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create main tenant registry table (shared across all tenants)
CREATE TABLE IF NOT EXISTS tenant_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id VARCHAR(100) UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(100) UNIQUE NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster tenant lookups
CREATE INDEX IF NOT EXISTS idx_tenant_registry_tenant_id ON tenant_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_registry_schema ON tenant_registry(schema_name);

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    -- Create schema
    EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
    
    -- Grant permissions
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO rms_user', schema_name);
    EXECUTE format('GRANT CREATE ON SCHEMA %I TO rms_user', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Function to drop tenant schema
CREATE OR REPLACE FUNCTION drop_tenant_schema(schema_name TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$ LANGUAGE plpgsql;
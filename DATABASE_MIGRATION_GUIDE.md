# Database Migration Guide: Mock to Real Database

## Overview
This guide helps you migrate from mock data services to real PostgreSQL database services.

## Prerequisites
- Docker installed OR PostgreSQL installed locally
- All services currently running with `npm start`

## Migration Steps

### Step 1: Start Database
**With Docker:**
```bash
docker-compose up -d postgres redis
docker ps  # Verify containers are running
```

**With Local PostgreSQL:**
```bash
psql -U rms_user -d restaurant_management -f scripts/init-db.sql
```

### Step 2: Verify Database Connection
```bash
# Test connection
psql -U rms_user -d restaurant_management -c "SELECT NOW();"

# Check tables
psql -U rms_user -d restaurant_management -c "\dt"
```

### Step 3: Update Service Configuration
The system will automatically detect the database and switch from mock to real data.

### Step 4: Seed Initial Data
```bash
# Run data seeding script (will be created)
node scripts/seed-database.js
```

### Step 5: Restart Services
```bash
# Stop current system
Ctrl+C

# Start with real database
npm start
```

### Step 6: Verify Real Data
```bash
# Test API endpoints
curl http://localhost:3000/api/tenants
curl http://localhost:3000/health
```

## Database Schema Overview

### Main Tables:
- `tenant_registry` - Multi-tenant management
- `{tenant}_menu_items` - Menu items per tenant
- `{tenant}_inventory` - Inventory per tenant
- `{tenant}_orders` - Orders per tenant
- `{tenant}_staff` - Staff per tenant
- `{tenant}_customers` - Customers per tenant

### Key Features:
- **Multi-tenant architecture** - Each tenant gets own schema
- **UUID primary keys** - Globally unique identifiers
- **Audit trails** - Created/updated timestamps
- **Soft deletes** - Data preservation
- **Indexes** - Optimized queries

## Troubleshooting

### Database Connection Issues:
```bash
# Check if PostgreSQL is running
docker ps  # For Docker
pg_isready -U rms_user  # For local install

# Check connection
telnet localhost 5432
```

### Service Connection Issues:
```bash
# Check service logs
docker logs rms-postgres
tail -f services/tenant-service/logs/app.log
```

### Data Issues:
```bash
# Reset database
docker-compose down postgres
docker-compose up -d postgres

# Re-seed data
node scripts/seed-database.js
```

## Expected Results After Migration

### Before (Mock Data):
- ❌ Data resets on restart
- ❌ Limited to predefined mock data
- ❌ No persistence
- ✅ Fast startup

### After (Real Database):
- ✅ Data persists across restarts
- ✅ Full CRUD operations
- ✅ Real relationships between data
- ✅ Multi-tenant support
- ✅ Audit trails and history
- ✅ Scalable data storage

## Performance Expectations

### Startup Time:
- Mock: ~10 seconds
- Real DB: ~15-20 seconds (first time)

### API Response Time:
- Mock: ~50ms
- Real DB: ~100-200ms

### Data Volume:
- Mock: ~100 records total
- Real DB: Unlimited (production ready)
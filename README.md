# Restaurant Management System

A comprehensive multi-tenant SaaS platform for restaurant management, built with Node.js and microservices architecture.

## Features

- **Multi-tenant Architecture**: Complete data isolation between restaurant businesses
- **Point of Sale (POS)**: Order processing, billing, and payment management
- **Menu Management**: Dynamic menu items, pricing, and availability control
- **Inventory Management**: Stock tracking, supplier management, and automated alerts
- **Online Order Management**: Integration with delivery platforms
- **Staff Management**: Role-based access control and performance tracking
- **Customer Relationship Management**: Customer profiles and loyalty programs
- **Analytics & Reporting**: Comprehensive business insights and reports
- **Multi-location Support**: Centralized management for restaurant chains

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with tenant-specific schemas
- **Cache**: Redis
- **Message Queue**: Apache Kafka
- **Frontend**: Next.js (Admin Dashboard & POS Interface)
- **Testing**: Jest, fast-check (property-based testing)
- **Containerization**: Docker

## Architecture

The system follows a microservices architecture with the following services:

- **Tenant Service**: Tenant management and authentication
- **POS Service**: Point of sale operations and billing
- **Menu Service**: Menu item and category management
- **Inventory Service**: Stock and supplier management
- **Order Service**: Online order processing
- **Analytics Service**: Reporting and business intelligence

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd restaurant-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Start infrastructure services:
```bash
npm run docker:up
```

4. Copy environment files:
```bash
cp services/tenant-service/.env.example services/tenant-service/.env
# Repeat for other services
```

5. Start development servers:
```bash
npm run dev
```

### Development

- **Start all services**: `npm run dev`
- **Start specific service**: `npm run dev -w services/tenant-service`
- **Run tests**: `npm test`
- **Run property tests**: `npm run test:property`
- **Lint code**: `npm run lint`

## Project Structure

```
restaurant-management-system/
├── packages/
│   └── shared/                 # Shared utilities and constants
├── services/
│   ├── tenant-service/         # Tenant management
│   ├── pos-service/           # Point of sale operations
│   ├── menu-service/          # Menu management
│   ├── inventory-service/     # Inventory tracking
│   ├── order-service/         # Order processing
│   └── analytics-service/     # Analytics and reporting
├── apps/
│   ├── admin-dashboard/       # Admin web interface
│   └── pos-interface/         # POS web interface
├── scripts/                   # Database and deployment scripts
└── docker-compose.yml         # Infrastructure services
```

## API Documentation

### Tenant Service (Port 3001)

- `POST /api/tenants` - Create new tenant
- `GET /api/tenants/:id` - Get tenant details
- `PUT /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Deactivate tenant
- `POST /api/auth/login` - User authentication

### Authentication

All API requests (except tenant creation and login) require:
- `Authorization: Bearer <jwt-token>`
- `X-Tenant-ID: <tenant-id>` (for tenant-specific operations)

## Testing

The project uses a dual testing approach:

### Unit Tests
```bash
npm run test:unit
```

### Property-Based Tests
```bash
npm run test:property
```

Property tests validate universal correctness properties using fast-check:
- Tenant data isolation
- Order calculation accuracy
- Inventory consistency
- Payment processing integrity

## Database Schema

Each tenant gets an isolated PostgreSQL schema with tables for:
- Outlets and locations
- Menu items and categories
- Orders and order items
- Inventory items
- Staff members
- Customers
- Tables and seating

## Multi-Tenancy

The system implements **Shared Database, Separate Schema** pattern:
- Each tenant has a dedicated database schema
- Complete data isolation between tenants
- Shared application infrastructure
- Tenant-aware authentication and authorization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team.
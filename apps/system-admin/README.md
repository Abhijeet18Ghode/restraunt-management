# System Admin Dashboard

A comprehensive system administration dashboard for managing tenants and platform operations in the Restaurant Management System.

## Features

- **Tenant Management**: Create, view, and manage restaurant tenants
- **Dashboard Analytics**: System-wide statistics and metrics
- **Subscription Management**: Handle different subscription plans (Basic, Premium, Enterprise)
- **User Authentication**: Secure system admin authentication
- **Settings Management**: Configure platform settings and preferences

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Running backend services (API Gateway, Tenant Service)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3012`

### Default Login Credentials

- **Username**: `sysadmin`
- **Password**: `admin123`

## Project Structure

```
apps/system-admin/
├── app/
│   ├── components/          # Reusable UI components
│   ├── contexts/           # React contexts (auth, etc.)
│   ├── services/           # API service classes
│   ├── dashboard/          # Dashboard page
│   ├── tenants/           # Tenant management pages
│   ├── settings/          # Settings pages
│   └── login/             # Authentication pages
├── public/                # Static assets
└── package.json
```

## Key Components

### Authentication
- System admin authentication with secure session management
- Protected routes for all admin functionality
- Role-based access control

### Tenant Management
- Create new restaurant tenants with complete business information
- View tenant details and subscription information
- Manage tenant status (active/inactive)
- Search and filter tenants

### Dashboard Analytics
- System-wide statistics and metrics
- Subscription plan breakdown
- Recent tenant activity
- Performance indicators

### Settings
- Platform configuration options
- Security settings
- Notification preferences
- Database management options

## API Integration

The system admin dashboard integrates with:

- **Tenant Service** (`/api/tenants`) - For tenant CRUD operations
- **API Gateway** (`http://localhost:3000`) - For routing requests

## Subscription Plans

### Basic Plan ($29/month)
- 1 outlet
- 10 staff members
- 100 menu items
- 30-day analytics retention
- Email support

### Premium Plan ($79/month)
- 5 outlets
- 50 staff members
- 500 menu items
- 90-day analytics retention
- Priority support
- Custom reports
- API access

### Enterprise Plan ($199/month)
- Unlimited outlets
- Unlimited staff
- Unlimited menu items
- 365-day analytics retention
- Dedicated support
- Custom reports
- API access

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create components in `app/components/`
2. Add new pages in appropriate directories
3. Update navigation in `app/components/Layout.js`
4. Add API services in `app/services/`

## Security Considerations

- All routes are protected with authentication
- System admin credentials should be changed in production
- Use HTTPS in production environments
- Implement proper session management
- Regular security audits recommended

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Set production environment variables
3. Deploy to your hosting platform
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL certificates
6. Configure monitoring and logging

## Support

For technical support or questions about the system admin dashboard, please contact the development team.

## License

This project is part of the Restaurant Management System and follows the same licensing terms.
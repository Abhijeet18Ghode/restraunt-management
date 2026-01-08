# Environment Configuration Guide

## Overview
This guide explains how to set up environment variables for both frontend applications in the Restaurant Management System.

## Environment Files Created

### Admin Dashboard
- `.env.local` - Development environment (active)
- `.env.example` - Template for new setups
- `.env.production` - Production environment template
- `app/config/env.js` - Configuration utility with validation

### POS Interface
- `.env.local` - Development environment (active)
- `.env.example` - Template for new setups
- `.env.production` - Production environment template
- `app/config/env.js` - Configuration utility with validation

## Quick Setup

### 1. Development Setup (Already Done)
The `.env.local` files are already configured for local development:

**Admin Dashboard**: `http://localhost:3011`
**POS Interface**: `http://localhost:3002`
**API Gateway**: `http://localhost:3000`
**WebSocket Service**: `http://localhost:3010`

### 2. Production Setup
1. Copy `.env.example` to `.env.local` in each app
2. Update the API URLs for your production environment:
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourrestaurant.com
   NEXT_PUBLIC_WS_URL=https://ws.yourrestaurant.com
   ```

## Environment Variables Reference

### Core Configuration

#### API Configuration
```env
NEXT_PUBLIC_API_URL=http://localhost:3000    # Backend API URL
NEXT_PUBLIC_WS_URL=http://localhost:3010     # WebSocket service URL
```

#### Application Configuration
```env
NEXT_PUBLIC_APP_NAME=Restaurant Admin Dashboard
NEXT_PUBLIC_APP_VERSION=1.0.0
NODE_ENV=development                         # development | production
NEXT_PUBLIC_DEBUG=true                       # Enable debug logging
```

### Authentication Configuration

#### Admin Dashboard
```env
NEXT_PUBLIC_TOKEN_NAME=auth_token           # Cookie name for auth token
NEXT_PUBLIC_SESSION_TIMEOUT=3600000         # 1 hour session timeout
```

#### POS Interface
```env
NEXT_PUBLIC_TOKEN_NAME=pos_auth_token       # Cookie name for POS auth token
NEXT_PUBLIC_SESSION_TIMEOUT=28800000        # 8 hour session timeout (longer for POS)
```

### WebSocket Configuration
```env
NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS=5         # Max reconnection attempts
NEXT_PUBLIC_WS_RECONNECT_DELAY=1000         # Delay between reconnections (ms)
NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL=30000     # Heartbeat interval (ms)
```

### POS-Specific Configuration
```env
NEXT_PUBLIC_ORDER_TIMEOUT=1800000           # Order timeout (30 minutes)
NEXT_PUBLIC_TABLE_REFRESH_INTERVAL=10000    # Table status refresh (10 seconds)
NEXT_PUBLIC_KITCHEN_UPDATE_INTERVAL=5000    # Kitchen updates (5 seconds)
```

### Payment Configuration
```env
NEXT_PUBLIC_PAYMENT_TIMEOUT=60000           # Payment processing timeout
NEXT_PUBLIC_ENABLE_SPLIT_PAYMENTS=true      # Enable split payments
NEXT_PUBLIC_ENABLE_TIPS=true                # Enable tip functionality
NEXT_PUBLIC_DEFAULT_TIP_PERCENTAGES=10,15,20 # Default tip percentages
```

### Offline Configuration (POS Only)
```env
NEXT_PUBLIC_ENABLE_OFFLINE_MODE=true        # Enable offline functionality
NEXT_PUBLIC_OFFLINE_STORAGE_LIMIT=50        # Max offline items to store
NEXT_PUBLIC_SYNC_INTERVAL=30000             # Sync interval when online (ms)
```

### Customer Configuration
```env
NEXT_PUBLIC_ENABLE_CUSTOMER_LOOKUP=true     # Enable customer search
NEXT_PUBLIC_ENABLE_LOYALTY_PROGRAM=true     # Enable loyalty features
NEXT_PUBLIC_LOYALTY_POINTS_RATIO=10         # Points per dollar spent
```

### Feature Flags
```env
NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES=true   # Enable WebSocket updates
NEXT_PUBLIC_ENABLE_TABLE_MANAGEMENT=true    # Enable table management (POS)
NEXT_PUBLIC_ENABLE_KOT_PRINTING=true        # Enable KOT printing (POS)
NEXT_PUBLIC_ENABLE_INVENTORY_TRACKING=true  # Enable inventory tracking
NEXT_PUBLIC_ENABLE_STAFF_TRACKING=true      # Enable staff activity tracking
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=true      # Enable multi-location features (Admin)
NEXT_PUBLIC_ENABLE_ADVANCED_ANALYTICS=true  # Enable advanced analytics (Admin)
```

### Performance Configuration
```env
# Admin Dashboard
NEXT_PUBLIC_ANALYTICS_REFRESH_INTERVAL=30000     # Analytics refresh (30 seconds)
NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL=60000     # Dashboard refresh (1 minute)
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20                 # Default pagination size
NEXT_PUBLIC_MAX_PAGE_SIZE=100                    # Maximum pagination size

# POS Interface
NEXT_PUBLIC_MENU_CACHE_DURATION=300000           # Menu cache duration (5 minutes)
NEXT_PUBLIC_CUSTOMER_CACHE_DURATION=600000       # Customer cache duration (10 minutes)
NEXT_PUBLIC_ORDER_HISTORY_LIMIT=50               # Order history limit
```

### File Upload Configuration (Admin Only)
```env
NEXT_PUBLIC_MAX_FILE_SIZE=10485760          # Max file size (10MB)
NEXT_PUBLIC_ALLOWED_FILE_TYPES=csv,xlsx,pdf,jpg,png # Allowed file types
```

### UI Configuration (POS Only)
```env
NEXT_PUBLIC_TOUCH_FRIENDLY=true            # Optimize for touch devices
NEXT_PUBLIC_LARGE_BUTTONS=true             # Use large buttons for touch
NEXT_PUBLIC_SOUND_ENABLED=true             # Enable sound effects
```

### Notification Configuration
```env
NEXT_PUBLIC_NOTIFICATION_TIMEOUT=5000      # Notification display time (Admin: 5s, POS: 3s)
NEXT_PUBLIC_ENABLE_SOUND_NOTIFICATIONS=true # Enable sound notifications
NEXT_PUBLIC_ENABLE_VIBRATION=true          # Enable vibration (POS only)
```

### Service Discovery (Optional)
```env
USE_CONSUL=false                           # Enable Consul service discovery
CONSUL_HOST=localhost                      # Consul host
CONSUL_PORT=8500                          # Consul port
```

## Configuration Validation

Both apps include configuration validation that runs in development mode:

### Admin Dashboard
```javascript
import config from './app/config/env';
// Configuration is automatically validated on import
```

### POS Interface
```javascript
import config from './app/config/env';
// Configuration is automatically validated on import
```

### Validation Errors
If configuration validation fails, you'll see errors in the console:
```
❌ Admin Dashboard configuration validation failed: NEXT_PUBLIC_API_URL is required
```

## Environment-Specific Settings

### Development (.env.local)
- Debug logging enabled
- Shorter timeouts for faster development
- Local service URLs
- All features enabled for testing

### Production (.env.production)
- Debug logging disabled
- Longer timeouts for stability
- Production service URLs
- Optimized cache durations
- Enhanced security settings

## Usage in Code

### Using Configuration
```javascript
import config from '../config/env';

// API calls
const apiUrl = config.apiUrl;
const wsUrl = config.wsUrl;

// Feature flags
if (config.features.realTimeUpdates) {
  // Initialize WebSocket
}

// Timeouts
const sessionTimeout = config.sessionTimeout;
const paymentTimeout = config.payment.timeout;
```

### Service Integration
```javascript
import config from '../config/env';

class MyService {
  constructor() {
    this.api = axios.create({
      baseURL: config.apiUrl,
      timeout: config.payment?.timeout || 60000
    });
  }
}
```

## Troubleshooting

### Common Issues

1. **Services not connecting**
   - Check `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`
   - Ensure backend services are running on correct ports

2. **WebSocket connection failures**
   - Verify `NEXT_PUBLIC_WS_URL` is correct
   - Check WebSocket service is running on port 3010

3. **Authentication issues**
   - Verify token names match between frontend and backend
   - Check session timeout values

4. **Feature not working**
   - Check relevant feature flags are enabled
   - Verify environment variables are properly set

### Debug Mode
Enable debug mode to see detailed logging:
```env
NEXT_PUBLIC_DEBUG=true
```

### Validation Errors
If you see configuration validation errors:
1. Check all required environment variables are set
2. Verify numeric values are valid
3. Ensure boolean values use 'true' or 'false'

## Security Considerations

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Set `NEXT_PUBLIC_DEBUG=false`
- [ ] Use HTTPS URLs for API and WebSocket
- [ ] Set appropriate session timeouts
- [ ] Review and adjust feature flags
- [ ] Validate all environment variables

### Sensitive Data
- Never commit `.env.local` files to version control
- Use `.env.example` as templates
- Store production secrets securely
- Rotate tokens and keys regularly

## Deployment

### Docker Deployment
```dockerfile
# Copy environment file
COPY .env.production .env.local

# Build with environment variables
RUN npm run build
```

### Kubernetes Deployment
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
data:
  NEXT_PUBLIC_API_URL: "https://api.yourrestaurant.com"
  NEXT_PUBLIC_WS_URL: "https://ws.yourrestaurant.com"
```

## Support

For environment configuration issues:
1. Check this documentation
2. Verify environment variable syntax
3. Test with `.env.example` template
4. Check console for validation errors
5. Review service connectivity

The environment configuration system provides flexible, validated, and type-safe configuration management for both frontend applications.
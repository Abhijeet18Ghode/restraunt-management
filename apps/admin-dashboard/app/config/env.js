// Environment configuration utility for Admin Dashboard

export const config = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3010',
  
  // Application Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Restaurant Admin Dashboard',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  
  // Authentication
  tokenStorage: process.env.NEXT_PUBLIC_TOKEN_STORAGE || 'cookie',
  tokenName: process.env.NEXT_PUBLIC_TOKEN_NAME || 'auth_token',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '3600000'),
  
  // WebSocket Configuration
  websocket: {
    reconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || '1000'),
    heartbeatInterval: parseInt(process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || '30000'),
  },
  
  // Analytics Configuration
  analytics: {
    refreshInterval: parseInt(process.env.NEXT_PUBLIC_ANALYTICS_REFRESH_INTERVAL || '30000'),
    dashboardRefreshInterval: parseInt(process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_INTERVAL || '60000'),
  },
  
  // File Upload Configuration
  fileUpload: {
    maxSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'csv,xlsx,pdf,jpg,png').split(','),
  },
  
  // Pagination Configuration
  pagination: {
    defaultPageSize: parseInt(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE || '20'),
    maxPageSize: parseInt(process.env.NEXT_PUBLIC_MAX_PAGE_SIZE || '100'),
  },
  
  // Notification Configuration
  notifications: {
    timeout: parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_TIMEOUT || '5000'),
    enableSound: process.env.NEXT_PUBLIC_ENABLE_SOUND_NOTIFICATIONS === 'true',
  },
  
  // Feature Flags
  features: {
    realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES !== 'false',
    offlineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
    multiLocation: process.env.NEXT_PUBLIC_ENABLE_MULTI_LOCATION !== 'false',
    advancedAnalytics: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_ANALYTICS !== 'false',
  },
  
  // Service Discovery
  consul: {
    enabled: process.env.USE_CONSUL === 'true',
    host: process.env.CONSUL_HOST || 'localhost',
    port: parseInt(process.env.CONSUL_PORT || '8500'),
  },
};

// Validation function
export const validateConfig = () => {
  const errors = [];
  
  if (!config.apiUrl) {
    errors.push('NEXT_PUBLIC_API_URL is required');
  }
  
  if (!config.wsUrl) {
    errors.push('NEXT_PUBLIC_WS_URL is required');
  }
  
  if (config.sessionTimeout < 60000) {
    errors.push('Session timeout should be at least 1 minute');
  }
  
  if (config.pagination.defaultPageSize > config.pagination.maxPageSize) {
    errors.push('Default page size cannot be greater than max page size');
  }
  
  if (errors.length > 0) {
    console.error('Configuration validation errors:', errors);
    throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
  }
  
  return true;
};

// Initialize configuration validation in development
if (config.isDevelopment) {
  try {
    validateConfig();
    console.log('✅ Admin Dashboard configuration validated successfully');
  } catch (error) {
    console.error('❌ Admin Dashboard configuration validation failed:', error.message);
  }
}

export default config;
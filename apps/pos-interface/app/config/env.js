// Environment configuration utility for POS Interface

export const config = {
  // API Configuration
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3010',
  
  // Application Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Restaurant POS System',
  appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  debug: process.env.NEXT_PUBLIC_DEBUG === 'true',
  
  // Authentication
  tokenStorage: process.env.NEXT_PUBLIC_TOKEN_STORAGE || 'cookie',
  tokenName: process.env.NEXT_PUBLIC_TOKEN_NAME || 'pos_auth_token',
  sessionTimeout: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '28800000'), // 8 hours
  
  // WebSocket Configuration
  websocket: {
    reconnectAttempts: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_ATTEMPTS || '5'),
    reconnectDelay: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_DELAY || '1000'),
    heartbeatInterval: parseInt(process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || '30000'),
  },
  
  // POS Specific Configuration
  pos: {
    orderTimeout: parseInt(process.env.NEXT_PUBLIC_ORDER_TIMEOUT || '1800000'), // 30 minutes
    tableRefreshInterval: parseInt(process.env.NEXT_PUBLIC_TABLE_REFRESH_INTERVAL || '10000'),
    kitchenUpdateInterval: parseInt(process.env.NEXT_PUBLIC_KITCHEN_UPDATE_INTERVAL || '5000'),
  },
  
  // Payment Configuration
  payment: {
    timeout: parseInt(process.env.NEXT_PUBLIC_PAYMENT_TIMEOUT || '60000'),
    enableSplitPayments: process.env.NEXT_PUBLIC_ENABLE_SPLIT_PAYMENTS !== 'false',
    enableTips: process.env.NEXT_PUBLIC_ENABLE_TIPS !== 'false',
    defaultTipPercentages: (process.env.NEXT_PUBLIC_DEFAULT_TIP_PERCENTAGES || '10,15,20')
      .split(',').map(tip => parseInt(tip.trim())),
  },
  
  // Offline Configuration
  offline: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE !== 'false',
    storageLimit: parseInt(process.env.NEXT_PUBLIC_OFFLINE_STORAGE_LIMIT || '50'),
    syncInterval: parseInt(process.env.NEXT_PUBLIC_SYNC_INTERVAL || '30000'),
  },
  
  // Customer Configuration
  customer: {
    enableLookup: process.env.NEXT_PUBLIC_ENABLE_CUSTOMER_LOOKUP !== 'false',
    enableLoyalty: process.env.NEXT_PUBLIC_ENABLE_LOYALTY_PROGRAM !== 'false',
    loyaltyPointsRatio: parseInt(process.env.NEXT_PUBLIC_LOYALTY_POINTS_RATIO || '10'), // 1 point per $10
  },
  
  // Receipt Configuration
  receipt: {
    enableEmail: process.env.NEXT_PUBLIC_ENABLE_EMAIL_RECEIPTS !== 'false',
    enableSMS: process.env.NEXT_PUBLIC_ENABLE_SMS_RECEIPTS !== 'false',
    enablePrint: process.env.NEXT_PUBLIC_ENABLE_PRINT_RECEIPTS !== 'false',
  },
  
  // UI Configuration
  ui: {
    touchFriendly: process.env.NEXT_PUBLIC_TOUCH_FRIENDLY !== 'false',
    largeButtons: process.env.NEXT_PUBLIC_LARGE_BUTTONS !== 'false',
    soundEnabled: process.env.NEXT_PUBLIC_SOUND_ENABLED !== 'false',
  },
  
  // Notification Configuration
  notifications: {
    timeout: parseInt(process.env.NEXT_PUBLIC_NOTIFICATION_TIMEOUT || '3000'),
    enableSound: process.env.NEXT_PUBLIC_ENABLE_SOUND_NOTIFICATIONS !== 'false',
    enableVibration: process.env.NEXT_PUBLIC_ENABLE_VIBRATION !== 'false',
  },
  
  // Feature Flags
  features: {
    realTimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REAL_TIME_UPDATES !== 'false',
    tableManagement: process.env.NEXT_PUBLIC_ENABLE_TABLE_MANAGEMENT !== 'false',
    kotPrinting: process.env.NEXT_PUBLIC_ENABLE_KOT_PRINTING !== 'false',
    inventoryTracking: process.env.NEXT_PUBLIC_ENABLE_INVENTORY_TRACKING !== 'false',
    staffTracking: process.env.NEXT_PUBLIC_ENABLE_STAFF_TRACKING !== 'false',
  },
  
  // Performance Configuration
  performance: {
    menuCacheDuration: parseInt(process.env.NEXT_PUBLIC_MENU_CACHE_DURATION || '300000'), // 5 minutes
    customerCacheDuration: parseInt(process.env.NEXT_PUBLIC_CUSTOMER_CACHE_DURATION || '600000'), // 10 minutes
    orderHistoryLimit: parseInt(process.env.NEXT_PUBLIC_ORDER_HISTORY_LIMIT || '50'),
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
  
  if (config.sessionTimeout < 300000) { // 5 minutes minimum
    errors.push('Session timeout should be at least 5 minutes for POS');
  }
  
  if (config.pos.orderTimeout < 300000) { // 5 minutes minimum
    errors.push('Order timeout should be at least 5 minutes');
  }
  
  if (config.payment.timeout < 30000) { // 30 seconds minimum
    errors.push('Payment timeout should be at least 30 seconds');
  }
  
  if (config.payment.defaultTipPercentages.some(tip => tip < 0 || tip > 100)) {
    errors.push('Tip percentages should be between 0 and 100');
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
    console.log('✅ POS Interface configuration validated successfully');
  } catch (error) {
    console.error('❌ POS Interface configuration validation failed:', error.message);
  }
}

export default config;
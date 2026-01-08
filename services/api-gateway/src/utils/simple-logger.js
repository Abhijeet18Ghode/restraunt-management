// Simple console logger for debugging
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, meta);
  },
  warn: (message, meta = {}) => {
    console.log(`[WARN] ${message}`, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    console.log(`[DEBUG] ${message}`, meta);
  }
};

module.exports = logger;
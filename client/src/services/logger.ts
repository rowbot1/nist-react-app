/**
 * Client-side Logging Service
 *
 * Comprehensive logging for debugging and monitoring user actions.
 * All logs are output to the browser console and can be viewed in DevTools.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

// Store logs in memory for potential export
const logHistory: LogEntry[] = [];
const MAX_LOG_HISTORY = 1000;

// Color codes for different log levels
const LOG_COLORS = {
  debug: '#9E9E9E',
  info: '#2196F3',
  warn: '#FF9800',
  error: '#F44336',
};

// Categories for different parts of the app
const LOG_CATEGORIES = {
  API: 'API',
  AUTH: 'AUTH',
  NAVIGATION: 'NAV',
  PRODUCT: 'PRODUCT',
  SYSTEM: 'SYSTEM',
  ASSESSMENT: 'ASSESSMENT',
  ANALYTICS: 'ANALYTICS',
  UI: 'UI',
  ERROR: 'ERROR',
  GENERAL: 'GENERAL',
} as const;

type LogCategory = keyof typeof LOG_CATEGORIES;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function addToHistory(entry: LogEntry): void {
  logHistory.push(entry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }
}

function log(level: LogLevel, category: LogCategory, message: string, data?: any): void {
  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    category: LOG_CATEGORIES[category],
    message,
    data,
  };

  addToHistory(entry);

  const style = `color: ${LOG_COLORS[level]}; font-weight: bold;`;
  const prefix = `%c[${entry.category}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, style, message, data || '');
      break;
    case 'info':
      console.info(prefix, style, message, data || '');
      break;
    case 'warn':
      console.warn(prefix, style, message, data || '');
      break;
    case 'error':
      console.error(prefix, style, message, data || '');
      break;
  }
}

export const logger = {
  debug: (category: LogCategory, message: string, data?: any) => log('debug', category, message, data),
  info: (category: LogCategory, message: string, data?: any) => log('info', category, message, data),
  warn: (category: LogCategory, message: string, data?: any) => log('warn', category, message, data),
  error: (category: LogCategory, message: string, data?: any) => log('error', category, message, data),

  // Convenience methods for specific categories
  api: {
    request: (method: string, url: string, data?: any) =>
      log('info', 'API', `${method} ${url}`, data),
    response: (method: string, url: string, status: number, data?: any) =>
      log('info', 'API', `${method} ${url} -> ${status}`, data),
    error: (method: string, url: string, error: any) =>
      log('error', 'API', `${method} ${url} FAILED`, error),
  },

  navigation: {
    to: (path: string, from?: string) =>
      log('info', 'NAVIGATION', `Navigate to: ${path}${from ? ` (from: ${from})` : ''}`),
    back: () =>
      log('info', 'NAVIGATION', 'Navigate back'),
  },

  product: {
    create: (name: string, data?: any) =>
      log('info', 'PRODUCT', `Creating product: ${name}`, data),
    update: (id: string, data?: any) =>
      log('info', 'PRODUCT', `Updating product: ${id}`, data),
    delete: (id: string) =>
      log('info', 'PRODUCT', `Deleting product: ${id}`),
    view: (id: string, name?: string) =>
      log('info', 'PRODUCT', `Viewing product: ${name || id}`),
  },

  system: {
    create: (name: string, productId: string, data?: any) =>
      log('info', 'SYSTEM', `Creating system: ${name} for product: ${productId}`, data),
    update: (id: string, data?: any) =>
      log('info', 'SYSTEM', `Updating system: ${id}`, data),
    delete: (id: string) =>
      log('info', 'SYSTEM', `Deleting system: ${id}`),
    view: (id: string, name?: string) =>
      log('info', 'SYSTEM', `Viewing system: ${name || id}`),
  },

  assessment: {
    create: (controlId: string, systemId: string, data?: any) =>
      log('info', 'ASSESSMENT', `Creating assessment for control: ${controlId}, system: ${systemId}`, data),
    update: (id: string, data?: any) =>
      log('info', 'ASSESSMENT', `Updating assessment: ${id}`, data),
    bulkUpdate: (count: number, data?: any) =>
      log('info', 'ASSESSMENT', `Bulk updating ${count} assessments`, data),
  },

  analytics: {
    load: (type: string, params?: any) =>
      log('info', 'ANALYTICS', `Loading analytics: ${type}`, params),
    error: (type: string, error: any) =>
      log('error', 'ANALYTICS', `Analytics error: ${type}`, error),
  },

  ui: {
    click: (element: string, data?: any) =>
      log('debug', 'UI', `Click: ${element}`, data),
    modal: (action: 'open' | 'close', name: string) =>
      log('debug', 'UI', `Modal ${action}: ${name}`),
    filter: (filterName: string, value: any) =>
      log('debug', 'UI', `Filter changed: ${filterName}`, value),
  },

  // Get log history for export/review
  getHistory: () => [...logHistory],

  // Clear log history
  clearHistory: () => {
    logHistory.length = 0;
    log('info', 'GENERAL', 'Log history cleared');
  },

  // Export logs as JSON string
  exportLogs: () => {
    const json = JSON.stringify(logHistory, null, 2);
    console.log('[LOGGER] Exporting logs:', json);
    return json;
  },

  // Download logs as file
  downloadLogs: () => {
    const json = JSON.stringify(logHistory, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nist-app-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log('info', 'GENERAL', 'Logs downloaded');
  },
};

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).nistLogger = logger;
}

// Log initial load
logger.info('GENERAL', 'Logger initialized - Use window.nistLogger to access logging utilities');

export default logger;

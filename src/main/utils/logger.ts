/**
 * Structured logger utility
 * Provides consistent logging across the application with levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
} as const;

/**
 * Get color for log level
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case 'debug':
      return COLORS.blue;
    case 'info':
      return COLORS.green;
    case 'warn':
      return COLORS.yellow;
    case 'error':
      return COLORS.red;
  }
}

/**
 * Format log message with timestamp and context
 */
function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  context?: LogContext
): string {
  let contextStr = '';
  if (context) {
    try {
      contextStr = ` ${JSON.stringify(context)}`;
    } catch {
      contextStr = ' [Context serialization failed]';
    }
  }
  const color = getLevelColor(level);
  const levelStr = `${color}[${level.toUpperCase()}]${COLORS.reset}`;
  const moduleStr = `${COLORS.cyan}[${module}]${COLORS.reset}`;
  return `${levelStr}${moduleStr} ${message}${contextStr}`;
}

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string) {
  return {
    log: (message: string, context?: LogContext) => {
      console.log(formatMessage('info', module, message, context));
    },

    debug: (message: string, context?: LogContext) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(formatMessage('debug', module, message, context));
      }
    },

    info: (message: string, context?: LogContext) => {
      console.log(formatMessage('info', module, message, context));
    },

    warn: (message: string, context?: LogContext) => {
      console.warn(formatMessage('warn', module, message, context));
    },

    error: (message: string, context?: LogContext) => {
      console.error(formatMessage('error', module, message, context));
    },
  };
}

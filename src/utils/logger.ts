/**
 * Structured logger utility
 * Provides consistent logging across the application with levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
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
  const timestamp = new Date().toISOString();
  let contextStr = '';
  if (context) {
    try {
      contextStr = ` ${JSON.stringify(context)}`;
    } catch (error) {
      contextStr = ' [Context serialization failed]';
    }
  }
  return `[${timestamp}][${level.toUpperCase()}][${module}] ${message}${contextStr}`;
}

/**
 * Create a logger for a specific module
 */
export function createLogger(module: string) {
  return {
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

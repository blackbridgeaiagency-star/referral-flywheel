/**
 * Production-Safe Logger
 * Replaces console.log with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private isTest = process.env.NODE_ENV === 'test';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 100;

  /**
   * Format log message for output
   */
  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): string {
    const timestamp = new Date().toISOString();
    const prefix = context ? `[${context}]` : '';

    if (this.isDevelopment) {
      // In development, use colored output with emojis
      const levelEmoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      };

      const output = `${levelEmoji[level]} ${prefix} ${message}`;
      return data ? `${output} ${JSON.stringify(data, null, 2)}` : output;
    }

    // In production, use structured JSON logs
    const logEntry: LogEntry = {
      level,
      message: `${prefix} ${message}`.trim(),
      timestamp,
      ...(data && { data }),
    };

    return JSON.stringify(logEntry);
  }

  /**
   * Add to buffer for debugging
   */
  private addToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: any, context?: string) {
    if (!this.isDevelopment || this.isTest) return;
    console.log(this.formatMessage('debug', message, data, context));
  }

  /**
   * Log info message
   */
  info(message: string, data?: any, context?: string) {
    if (this.isTest) return;

    const entry: LogEntry = {
      level: 'info',
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };

    this.addToBuffer(entry);

    // In production, only log important info
    if (!this.isDevelopment && !this.isImportantInfo(message)) return;

    console.log(this.formatMessage('info', message, data, context));
  }

  /**
   * Log warning
   */
  warn(message: string, data?: any, context?: string) {
    if (this.isTest) return;

    const entry: LogEntry = {
      level: 'warn',
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };

    this.addToBuffer(entry);
    console.warn(this.formatMessage('warn', message, data, context));
  }

  /**
   * Log error
   */
  error(message: string, error?: any, context?: string) {
    const entry: LogEntry = {
      level: 'error',
      message,
      data: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      } : error,
      timestamp: new Date().toISOString(),
      context,
    };

    this.addToBuffer(entry);
    console.error(this.formatMessage('error', message, entry.data, context));
  }

  /**
   * Log webhook event (important for debugging)
   */
  webhook(event: string, data?: any) {
    this.info(`Webhook: ${event}`, data, 'webhook');
  }

  /**
   * Log API call
   */
  api(method: string, endpoint: string, data?: any) {
    if (this.isDevelopment) {
      this.debug(`${method} ${endpoint}`, data, 'api');
    }
  }

  /**
   * Log database operation
   */
  db(operation: string, table: string, data?: any) {
    if (this.isDevelopment) {
      this.debug(`${operation} ${table}`, data, 'db');
    }
  }

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs(): LogEntry[] {
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearBuffer() {
    this.logBuffer = [];
  }

  /**
   * Check if message is important enough for production
   */
  private isImportantInfo(message: string): boolean {
    const importantPatterns = [
      'started',
      'ready',
      'listening',
      'connected',
      'initialized',
      'webhook',
      'payment',
      'commission',
      'error',
      'failed',
      'success',
    ];

    return importantPatterns.some(pattern =>
      message.toLowerCase().includes(pattern)
    );
  }
}

// Create singleton instance
const logger = new Logger();

// Export both default and named
export default logger;
export { logger, Logger, type LogLevel, type LogEntry };
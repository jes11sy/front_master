/**
 * Простой логгер для приложения
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  includeTimestamp?: boolean;
  includeStack?: boolean;
}

class Logger {
  private isDevelopment: boolean;
  private sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'secret', 'apiKey', 'authorization'];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    for (const key in sanitized) {
      if (this.sensitiveKeys.some(sensitiveKey => 
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      )) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  private formatMessage(level: LogLevel, message: string, data?: any, options?: LogOptions): string {
    const timestamp = options?.includeTimestamp ? `[${new Date().toISOString()}]` : '';
    const dataStr = data ? ` | Data: ${JSON.stringify(this.sanitizeData(data))}` : '';
    const stack = options?.includeStack && data instanceof Error ? `\nStack: ${data.stack}` : '';
    
    return `${timestamp} [${level.toUpperCase()}] ${message}${dataStr}${stack}`;
  }

  debug(message: string, data?: any, options?: LogOptions) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, data, options));
    }
  }

  info(message: string, data?: any, options?: LogOptions) {
    console.info(this.formatMessage('info', message, data, options));
  }

  warn(message: string, data?: any, options?: LogOptions) {
    console.warn(this.formatMessage('warn', message, data, options));
  }

  error(message: string, error?: Error | any, options?: LogOptions) {
    console.error(this.formatMessage('error', message, error, options));
  }

  apiError(endpoint: string, status: number, error: any) {
    this.error(`API Error: ${endpoint}`, {
      endpoint,
      status,
      error: error?.message || error
    });
  }

  authError(message: string, reason?: string) {
    this.error(`Auth Error: ${message}`, {
      reason,
      timestamp: new Date().toISOString()
    });
  }

  performance(label: string, duration: number) {
    this.info(`Performance: ${label}`, {
      duration: `${duration}ms`,
      label
    });
  }
}

export const logger = new Logger();

export function measurePerformance<T>(
  label: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();
  
  const result = fn();
  
  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      logger.performance(label, duration);
    });
  } else {
    const duration = performance.now() - start;
    logger.performance(label, duration);
    return result;
  }
}

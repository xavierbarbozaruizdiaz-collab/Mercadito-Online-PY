// ============================================
// MERCADITO ONLINE PY - LOGGING SYSTEM
// Sistema de logging configurable para desarrollo y producción
// ============================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  context?: Record<string, any>;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private formatMessage(level: LogLevel, message: string, data?: any, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        environment: process.env.NODE_ENV,
      },
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // En desarrollo: logear todo
    if (this.isDevelopment) return true;

    // En producción: solo warn y error
    if (this.isProduction) {
      return level === 'warn' || level === 'error';
    }

    return true;
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    const { level, message, data, timestamp } = entry;

    // En desarrollo: usar console con colores
    if (this.isDevelopment) {
      const styles = {
        debug: 'color: #888',
        info: 'color: #2196F3',
        warn: 'color: #FF9800',
        error: 'color: #F44336',
      };

      const prefix = `%c[${level.toUpperCase()}]`;
      const time = new Date(timestamp).toLocaleTimeString();

      console[level === 'debug' ? 'log' : level](
        `${prefix} [${time}] ${message}`,
        styles[level],
        data ? data : ''
      );
    } else {
      // En producción: formato estructurado para logging services
      const output: any = {
        level: entry.level.toUpperCase(),
        message: entry.message,
        timestamp: entry.timestamp,
      };

      if (data) {
        output.data = data;
      }

      if (entry.context) {
        output.context = entry.context;
      }

      // En producción, enviar a servicio de logging (Sentry, etc.)
      if (this.isProduction) {
        // Si hay Sentry configurado
        if (typeof window !== 'undefined' && (window as any).Sentry) {
          if (level === 'error') {
            (window as any).Sentry.captureException(new Error(message), {
              extra: output,
            });
          }
        }

        // Log estructurado para sistemas de logging
        console[level === 'debug' ? 'log' : level](JSON.stringify(output));
      } else {
        console[level === 'debug' ? 'log' : level](output);
      }
    }
  }

  debug(message: string, data?: any, context?: Record<string, any>): void {
    this.output(this.formatMessage('debug', message, data, context));
  }

  info(message: string, data?: any, context?: Record<string, any>): void {
    this.output(this.formatMessage('info', message, data, context));
  }

  warn(message: string, data?: any, context?: Record<string, any>): void {
    this.output(this.formatMessage('warn', message, data, context));
  }

  error(message: string, error?: Error | any, context?: Record<string, any>): void {
    const errorData = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error;

    this.output(
      this.formatMessage('error', message, errorData, context)
    );
  }

  // Helper para logear performance
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // Helper para logear grupos
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Exportar instancia singleton
export const logger = new Logger();

// Exportar clase para tests
export { Logger };


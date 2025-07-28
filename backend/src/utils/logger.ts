/**
 * Simple logging utility for the quiz backend
 */

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
    ];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    metadata?: any
  ): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;

    if (metadata) {
      return `${baseMessage} ${JSON.stringify(metadata, null, 2)}`;
    }

    return baseMessage;
  }

  debug(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, metadata));
    }
  }

  info(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, metadata));
    }
  }

  warn(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, metadata));
    }
  }

  error(message: string, error?: Error | any, metadata?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorInfo =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error;

      console.error(
        this.formatMessage(LogLevel.ERROR, message, {
          error: errorInfo,
          ...metadata,
        })
      );
    }
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();

import { NextRequest } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
  metadata?: Record<string, any>;
}

class Logger {
  private static instance: Logger;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatLog(entry: LogEntry): string {
    const baseLog = `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`;
    const metadata = entry.metadata ? `\nMetadata: ${JSON.stringify(entry.metadata, null, 2)}` : '';
    return `${baseLog}${metadata}`;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, request?: NextRequest) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
    };

    if (request) {
      entry.requestId = request.headers.get('x-request-id') || undefined;
      entry.path = request.nextUrl.pathname;
      entry.method = request.method;
    }

    const formattedLog = this.formatLog(entry);

    switch (level) {
      case 'error':
        console.error(formattedLog);
        break;
      case 'warn':
        console.warn(formattedLog);
        break;
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formattedLog);
        }
        break;
      default:
        console.log(formattedLog);
    }
  }

  public info(message: string, metadata?: Record<string, any>, request?: NextRequest) {
    this.log('info', message, metadata, request);
  }

  public warn(message: string, metadata?: Record<string, any>, request?: NextRequest) {
    this.log('warn', message, metadata, request);
  }

  public error(message: string, metadata?: Record<string, any>, request?: NextRequest) {
    this.log('error', message, metadata, request);
  }

  public debug(message: string, metadata?: Record<string, any>, request?: NextRequest) {
    this.log('debug', message, metadata, request);
  }
}

export const logger = Logger.getInstance(); 
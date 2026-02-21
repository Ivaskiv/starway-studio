// backend/src/utils/logger.ts
// winston — це нормальний логер, не console.log() з пекла.

/**
 * Logger Service - FIXED
 */

import winston from 'winston';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// ✅ Use winston.Logform.TransformableInfo instead of custom interface
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    return `${info.timestamp} [${info.level}]: ${info.message}`;
  })
);

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }),
  new winston.transports.File({ filename: 'logs/all.log' })
];

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  levels: logLevels,
  format,
  transports
});

// Helper functions
export const logInfo = (message: string, meta?: Record<string, any>) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any) => {
  logger.error(message, { 
    error: error?.message, 
    stack: error?.stack 
  });
};

export const logWarn = (message: string, meta?: Record<string, any>) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, any>) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: Record<string, any>) => {
  logger.http(message, meta);
};
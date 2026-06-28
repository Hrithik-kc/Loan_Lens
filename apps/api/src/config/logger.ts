import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV === 'development';

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'loanlens-api' },
  transports: [
    new winston.transports.Console({
      format: isDev
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
          }),
          new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
          }),
        ]
      : []),
  ],
});

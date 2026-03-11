import { createLogger, format, transports } from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = format;

export const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'uhid-api' },
  transports: [
    new transports.Console({
      format: combine(colorize(), simple()),
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  logger.add(
    new transports.File({ filename: 'logs/error.log', level: 'error' })
  );
  logger.add(new transports.File({ filename: 'logs/combined.log' }));
}

export default logger;

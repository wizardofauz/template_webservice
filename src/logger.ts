import winston from 'winston';

export const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.json(),
  defaultMeta: { service: 'web-service' },
  transports: [
    new winston.transports.Console({
      // format: winston.format.simple(),
    }),
  ],
});

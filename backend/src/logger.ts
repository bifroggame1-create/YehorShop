import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

// Logger configuration
export const loggerConfig = {
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  // Base context added to all logs
  base: {
    env: process.env.NODE_ENV || 'development',
    version: '2.0.0',
  },
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
}

// Create standalone logger for non-fastify use
export const logger = pino(loggerConfig)

// Cache logging helper (used by redis.ts)
export const logCache = (action: 'hit' | 'miss' | 'set' | 'del', key: string) => {
  logger.debug({ cache: true, action, key }, `Cache ${action}: ${key}`)
}

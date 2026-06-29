import winston from 'winston'

const redact = winston.format((info) => {
  const sensitiveKeys = ['password', 'token', 'authorization', 'otp', 'smtp_password', 'email_password']
  for (const key of Object.keys(info)) {
    if (sensitiveKeys.includes(key.toLowerCase())) info[key] = '[REDACTED]'
  }
  return info
})

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    redact(),
    winston.format.timestamp(),
    winston.format.errors({ stack: process.env.NODE_ENV !== 'production' }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
})

export function logSecurityEvent(event, details = {}) {
  logger.warn({ event, ...details, timestamp: new Date().toISOString() })
}

export function maskIp(ip = '') {
  return String(ip).replace(/\d+$/, 'x')
}

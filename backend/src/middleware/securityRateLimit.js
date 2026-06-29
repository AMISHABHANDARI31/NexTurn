import rateLimit from 'express-rate-limit'
import AuthAttempt from '../models/authAttemptModel.js'
import { logSecurityEvent, maskIp } from '../logging/logger.js'

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.API_RATE_LIMIT_MAX || 300),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
})

export function authAbuseLimiter({ action, maxAttempts, windowMs, blockMs, message, countEveryRequest = false }) {
  return async (req, res, next) => {
    try {
      const relaxedDevelopmentMode = process.env.NODE_ENV !== 'production' && process.env.AUTH_RATE_LIMIT_RELAXED !== 'false'
      if (relaxedDevelopmentMode) {
        req.recordAuthAttempt = async () => {}
        return next()
      }

      const email = normalizeEmail(req.body?.email)
      const ip = req.ip || req.socket?.remoteAddress || 'unknown'
      const now = new Date()
      const keys = [`${action}:ip:${ip}`]
      if (email) keys.push(`${action}:email:${email}`)

      for (const key of keys) {
        const attempt = await AuthAttempt.findOne({ key })
        if (attempt?.blockedUntil && attempt.blockedUntil > now) {
          logSecurityEvent(`${action}_BLOCKED`, { ip: maskIp(ip), email, blockedUntil: attempt.blockedUntil })
          return res.status(429).json({ success: false, error: { code: `${action}_RATE_LIMITED`, message } })
        }
      }

      req.recordAuthAttempt = async ({ success = false, userId = null } = {}) => {
        if (success) {
          await AuthAttempt.deleteMany({ key: { $in: keys } })
          return
        }
        for (const key of keys) {
          const attempt = await AuthAttempt.findOne({ key })
          if (!attempt || now - attempt.windowStart > windowMs) {
            await AuthAttempt.findOneAndUpdate(
              { key },
              { $set: { key, action, ip, email, userId, attempts: 1, windowStart: now, lastRequestTime: now, blockedUntil: null } },
              { upsert: true },
            )
          } else {
            attempt.attempts += 1
            attempt.lastRequestTime = now
            attempt.userId = userId
            if (attempt.attempts >= maxAttempts) attempt.blockedUntil = new Date(Date.now() + blockMs)
            await attempt.save()
          }
        }
        logSecurityEvent(countEveryRequest ? `${action}_REQUESTED` : `${action}_FAILED`, { ip: maskIp(ip), email })
      }

      if (countEveryRequest) await req.recordAuthAttempt({ success: false })
      next()
    } catch (error) {
      next(error)
    }
  }
}

export const loginRateLimiter = authAbuseLimiter({
  action: 'LOGIN',
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Try again later.',
})

export const otpRateLimiter = authAbuseLimiter({
  action: 'OTP',
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000,
  blockMs: 10 * 60 * 1000,
  message: 'OTP request limit reached. Please wait before trying again.',
  countEveryRequest: true,
})

export const passwordResetRateLimiter = authAbuseLimiter({
  action: 'PASSWORD_RESET',
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
  blockMs: 60 * 60 * 1000,
  message: 'Password reset request limit reached. Please wait before trying again.',
  countEveryRequest: true,
})

import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import testRoutes from './routes/testRoutes.js'
import authRoutes from './routes/authRoutes.js'
import sqpsRoutes from './routes/sqpsRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import managerRoutes from './routes/managerRoutes.js'
import predictionRoutes from './routes/predictionRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { generalApiLimiter } from './middleware/securityRateLimit.js'
import { logger } from './logging/logger.js'

const app = express()

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
].filter(Boolean))

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean)].filter(Boolean),
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: false } : false,
}))
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: { write: (message) => logger.info({ event: 'HTTP_REQUEST', message: message.trim() }) },
}))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(Object.assign(new Error('Origin is not allowed by NexTurn CORS policy.'), { status: 403, code: 'CORS_ORIGIN_FORBIDDEN' }))
  },
  credentials: true,
}))
app.use(generalApiLimiter)
app.use(express.json({ limit: '1mb' }))

app.use('/api', testRoutes)
// Compatibility with the existing NexTurn frontend base URL.
app.use('/api/v1/sqps', testRoutes)
app.use('/api/v1/sqps/auth', authRoutes)
app.use('/api/v1/sqps/admin', adminRoutes)
app.use('/api/v1/sqps/manager', managerRoutes)
app.use('/api/v1/sqps/predict', predictionRoutes)
app.use('/api/v1/sqps', sqpsRoutes)
app.use(notFound)
app.use(errorHandler)

export default app

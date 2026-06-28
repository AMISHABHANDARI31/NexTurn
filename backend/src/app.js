import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import testRoutes from './routes/testRoutes.js'
import authRoutes from './routes/authRoutes.js'
import sqpsRoutes from './routes/sqpsRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import managerRoutes from './routes/managerRoutes.js'
import predictionRoutes from './routes/predictionRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

const allowedOrigins = new Set([
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean))

app.disable('x-powered-by')
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true)
    return callback(Object.assign(new Error('Origin is not allowed by NexTurn CORS policy.'), { status: 403, code: 'CORS_ORIGIN_FORBIDDEN' }))
  },
  credentials: true,
}))
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

import mongoose from 'mongoose'
import cloudinary from '../config/cloudinary.js'
import { getEmailConfig, verifyEmailTransport } from '../services/emailService.js'
import { getEmailQueueStats } from '../services/emailQueue.js'

export function healthCheck(_req, res) {
  res.json({
    success: true,
    status: 'healthy',
    message: 'NexTurn backend is healthy',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.round(process.uptime()),
    connections: {
      backend: 'connected',
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      cloudinary: cloudinary.config().cloud_name ? 'configured' : 'not configured',
    },
  })
}

export function testConnection(_req, res) {
  res.json({ success: true, message: 'Frontend successfully reached the NexTurn backend' })
}

export async function emailHealthCheck(_req, res) {
  const config = getEmailConfig()
  const queue = await getEmailQueueStats()

  try {
    await verifyEmailTransport()
    res.json({
      success: true,
      message: 'Email service is healthy',
      connections: {
        smtp: 'connected',
        provider: config.host,
        sender: config.from,
      },
      queue,
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Email service is not reachable',
      error: {
        code: error?.code || 'EMAIL_HEALTH_FAILED',
        message: error?.cause?.message || error.message,
      },
      connections: {
        smtp: 'disconnected',
        provider: config.host,
        sender: config.from || 'not configured',
      },
      queue,
    })
  }
}

export async function testCloudinary(_req, res, next) {
  try {
    const result = await cloudinary.api.ping()
    res.json({ success: true, message: 'Cloudinary connected successfully', data: result })
  } catch (error) {
    next(error)
  }
}

import mongoose from 'mongoose'
import cloudinary from '../config/cloudinary.js'

export function healthCheck(_req, res) {
  res.json({
    success: true,
    message: 'NexTurn backend is healthy',
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

export async function testCloudinary(_req, res, next) {
  try {
    const result = await cloudinary.api.ping()
    res.json({ success: true, message: 'Cloudinary connected successfully', data: result })
  } catch (error) {
    next(error)
  }
}

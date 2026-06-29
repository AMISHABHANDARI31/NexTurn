import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

export async function authenticateSocket(socket, next) {
  try {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '')
    if (!rawToken) {
      return next(new Error('Socket authentication required.'))
    }
    if (!process.env.JWT_SECRET) {
      return next(new Error('JWT_SECRET is not configured.'))
    }

    const payload = jwt.verify(rawToken, process.env.JWT_SECRET, {
      issuer: 'nexturn-api',
      audience: 'nexturn-web',
    })
    const user = await User.findById(payload.userId).lean()
    if (!user) return next(new Error('Socket user not found.'))

    socket.user = user
    next()
  } catch {
    next(new Error('Invalid or expired socket token.'))
  }
}

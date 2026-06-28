import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

export async function protect(req, res, next) {
  try {
    const authorization = req.headers.authorization
    if (!authorization?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'AUTH_REQUIRED', message: 'Sign in to access this resource.' } })
    if (!process.env.JWT_SECRET) throw Object.assign(new Error('JWT_SECRET is missing from backend/.env'), { status: 500, code: 'JWT_NOT_CONFIGURED' })

    const token = authorization.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'nexturn-api', audience: 'nexturn-web' })
    const user = await User.findById(payload.userId)
    if (!user) return res.status(401).json({ success: false, error: { code: 'SESSION_USER_NOT_FOUND', message: 'This session is no longer valid.' } })
    req.user = user
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired. Please sign in again.' } })
    if (error.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Your session token is invalid.' } })
    next(error)
  }
}

export const restrictTo = (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'ROLE_FORBIDDEN', message: 'Your role does not have access to this resource.' } })
  next()
}

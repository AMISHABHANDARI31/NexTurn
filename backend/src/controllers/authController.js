import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { enqueueOtpEmail, enqueuePasswordResetEmail, enqueueWelcomeEmail } from '../services/emailQueue.js'
import User from '../models/userModel.js'

const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, isEmailVerified: user.isEmailVerified })
const otpExpiryMinutes = () => Math.min(30, Math.max(1, Number(process.env.OTP_EXPIRES_IN_MINUTES) || 10))
const otpHash = (email, otp) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${otp}`).digest('hex')
const resetExpiryMinutes = () => Math.min(15, Math.max(5, Number(process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES) || 15))
const resetTokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex')

function validateCredentials({ name, email, password }, includeName = false) {
  const fields = {}
  if (includeName && (!name || String(name).trim().length < 2)) fields.name = 'Enter your full name.'
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) fields.email = 'Enter a valid email address.'
  if (!password || String(password).length < 8 || String(password).length > 128) fields.password = 'Password must contain between 8 and 128 characters.'
  return fields
}

function createToken(user) {
  if (!process.env.JWT_SECRET) throw Object.assign(new Error('JWT_SECRET is missing from backend/.env'), { status: 500, code: 'JWT_NOT_CONFIGURED' })
  return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h', issuer: 'nexturn-api', audience: 'nexturn-web' })
}

function frontendUrl(path) {
  const origin = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')
  return `${origin}${path}`
}

async function issueAndSendOtp(user) {
  const otp = String(crypto.randomInt(100000, 1000000))
  const expiresInMinutes = otpExpiryMinutes()
  user.emailVerificationOtpHash = otpHash(user.email, otp)
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + expiresInMinutes * 60_000)
  user.emailVerificationOtpAttempts = 0
  await user.save({ validateBeforeSave: false })

  try {
    await enqueueOtpEmail({ email: user.email, name: user.name, otp, expiresInMinutes })
    user.emailVerificationOtpLastSentAt = new Date()
    await user.save({ validateBeforeSave: false })
  } catch (cause) {
    console.error('OTP email delivery failed:', cause.message)
    throw Object.assign(new Error('We could not send the verification email. Check the SMTP configuration and try again.'), { status: 502, code: 'OTP_EMAIL_FAILED' })
  }
  return expiresInMinutes
}

function pendingResponse(res, user, expiresInMinutes, status = 201) {
  return res.status(status).json({ success: true, message: 'Verification code sent. Check your email.', data: { requiresVerification: true, email: user.email, expiresInMinutes } })
}

export async function register(req, res, next) {
  try {
    const fields = validateCredentials(req.body, true)
    if (Object.keys(fields).length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Please correct the highlighted fields.', fields } })

    const email = normalizeEmail(req.body.email)
    const existingUser = await User.findOne({ email }).select('+emailVerificationOtpLastSentAt +emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts')
    if (existingUser?.isEmailVerified) return res.status(409).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.', fields: { email: 'Email is already registered.' } } })
    if (existingUser) {
      const expiresInMinutes = await issueAndSendOtp(existingUser)
      return pendingResponse(res, existingUser, expiresInMinutes, 200)
    }

    const user = await User.create({ name: String(req.body.name).trim(), email, password: req.body.password, role: 'User', isEmailVerified: false })
    const verificationUser = await User.findById(user._id).select('+emailVerificationOtpLastSentAt +emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts')
    const expiresInMinutes = await issueAndSendOtp(verificationUser)
    return pendingResponse(res, verificationUser, expiresInMinutes)
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.' } })
    next(error)
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    const otp = String(req.body.otp ?? '').trim()
    if (!email || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, error: { code: 'INVALID_OTP_FORMAT', message: 'Enter the 6-digit verification code.' } })

    const user = await User.findOne({ email }).select('+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts')
    if (!user) return res.status(404).json({ success: false, error: { code: 'VERIFICATION_NOT_FOUND', message: 'No pending verification was found for this email.' } })
    if (user.isEmailVerified) return res.status(409).json({ success: false, error: { code: 'EMAIL_ALREADY_VERIFIED', message: 'This email is already verified. Please sign in.' } })
    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt || user.emailVerificationOtpExpiresAt <= new Date()) return res.status(410).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'This verification code has expired. Request a new code.' } })
    if (user.emailVerificationOtpAttempts >= 5) return res.status(429).json({ success: false, error: { code: 'OTP_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Request a new code.' } })

    const expected = Buffer.from(user.emailVerificationOtpHash, 'hex')
    const received = Buffer.from(otpHash(email, otp), 'hex')
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      user.emailVerificationOtpAttempts += 1
      await user.save({ validateBeforeSave: false })
      return res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'The verification code is incorrect.' } })
    }

    user.isEmailVerified = true
    user.emailVerifiedAt = new Date()
    user.emailVerificationOtpHash = null
    user.emailVerificationOtpExpiresAt = null
    user.emailVerificationOtpLastSentAt = null
    user.emailVerificationOtpAttempts = 0
    await user.save({ validateBeforeSave: false })
    enqueueWelcomeEmail({ email: user.email, name: user.name }).catch((cause) => console.error('Welcome email queue failed:', cause.message))
    return res.json({ success: true, message: 'Email verified successfully.', data: { token: createToken(user), user: publicUser(user) } })
  } catch (error) { next(error) }
}

export async function resendOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email) return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED', message: 'Email address is required.' } })
    const user = await User.findOne({ email }).select('+emailVerificationOtpLastSentAt +emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts')
    if (!user || user.isEmailVerified) return res.status(400).json({ success: false, error: { code: 'NO_PENDING_VERIFICATION', message: 'No pending email verification was found.' } })

    const elapsed = Date.now() - (user.emailVerificationOtpLastSentAt?.getTime() || 0)
    if (elapsed < 60_000) return res.status(429).json({ success: false, error: { code: 'OTP_RESEND_THROTTLED', message: `Please wait ${Math.ceil((60_000 - elapsed) / 1000)} seconds before requesting another code.` } })
    const expiresInMinutes = await issueAndSendOtp(user)
    return pendingResponse(res, user, expiresInMinutes, 200)
  } catch (error) { next(error) }
}

export async function login(req, res, next) {
  try {
    const fields = validateCredentials(req.body)
    if (Object.keys(fields).length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid email and password.', fields } })
    const user = await User.findOne({ email: normalizeEmail(req.body.email) }).select('+password')
    if (!user || !(await user.comparePassword(req.body.password))) {
      await req.recordAuthAttempt?.({ success: false, userId: user?._id || null })
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } })
    }
    if (!user.isEmailVerified) return res.status(403).json({ success: false, error: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before signing in.' } })
    await req.recordAuthAttempt?.({ success: true, userId: user._id })
    return res.json({ success: true, message: 'Signed in successfully.', data: { token: createToken(user), user: publicUser(user) } })
  } catch (error) { next(error) }
}

export async function requestPasswordReset(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED', message: 'Enter a valid email address.' } })

    const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetTokenExpiresAt')
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User does not exist. Please register first.',
          fields: { email: 'No NexTurn account was found with this email.' },
        },
      })
    }

    const rawToken = crypto.randomBytes(32).toString('hex')
    const expiresInMinutes = resetExpiryMinutes()
    user.passwordResetTokenHash = resetTokenHash(rawToken)
    user.passwordResetTokenExpiresAt = new Date(Date.now() + expiresInMinutes * 60_000)
    await user.save({ validateBeforeSave: false })

    const resetUrl = frontendUrl(`/reset-password?email=${encodeURIComponent(user.email)}&token=${rawToken}`)
    await enqueuePasswordResetEmail({ email: user.email, name: user.name, resetUrl, expiresInMinutes })
    return res.json({ success: true, message: 'Password reset link sent. Please check your email.' })
  } catch (error) { next(error) }
}

export async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email)
    const token = String(req.body.token || '').trim()
    const password = String(req.body.password || '')
    if (!email || !token || password.length < 8 || password.length > 128) return res.status(400).json({ success: false, error: { code: 'INVALID_RESET_PAYLOAD', message: 'Provide email, reset token, and a new 8-128 character password.' } })

    const user = await User.findOne({ email }).select('+password +passwordResetTokenHash +passwordResetTokenExpiresAt')
    if (!user || !user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt || user.passwordResetTokenExpiresAt <= new Date()) return res.status(400).json({ success: false, error: { code: 'RESET_TOKEN_INVALID', message: 'This reset link is invalid or expired.' } })

    const expected = Buffer.from(user.passwordResetTokenHash, 'hex')
    const received = Buffer.from(resetTokenHash(token), 'hex')
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return res.status(400).json({ success: false, error: { code: 'RESET_TOKEN_INVALID', message: 'This reset link is invalid or expired.' } })

    user.password = password
    user.passwordResetTokenHash = null
    user.passwordResetTokenExpiresAt = null
    await user.save()
    return res.json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' })
  } catch (error) { next(error) }
}

export function currentUser(req, res) {
  res.json({ success: true, data: { user: publicUser(req.user) } })
}

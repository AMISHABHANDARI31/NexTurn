import { Router } from 'express'
import { currentUser, login, register, requestPasswordReset, resendOtp, resetPassword, verifyOtp } from '../controllers/authController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'
import { loginRateLimiter, otpRateLimiter, passwordResetRateLimiter } from '../middleware/securityRateLimit.js'
import { validate } from '../middleware/validateRequest.js'
import { forgotPasswordSchema, loginSchema, otpSchema, registerSchema, resendOtpSchema, resetPasswordSchema } from '../validation/authSchemas.js'

const router = Router()
router.post('/register', validate(registerSchema), otpRateLimiter, register)
router.post('/verify-otp', validate(otpSchema), verifyOtp)
router.post('/resend-otp', validate(resendOtpSchema), otpRateLimiter, resendOtp)
router.post('/forgot-password', validate(forgotPasswordSchema), passwordResetRateLimiter, requestPasswordReset)
router.post('/reset-password', validate(resetPasswordSchema), resetPassword)
router.post('/login', validate(loginSchema), loginRateLimiter, login)
router.get('/me', protect, currentUser)
router.get('/manager-check', protect, restrictTo('Manager', 'SystemAdmin'), currentUser)
router.get('/admin-check', protect, restrictTo('SystemAdmin'), currentUser)

export default router

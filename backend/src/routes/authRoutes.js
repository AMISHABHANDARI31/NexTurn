import { Router } from 'express'
import { currentUser, login, register, resendOtp, verifyOtp } from '../controllers/authController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'

const router = Router()
router.post('/register', register)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp)
router.post('/login', login)
router.get('/me', protect, currentUser)
router.get('/manager-check', protect, restrictTo('Manager', 'SystemAdmin'), currentUser)
router.get('/admin-check', protect, restrictTo('SystemAdmin'), currentUser)

export default router

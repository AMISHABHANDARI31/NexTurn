import { Router } from 'express'
import { emailHealthCheck, healthCheck, testCloudinary, testConnection } from '../controllers/testController.js'

const router = Router()
router.get('/health', healthCheck)
router.get('/health/email', emailHealthCheck)
router.get('/test', testConnection)
router.get('/test-cloudinary', testCloudinary)

export default router

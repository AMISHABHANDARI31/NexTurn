import { Router } from 'express'
import { healthCheck, testCloudinary, testConnection } from '../controllers/testController.js'

const router = Router()
router.get('/health', healthCheck)
router.get('/test', testConnection)
router.get('/test-cloudinary', testCloudinary)

export default router

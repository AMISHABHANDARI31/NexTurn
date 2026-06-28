import { Router } from 'express'
import { getCorePrediction } from '../controllers/predictionController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()
router.get('/core/:locationId', protect, getCorePrediction)
export default router

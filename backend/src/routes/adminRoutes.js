import { Router } from 'express'
import { createLocation, getAnalyticsCharts, getModelStatus, getTelemetry, listAssignableLocations, listUsers, triggerRetraining, updateModelConfig, updateUserRole } from '../controllers/adminController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'
import { uploadLocationImage } from '../middleware/uploadMiddleware.js'

const router = Router()

router.use(protect, restrictTo('SystemAdmin'))
router.get('/telemetry', getTelemetry)
router.get('/users', listUsers)
router.patch('/users/:id/role', updateUserRole)
router.post('/locations', uploadLocationImage, createLocation)
router.get('/locations', listAssignableLocations)
router.get('/model', getModelStatus)
router.post('/model/retrain', triggerRetraining)
router.patch('/model/config', updateModelConfig)
router.get('/analytics/charts', getAnalyticsCharts)

export default router

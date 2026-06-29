import { Router } from 'express'
import { assignManagerLocation, createLocation, getAnalyticsCharts, getModelStatus, getPredictionAccuracy, getTelemetry, listAssignableLocations, listBranches, listManagerAssignments, listUsers, removeManagerAssignment, triggerRetraining, updateBranch, updateModelConfig, updateUserRole } from '../controllers/adminController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'
import { uploadLocationImage } from '../middleware/uploadMiddleware.js'

const router = Router()

router.use(protect, restrictTo('SystemAdmin'))
router.get('/telemetry', getTelemetry)
router.get('/users', listUsers)
router.patch('/users/:id/role', updateUserRole)
router.patch('/users/:id/assignment', assignManagerLocation)
router.delete('/users/:id/assignment', removeManagerAssignment)
router.post('/locations', uploadLocationImage, createLocation)
router.get('/locations', listAssignableLocations)
router.get('/branches', listBranches)
router.patch('/branches/:id', updateBranch)
router.get('/managers/assignments', listManagerAssignments)
router.get('/model', getModelStatus)
router.post('/model/retrain', triggerRetraining)
router.patch('/model/config', updateModelConfig)
router.get('/model/accuracy', getPredictionAccuracy)
router.get('/analytics/charts', getAnalyticsCharts)

export default router

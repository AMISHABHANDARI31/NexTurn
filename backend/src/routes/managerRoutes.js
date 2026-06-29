import { Router } from 'express'
import { callNextToken, createWalkIn, getAnalyticsSummary, getAutomationSettings, getCounters, getLiveQueue, getLocationSettings, getManagerNotifications, getManagerProfile, updateAutomationSettings, updateCounterStatus, updateLocationSettings, updateTokenStatus } from '../controllers/managerController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'
import { verifyBranchAccess } from '../middleware/branchAccessMiddleware.js'
import { uploadBranchAsset } from '../middleware/uploadMiddleware.js'
import { validate } from '../middleware/validateRequest.js'
import { tokenStatusSchema } from '../validation/queueSchemas.js'

const router = Router()
router.use(protect, restrictTo('Manager'))

router.get('/profile', verifyBranchAccess, getManagerProfile)
router.get('/counters', verifyBranchAccess, getCounters)
router.route('/automation').get(verifyBranchAccess, getAutomationSettings).patch(verifyBranchAccess, updateAutomationSettings)
router.patch('/counters/:counterId/status', verifyBranchAccess, updateCounterStatus)
router.get('/queue/live', verifyBranchAccess, getLiveQueue)
router.post('/queue/next', verifyBranchAccess, callNextToken)
router.post('/queue/walk-in', verifyBranchAccess, createWalkIn)
router.patch('/queue/tokens/:tokenId/status', verifyBranchAccess, validate(tokenStatusSchema), updateTokenStatus)
router.get('/location/settings', verifyBranchAccess, getLocationSettings)
router.put('/location/settings', verifyBranchAccess, uploadBranchAsset, updateLocationSettings)
router.get('/analytics/summary', verifyBranchAccess, getAnalyticsSummary)
router.get('/notifications', verifyBranchAccess, getManagerNotifications)

export default router

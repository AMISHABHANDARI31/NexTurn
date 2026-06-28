import { Router } from 'express'
import { callNextToken, createWalkIn, getAnalyticsSummary, getCounters, getLiveQueue, getLocationSettings, getManagerNotifications, updateCounterStatus, updateLocationSettings, updateTokenStatus } from '../controllers/managerController.js'
import { protect, restrictTo } from '../middleware/authMiddleware.js'
import { verifyBranchAccess } from '../middleware/branchAccessMiddleware.js'
import { uploadBranchAsset } from '../middleware/uploadMiddleware.js'

const router = Router()
router.use(protect, restrictTo('Manager'))

router.get('/counters', verifyBranchAccess, getCounters)
router.patch('/counters/:counterId/status', verifyBranchAccess, updateCounterStatus)
router.get('/queue/live', verifyBranchAccess, getLiveQueue)
router.post('/queue/next', verifyBranchAccess, callNextToken)
router.post('/queue/walk-in', verifyBranchAccess, createWalkIn)
router.patch('/queue/tokens/:tokenId/status', verifyBranchAccess, updateTokenStatus)
router.get('/location/settings', verifyBranchAccess, getLocationSettings)
router.put('/location/settings', verifyBranchAccess, uploadBranchAsset, updateLocationSettings)
router.get('/analytics/summary', verifyBranchAccess, getAnalyticsSummary)
router.get('/notifications', verifyBranchAccess, getManagerNotifications)

export default router

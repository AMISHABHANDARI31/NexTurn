import { Router } from 'express'
import { getLocations, getNotifications, getQueue, getTokens, issueToken } from '../controllers/sqpsController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()

router.use(protect)
router.get('/locations', getLocations)
router.get('/queue', getQueue)
router.route('/tokens').get(getTokens).post(issueToken)
router.get('/notifications', getNotifications)

export default router

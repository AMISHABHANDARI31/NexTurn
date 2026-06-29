import { Router } from 'express'
import { cancelOwnToken, getLocations, getNotifications, getQueue, getTokens, issueToken } from '../controllers/sqpsController.js'
import { protect } from '../middleware/authMiddleware.js'
import { validate } from '../middleware/validateRequest.js'
import { cancelTokenSchema, issueTokenSchema } from '../validation/queueSchemas.js'

const router = Router()

router.use(protect)
router.get('/locations', getLocations)
router.get('/queue', getQueue)
router.route('/tokens').get(getTokens).post(validate(issueTokenSchema), issueToken)
router.patch('/tokens/:tokenId/cancel', validate(cancelTokenSchema), cancelOwnToken)
router.get('/notifications', getNotifications)

export default router

import mongoose from 'mongoose'
import { predictQueue } from '../../ai/prediction/predictionService.js'

export async function getCorePrediction(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.locationId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_LOCATION_ID', message: 'The location identifier is invalid.' },
      })
    }

    const branchScope = req.query.scope === 'branch'
    const prediction = await predictQueue({
      locationId: req.params.locationId,
      tokenId: mongoose.isValidObjectId(req.query.tokenId) ? String(req.query.tokenId) : null,
      userId: req.user?._id,
      branchScope: branchScope && req.user?.role === 'Manager',
    })

    if (!prediction) {
      return res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: 'Service location not found.' },
      })
    }

    res.json({ success: true, data: prediction })
  } catch (error) {
    next(error)
  }
}

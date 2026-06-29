import mongoose from 'mongoose'
import Location from '../models/locationModel.js'

export async function checkManagerLocationAccess(req, res, next) {
  try {
    if (req.user?.role !== 'Manager') return next()
    if (!req.user.assignedLocationId) {
      return res.status(403).json({
        success: false,
        error: { code: 'LOCATION_ASSIGNMENT_REQUIRED', message: 'You are not authorized for this location.' },
      })
    }

    const requestedLocationId = req.params.locationId || req.body.locationId || req.query.locationId
    if (!requestedLocationId) return next()
    if (!mongoose.isValidObjectId(requestedLocationId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION_ID', message: 'Location id is invalid.' } })
    }

    const [assigned, requested] = await Promise.all([
      Location.findById(req.user.assignedLocationId).select('location branchCode').lean(),
      Location.findById(requestedLocationId).select('location branchCode').lean(),
    ])
    const sameBranch = assigned && requested && (
      String(req.user.assignedLocationId) === String(requestedLocationId)
      || assigned.location === requested.location
      || (assigned.branchCode && assigned.branchCode === requested.branchCode)
    )

    if (!sameBranch) {
      return res.status(403).json({
        success: false,
        error: { code: 'LOCATION_FORBIDDEN', message: 'You are not authorized for this location.' },
      })
    }
    next()
  } catch (error) {
    next(error)
  }
}

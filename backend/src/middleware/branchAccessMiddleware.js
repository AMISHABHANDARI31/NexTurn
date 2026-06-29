import mongoose from 'mongoose'
import Counter from '../models/counterModel.js'
import Token from '../models/tokenModel.js'
import Location from '../models/locationModel.js'

export async function verifyBranchAccess(req, res, next) {
  try {
    if (req.user?.role !== 'Manager') return res.status(403).json({ success: false, error: { code: 'MANAGER_REQUIRED', message: 'Manager access is required.' } })
    if (!req.user.assignedLocationId) return res.status(403).json({ success: false, error: { code: 'BRANCH_NOT_ASSIGNED', message: 'No branch is assigned to this Manager account.' } })

    const assignedId = String(req.user.assignedLocationId)
    const assignedBranch = await Location.findById(assignedId).lean()
    if (!assignedBranch) return res.status(403).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'The assigned branch no longer exists.' } })
    if (assignedBranch.branchStatus === 'INACTIVE') return res.status(403).json({ success: false, error: { code: 'BRANCH_INACTIVE', message: 'Your assigned branch is currently inactive.' } })
    const branchFilter = assignedBranch.branchCode ? { $or: [{ branchCode: assignedBranch.branchCode }, { location: assignedBranch.location }] } : { location: assignedBranch.location }
    const branchLocationIds = await Location.find(branchFilter).distinct('_id')
    const allowedLocationIds = new Set(branchLocationIds.map(String))
    if (req.params.locationId && String(req.params.locationId) !== assignedId) return res.status(403).json({ success: false, error: { code: 'CROSS_BRANCH_FORBIDDEN', message: 'You cannot access another branch.' } })

    if (req.params.counterId) {
      if (!mongoose.isValidObjectId(req.params.counterId)) return res.status(400).json({ success: false, error: { code: 'INVALID_COUNTER_ID', message: 'The selected counter is invalid.' } })
      const counter = await Counter.findById(req.params.counterId)
      if (!counter) return res.status(404).json({ success: false, error: { code: 'COUNTER_NOT_FOUND', message: 'Counter not found.' } })
      if (String(counter.location) !== assignedId) return res.status(403).json({ success: false, error: { code: 'CROSS_BRANCH_FORBIDDEN', message: 'This counter belongs to another branch.' } })
      req.managerCounter = counter
    }

    if (req.params.tokenId) {
      if (!mongoose.isValidObjectId(req.params.tokenId)) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN_ID', message: 'The selected token is invalid.' } })
      const token = await Token.findById(req.params.tokenId)
      if (!token) return res.status(404).json({ success: false, error: { code: 'TOKEN_NOT_FOUND', message: 'Token not found.' } })
      if (!allowedLocationIds.has(String(token.location))) return res.status(403).json({ success: false, error: { code: 'CROSS_BRANCH_FORBIDDEN', message: 'This token belongs to another branch.' } })
      req.managerToken = token
    }

    req.branchId = req.user.assignedLocationId
    req.branchLocation = assignedBranch
    req.branchLocationIds = branchLocationIds
    next()
  } catch (error) { next(error) }
}

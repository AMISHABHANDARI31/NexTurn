import crypto from 'node:crypto'
import cloudinary from '../config/cloudinary.js'
import Counter from '../models/counterModel.js'
import Location from '../models/locationModel.js'
import Token from '../models/tokenModel.js'
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js'

function requireAssignedManager(req, res) {
  if (req.user?.role === 'Manager' && req.branchId && String(req.user.assignedLocationId) === String(req.branchId)) return true
  res.status(403).json({ success: false, error: { code: 'BRANCH_ACCESS_REQUIRED', message: 'You are not authorized for this branch.' } })
  return false
}

async function ensureCounters(location) {
  const count = Math.max(1, location.activeCounters || 1)
  await Counter.bulkWrite(Array.from({ length: count }, (_, index) => ({ updateOne: { filter: { location: location._id, number: index + 1 }, update: { $setOnInsert: { name: `Counter ${index + 1}`, status: 'Closed' } }, upsert: true } })))
}

export async function getCounters(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const location = await Location.findById(req.branchId).lean()
    if (!location) return res.status(404).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'Assigned branch no longer exists.' } })
    await ensureCounters(location)
    const counters = await Counter.find({ location: req.branchId }).sort({ number: 1 }).lean()
    res.json({ success: true, data: { location, counters } })
  } catch (error) { next(error) }
}

export async function updateCounterStatus(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const status = req.body.status
    if (!['Active', 'Break', 'Closed'].includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_COUNTER_STATUS', message: 'Counter status must be Active, Break, or Closed.' } })
    req.managerCounter.status = status
    req.managerCounter.lastStatusChangedAt = new Date()
    await req.managerCounter.save()
    res.json({ success: true, message: `${req.managerCounter.name} is now ${status}.`, data: { counter: req.managerCounter } })
  } catch (error) { next(error) }
}

export async function getLiveQueue(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const [tokens, services] = await Promise.all([
      Token.find({ location: { $in: req.branchLocationIds }, status: { $in: ['waiting', 'serving'] } }).sort({ createdAt: 1 }).populate('counter', 'name number status').lean(),
      Location.find({ _id: { $in: req.branchLocationIds } }).select('service category').sort({ service: 1 }).lean(),
    ])
    res.json({ success: true, data: { tokens, services: services.map((item) => ({ locationId: String(item._id), service: item.service, category: item.category })) } })
  } catch (error) { next(error) }
}

export async function callNextToken(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const counter = await Counter.findOne({ _id: req.body.counterId, location: req.branchId })
    if (!counter) return res.status(404).json({ success: false, error: { code: 'COUNTER_NOT_FOUND', message: 'Select a counter assigned to this branch.' } })
    if (counter.status !== 'Active') return res.status(409).json({ success: false, error: { code: 'COUNTER_NOT_ACTIVE', message: 'Activate the counter before calling a customer.' } })
    const token = await Token.findOneAndUpdate({ location: { $in: req.branchLocationIds }, status: 'waiting' }, { $set: { status: 'serving', servingAt: new Date(), counter: counter._id } }, { sort: { priority: -1, createdAt: 1 }, returnDocument: 'after' })
    if (!token) return res.status(404).json({ success: false, error: { code: 'QUEUE_EMPTY', message: 'No customers are waiting at this branch.' } })
    res.json({ success: true, message: `${token.code} is now being served.`, data: { token } })
  } catch (error) { next(error) }
}

export async function createWalkIn(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const service = String(req.body.service || '').trim()
    const phone = String(req.body.phone || '0000000000').trim()
    const location = await Location.findOne({ _id: { $in: req.branchLocationIds }, service }).lean()
    if (!location || service.length < 2) return res.status(400).json({ success: false, error: { code: 'INVALID_WALK_IN', message: 'Select a valid service for this branch.' } })
    const code = `VIP-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 1000)}`
    const token = await Token.create({ code, user: null, createdByManager: req.user._id, location: location._id, service, category: location.category, phone, accessibility: true, priority: 'high', estimatedMinutes: Math.max(1, location.predictedWaitMinutes || location.defaultServiceMinutes || 15) })
    res.status(201).json({ success: true, message: 'Priority walk-in token created.', data: { token } })
  } catch (error) { next(error) }
}

export async function updateTokenStatus(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const status = req.body.status
    if (!['completed', 'cancelled'].includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN_STATUS', message: 'Token status must be completed or cancelled.' } })
    const now = new Date()
    req.managerToken.status = status
    if (status === 'completed') {
      req.managerToken.completedAt = now
      if (req.managerToken.servingAt) req.managerToken.processingMinutes = Math.max(0, (now - req.managerToken.servingAt) / 60_000)
    } else req.managerToken.cancelledAt = now
    await req.managerToken.save({ validateBeforeSave: false })
    res.json({ success: true, message: `${req.managerToken.code} marked ${status}.`, data: { token: req.managerToken } })
  } catch (error) { next(error) }
}

export async function getLocationSettings(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const location = await Location.findById(req.branchId).lean()
    if (!location) return res.status(404).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'Assigned branch no longer exists.' } })
    res.json({ success: true, data: { location } })
  } catch (error) { next(error) }
}

export async function updateLocationSettings(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  let upload
  try {
    const openTime = String(req.body.openTime || '')
    const closeTime = String(req.body.closeTime || '')
    const defaultServiceMinutes = Number(req.body.defaultServiceMinutes)
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime) || !Number.isFinite(defaultServiceMinutes) || defaultServiceMinutes < 1 || defaultServiceMinutes > 240) return res.status(400).json({ success: false, error: { code: 'INVALID_BRANCH_SETTINGS', message: 'Provide valid business hours and a 1–240 minute service baseline.' } })
    const location = await Location.findById(req.branchId).select('+scheduleImagePublicId')
    if (!location) return res.status(404).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'Assigned branch no longer exists.' } })
    if (req.file?.buffer) upload = await uploadImageBuffer(req.file.buffer, 'nexturn/branch-schedules')
    const oldPublicId = location.scheduleImagePublicId
    location.businessHours = { openTime, closeTime }
    location.defaultServiceMinutes = defaultServiceMinutes
    if (upload) { location.scheduleImageUrl = upload.secure_url; location.scheduleImagePublicId = upload.public_id }
    await location.save()
    if (upload && oldPublicId) await cloudinary.uploader.destroy(oldPublicId).catch(() => {})
    res.json({ success: true, message: 'Branch settings updated.', data: { location } })
  } catch (error) {
    if (upload?.public_id) await cloudinary.uploader.destroy(upload.public_id).catch(() => {})
    next(error)
  }
}

export async function getAnalyticsSummary(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const match = { location: { $in: req.branchLocationIds }, createdAt: { $gte: today } }
    const [totals, counterSpeed, hourlyVolume] = await Promise.all([
      Token.aggregate([{ $match: match }, { $group: { _id: null, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } } } }]),
      Token.aggregate([{ $match: { ...match, status: 'completed', counter: { $ne: null }, processingMinutes: { $ne: null } } }, { $group: { _id: '$counter', averageProcessingMinutes: { $avg: '$processingMinutes' }, completed: { $sum: 1 } } }, { $lookup: { from: 'counters', localField: '_id', foreignField: '_id', as: 'counter' } }, { $unwind: '$counter' }, { $project: { _id: 0, counterId: '$_id', counterName: '$counter.name', completed: 1, averageProcessingMinutes: { $round: ['$averageProcessingMinutes', 1] } } }]),
      Token.aggregate([{ $match: match }, { $group: { _id: { $hour: '$createdAt' }, customers: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, hour: '$_id', customers: 1 } }]),
    ])
    res.json({ success: true, data: { completed: totals[0]?.completed || 0, cancelled: totals[0]?.cancelled || 0, counterSpeed, hourlyVolume } })
  } catch (error) { next(error) }
}

export async function getManagerNotifications(req, res, next) {
  if (!requireAssignedManager(req, res)) return
  try {
    const location = await Location.findById(req.branchId).lean()
    const baseline = location?.defaultServiceMinutes || 15
    const staleBefore = new Date(Date.now() - baseline * 2 * 60_000)
    const [waiting, staleTokens] = await Promise.all([
      Token.countDocuments({ location: { $in: req.branchLocationIds }, status: 'waiting' }),
      Token.find({ location: { $in: req.branchLocationIds }, status: 'serving', servingAt: { $lte: staleBefore } }).sort({ servingAt: 1 }).lean(),
    ])
    const alerts = []
    if (waiting > 20) alerts.push({ id: 'surge', severity: 'critical', title: 'Surge Alert', message: `${waiting} customers are waiting. Consider activating more counters.` })
    staleTokens.forEach((token) => alerts.push({ id: `stale-${token._id}`, severity: 'warning', title: 'Stale Token Warning', message: `${token.code} has exceeded twice the ${baseline}-minute service baseline.` }))
    res.json({ success: true, data: { waiting, baselineMinutes: baseline, alerts } })
  } catch (error) { next(error) }
}

import mongoose from 'mongoose'
import cloudinary from '../config/cloudinary.js'
import AssignmentAudit from '../models/assignmentAuditModel.js'
import Counter from '../models/counterModel.js'
import Location from '../models/locationModel.js'
import PredictionHistory from '../models/predictionHistoryModel.js'
import PredictionModel from '../models/predictionModelModel.js'
import SystemConfig from '../models/systemConfigModel.js'
import Token from '../models/tokenModel.js'
import User from '../models/userModel.js'
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js'
import { emitManagerLocationUpdated } from '../services/queueService.js'
import { evaluatePredictionAccuracy, getAccuracyHistory } from '../../ai/evaluation/accuracyService.js'
import { trainPredictionModel } from '../../ai/training/trainModel.js'

const allowedCategories = ['Healthcare', 'Banking', 'Education & College', 'Government & Identity']
const trainingState = { status: 'idle', startedAt: null, completedAt: null, output: '', error: null }

function requireSystemAdmin(req, res) {
  if (req.user?.role === 'SystemAdmin') return true
  res.status(403).json({ success: false, error: { code: 'SYSTEM_ADMIN_REQUIRED', message: 'SystemAdmin access is required.' } })
  return false
}

const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, assignedLocationId: user.assignedLocationId ? String(user.assignedLocationId) : null, assignedAt: user.assignedAt, assignedBy: user.assignedBy ? String(user.assignedBy) : null, status: user.status || 'ACTIVE', isEmailVerified: user.isEmailVerified, isBootstrapAdmin: user.isBootstrapAdmin, createdAt: user.createdAt })

function normalizeBranchCode(value = '') {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20)
}

function publicBranch(location) {
  return {
    id: String(location._id),
    name: location.name || location.location,
    branchCode: location.branchCode || '',
    address: location.address || '',
    city: location.city || '',
    state: location.state || '',
    contactNumber: location.contactNumber || '',
    branchStatus: location.branchStatus || 'ACTIVE',
    category: location.category,
    service: location.service,
    createdAt: location.createdAt,
    updatedAt: location.updatedAt,
  }
}

async function auditAssignment({ manager, oldLocationId, newLocationId, updatedBy, action }) {
  await AssignmentAudit.create({ managerId: manager._id, oldLocationId, newLocationId, updatedBy, action })
  emitManagerLocationUpdated({ managerId: manager._id, oldLocationId, newLocationId, updatedBy })
}

export async function getTelemetry(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const [userAggregation, locationAggregation, tokensIssuedToday] = await Promise.all([
      User.aggregate([{ $group: { _id: null, totalUsers: { $sum: 1 } } }, { $project: { _id: 0, totalUsers: 1 } }]),
      Location.aggregate([{ $group: { _id: '$location' } }, { $count: 'totalLocations' }]),
      Token.countDocuments({ createdAt: { $gte: startOfToday } }),
    ])
    res.json({ success: true, data: { totalUsers: userAggregation[0]?.totalUsers || 0, totalLocations: locationAggregation[0]?.totalLocations || 0, tokensIssuedToday } })
  } catch (error) { next(error) }
}

export async function listUsers(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const users = await User.aggregate([
      { $sort: { isBootstrapAdmin: -1, createdAt: -1 } },
      { $project: { name: 1, email: 1, role: 1, assignedLocationId: 1, isEmailVerified: 1, isBootstrapAdmin: 1, createdAt: 1 } },
    ])
    res.json({ success: true, data: { users: users.map(publicUser) } })
  } catch (error) { next(error) }
}

export async function updateUserRole(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'The selected user is invalid.' } })
    if (!['User', 'Manager'].includes(req.body.role)) return res.status(400).json({ success: false, error: { code: 'INVALID_ROLE', message: 'Role must be User or Manager.' } })
    let assignedLocationId = null
    if (req.body.role === 'Manager') {
      if (!mongoose.isValidObjectId(req.body.assignedLocationId) || !(await Location.exists({ _id: req.body.assignedLocationId }))) return res.status(400).json({ success: false, error: { code: 'BRANCH_ASSIGNMENT_REQUIRED', message: 'Select a valid branch before assigning Manager access.' } })
      assignedLocationId = req.body.assignedLocationId
    }
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'The selected user no longer exists.' } })
    if (user.role === 'SystemAdmin' || user.isBootstrapAdmin) return res.status(403).json({ success: false, error: { code: 'SYSTEM_ADMIN_PROTECTED', message: 'The bootstrap SystemAdmin cannot be modified.' } })
    const oldLocationId = user.assignedLocationId
    user.role = req.body.role
    user.assignedLocationId = assignedLocationId
    user.assignedAt = assignedLocationId ? new Date() : null
    user.assignedBy = req.user._id
    user.status = 'ACTIVE'
    await user.save({ validateBeforeSave: false })
    if (String(oldLocationId || '') !== String(assignedLocationId || '')) {
      await auditAssignment({
        manager: user,
        oldLocationId,
        newLocationId: assignedLocationId,
        updatedBy: req.user._id,
        action: assignedLocationId ? (oldLocationId ? 'CHANGED' : 'ASSIGNED') : 'REMOVED',
      })
    }
    res.json({ success: true, message: `${user.name} is now ${user.role}.`, data: { user: publicUser(user) } })
  } catch (error) { next(error) }
}

export async function listAssignableLocations(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const locations = await Location.aggregate([{ $match: { branchStatus: { $ne: 'INACTIVE' } } }, { $sort: { createdAt: 1 } }, { $group: { _id: '$location', id: { $first: '$_id' }, name: { $first: { $ifNull: ['$name', '$location'] } }, category: { $first: '$category' }, branchCode: { $first: '$branchCode' } } }, { $sort: { name: 1 } }, { $project: { _id: 0, id: { $toString: '$id' }, name: 1, category: 1, branchCode: 1 } }])
    res.json({ success: true, data: { locations } })
  } catch (error) { next(error) }
}

export async function listBranches(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const branches = await Location.aggregate([
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$location',
          id: { $first: '$_id' },
          name: { $first: { $ifNull: ['$name', '$location'] } },
          branchCode: { $first: '$branchCode' },
          address: { $first: '$address' },
          city: { $first: '$city' },
          state: { $first: '$state' },
          contactNumber: { $first: '$contactNumber' },
          branchStatus: { $first: '$branchStatus' },
          category: { $first: '$category' },
          services: { $addToSet: '$service' },
          serviceLocationIds: { $push: '$_id' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
      { $sort: { name: 1 } },
    ])
    const branchIds = branches.map((branch) => branch.id)
    const [managerRows, counterRows] = await Promise.all([
      User.find({ role: 'Manager', assignedLocationId: { $in: branchIds } }).select('name email assignedLocationId status').lean(),
      Counter.aggregate([{ $match: { location: { $in: branchIds } } }, { $group: { _id: '$location', counters: { $sum: 1 }, activeCounters: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } } } }]),
    ])
    const managersByBranch = new Map()
    managerRows.forEach((manager) => {
      const key = String(manager.assignedLocationId)
      managersByBranch.set(key, [...(managersByBranch.get(key) || []), publicUser(manager)])
    })
    const countersByBranch = new Map(counterRows.map((row) => [String(row._id), row]))
    res.json({ success: true, data: { branches: branches.map((branch) => ({
      id: String(branch.id),
      name: branch.name || branch._id,
      branchCode: branch.branchCode || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      contactNumber: branch.contactNumber || '',
      branchStatus: branch.branchStatus || 'ACTIVE',
      category: branch.category,
      services: branch.services,
      managers: managersByBranch.get(String(branch.id)) || [],
      counters: countersByBranch.get(String(branch.id))?.counters || 0,
      activeCounters: countersByBranch.get(String(branch.id))?.activeCounters || 0,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    })) } })
  } catch (error) { next(error) }
}

export async function updateBranch(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_BRANCH_ID', message: 'The selected branch is invalid.' } })
    const branch = await Location.findById(req.params.id).lean()
    if (!branch) return res.status(404).json({ success: false, error: { code: 'BRANCH_NOT_FOUND', message: 'Branch not found.' } })
    const branchLocationIds = await Location.find({ location: branch.location }).distinct('_id')
    const updates = {}
    if (req.body.name) { updates.name = String(req.body.name).trim(); updates.location = updates.name }
    if (req.body.branchCode !== undefined) updates.branchCode = normalizeBranchCode(req.body.branchCode)
    if (req.body.address !== undefined) updates.address = String(req.body.address).trim()
    if (req.body.city !== undefined) updates.city = String(req.body.city).trim()
    if (req.body.state !== undefined) updates.state = String(req.body.state).trim()
    if (req.body.contactNumber !== undefined) updates.contactNumber = String(req.body.contactNumber).trim()
    if (req.body.branchStatus !== undefined) {
      if (!['ACTIVE', 'INACTIVE'].includes(req.body.branchStatus)) return res.status(400).json({ success: false, error: { code: 'INVALID_BRANCH_STATUS', message: 'Branch status must be ACTIVE or INACTIVE.' } })
      updates.branchStatus = req.body.branchStatus
      if (req.body.branchStatus === 'INACTIVE') updates.status = 'Unavailable'
      if (req.body.branchStatus === 'ACTIVE' && branch.status === 'Unavailable') updates.status = 'Available'
    }
    await Location.updateMany({ _id: { $in: branchLocationIds } }, { $set: updates })
    const updated = await Location.findById(req.params.id).lean()
    res.json({ success: true, message: 'Branch updated successfully.', data: { branch: publicBranch(updated) } })
  } catch (error) { next(error) }
}

export async function createLocation(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  let uploadedImage
  try {
    const name = String(req.body.name || '').trim()
    const category = String(req.body.category || '').trim()
    const activeCounters = Number(req.body.activeCounters)
    if (name.length < 3 || !allowedCategories.includes(category) || !Number.isInteger(activeCounters) || activeCounters < 1 || activeCounters > 100) return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION', message: 'Provide a valid name, category, and 1–100 active counters.' } })
    if (!req.file?.buffer) return res.status(400).json({ success: false, error: { code: 'LOCATION_IMAGE_REQUIRED', message: 'Upload a location image or floorplan.' } })

    uploadedImage = await uploadImageBuffer(req.file.buffer)
    const branchCode = normalizeBranchCode(req.body.branchCode) || normalizeBranchCode(name.split(/\s+/).map((part) => part[0]).join('') + Date.now().toString().slice(-3))
    const location = await Location.create({
      name,
      branchCode,
      address: String(req.body.address || '').trim(),
      city: String(req.body.city || '').trim(),
      state: String(req.body.state || '').trim(),
      contactNumber: String(req.body.contactNumber || '').trim(),
      branchStatus: 'ACTIVE',
      location: name,
      category,
      service: String(req.body.service || 'General services').trim(),
      status: 'Available',
      predictedWaitMinutes: 15,
      activeCounters,
      imageUrl: uploadedImage.secure_url,
      imagePublicId: uploadedImage.public_id,
      createdBy: req.user._id,
    })
    res.status(201).json({ success: true, message: 'Service center onboarded successfully.', data: { location } })
  } catch (error) {
    if (uploadedImage?.public_id) await cloudinary.uploader.destroy(uploadedImage.public_id).catch(() => {})
    if (error?.code === 11000) return res.status(409).json({ success: false, error: { code: 'LOCATION_EXISTS', message: 'This service already exists at that location.' } })
    next(error)
  }
}

export async function assignManagerLocation(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'The selected user is invalid.' } })
    if (!mongoose.isValidObjectId(req.body.assignedLocationId)) return res.status(400).json({ success: false, error: { code: 'BRANCH_ASSIGNMENT_REQUIRED', message: 'Select a valid branch.' } })
    const [manager, branch] = await Promise.all([User.findById(req.params.id), Location.findById(req.body.assignedLocationId)])
    if (!manager) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'The selected user no longer exists.' } })
    if (manager.role === 'SystemAdmin' || manager.isBootstrapAdmin) return res.status(403).json({ success: false, error: { code: 'SYSTEM_ADMIN_PROTECTED', message: 'The bootstrap SystemAdmin cannot be modified.' } })
    if (!branch || branch.branchStatus === 'INACTIVE') return res.status(400).json({ success: false, error: { code: 'INVALID_BRANCH', message: 'Select an active branch.' } })
    const oldLocationId = manager.assignedLocationId
    manager.role = 'Manager'
    manager.assignedLocationId = branch._id
    manager.assignedAt = new Date()
    manager.assignedBy = req.user._id
    manager.status = 'ACTIVE'
    await manager.save({ validateBeforeSave: false })
    await auditAssignment({ manager, oldLocationId, newLocationId: branch._id, updatedBy: req.user._id, action: oldLocationId ? 'CHANGED' : 'ASSIGNED' })
    res.json({ success: true, message: `${manager.name} is assigned to ${branch.name || branch.location}.`, data: { user: publicUser(manager) } })
  } catch (error) { next(error) }
}

export async function removeManagerAssignment(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, error: { code: 'INVALID_USER_ID', message: 'The selected user is invalid.' } })
    const manager = await User.findById(req.params.id)
    if (!manager) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'The selected user no longer exists.' } })
    if (manager.role === 'SystemAdmin' || manager.isBootstrapAdmin) return res.status(403).json({ success: false, error: { code: 'SYSTEM_ADMIN_PROTECTED', message: 'The bootstrap SystemAdmin cannot be modified.' } })
    const oldLocationId = manager.assignedLocationId
    manager.role = 'User'
    manager.assignedLocationId = null
    manager.assignedAt = null
    manager.assignedBy = req.user._id
    await manager.save({ validateBeforeSave: false })
    await auditAssignment({ manager, oldLocationId, newLocationId: null, updatedBy: req.user._id, action: 'REMOVED' })
    res.json({ success: true, message: `${manager.name} is now a standard User.`, data: { user: publicUser(manager) } })
  } catch (error) { next(error) }
}

export async function listManagerAssignments(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const managers = await User.find({ role: 'Manager' }).populate('assignedLocationId', 'name location branchCode city state branchStatus').sort({ assignedAt: -1 }).lean()
    res.json({ success: true, data: { managers: managers.map((manager) => ({ ...publicUser(manager), assignedLocation: manager.assignedLocationId ? publicBranch(manager.assignedLocationId) : null })) } })
  } catch (error) { next(error) }
}

export async function getModelStatus(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [config, performance] = await Promise.all([
      SystemConfig.findOneAndUpdate({ key: 'prediction' }, { $setOnInsert: { key: 'prediction' } }, { returnDocument: 'after', upsert: true }),
      PredictionModel.findOne({ name: 'wait-time-regression' }).lean(),
    ])
    const [todayMetrics, history] = await Promise.all([
      evaluatePredictionAccuracy({ from: today, modelVersion: performance?.version || config.modelVersion }),
      getAccuracyHistory({ days: 30 }),
    ])
    res.json({ success: true, data: {
      modelVersion: performance?.version || config.modelVersion,
      modelType: performance?.modelType || 'fallback-average',
      trainedAt: performance?.trainedAt || null,
      congestionFactor: config.congestionFactor,
      sampleSize: performance?.sampleSize || 0,
      metrics: performance?.metrics || todayMetrics,
      todayMetrics,
      accuracyHistory: history,
      previousVersion: performance?.previousVersion || null,
      training: trainingState,
    } })
  } catch (error) { next(error) }
}

export async function updateModelConfig(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const congestionFactor = Number(req.body.congestionFactor)
    if (!Number.isFinite(congestionFactor) || congestionFactor < 0.5 || congestionFactor > 3) return res.status(400).json({ success: false, error: { code: 'INVALID_CONGESTION_FACTOR', message: 'Congestion factor must be between 0.5 and 3.' } })
    const config = await SystemConfig.findOneAndUpdate({ key: 'prediction' }, { $set: { congestionFactor, updatedBy: req.user._id }, $setOnInsert: { key: 'prediction' } }, { returnDocument: 'after', upsert: true, runValidators: true })
    res.json({ success: true, message: 'Prediction override updated.', data: { congestionFactor: config.congestionFactor } })
  } catch (error) { next(error) }
}

export async function triggerRetraining(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    if (trainingState.status === 'running') return res.status(409).json({ success: false, error: { code: 'TRAINING_ALREADY_RUNNING', message: 'Model retraining is already running.' } })
    Object.assign(trainingState, { status: 'running', startedAt: new Date(), completedAt: null, output: '', error: null })
    trainPredictionModel({ trainedBy: req.user._id })
      .then((result) => {
        Object.assign(trainingState, {
          status: result.trained ? 'completed' : 'failed',
          completedAt: new Date(),
          output: result.trained ? `Model ${result.model.version} trained on ${result.model.sampleSize} samples.` : result.reason,
          error: result.trained ? null : result.reason,
        })
      })
      .catch((error) => Object.assign(trainingState, { status: 'failed', completedAt: new Date(), error: error.message }))
    res.status(202).json({ success: true, message: 'Prediction model retraining started.', data: { training: trainingState } })
  } catch (error) { next(error) }
}

export async function getPredictionAccuracy(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const [summary, comparisons] = await Promise.all([
      evaluatePredictionAccuracy({ from: since }),
      PredictionHistory.find({ completedAt: { $gte: since } })
        .sort({ completedAt: -1 })
        .limit(50)
        .select('tokenId serviceType predictedWaitTime actualWaitTime predictionError absoluteError completedAt')
        .lean(),
    ])
    res.json({ success: true, data: { summary, comparisons } })
  } catch (error) { next(error) }
}

export async function getAnalyticsCharts(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const [peakRushHours, weeklyTraffic, sectorEfficiency] = await Promise.all([
      Token.aggregate([{ $group: { _id: { $hour: '$createdAt' }, tokens: { $sum: 1 }, averageWaitMinutes: { $avg: '$estimatedMinutes' } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, hour: '$_id', tokens: 1, averageWaitMinutes: { $round: ['$averageWaitMinutes', 1] } } }]),
      Token.aggregate([{ $group: { _id: { $dayOfWeek: '$createdAt' }, tokens: { $sum: 1 } } }, { $sort: { _id: 1 } }, { $project: { _id: 0, dayOfWeek: '$_id', tokens: 1 } }]),
      Token.aggregate([{ $group: { _id: '$category', tokens: { $sum: 1 }, averageProcessingMinutes: { $avg: { $ifNull: ['$processingMinutes', '$estimatedMinutes'] } } } }, { $sort: { averageProcessingMinutes: 1 } }, { $project: { _id: 0, category: '$_id', tokens: 1, averageProcessingMinutes: { $round: ['$averageProcessingMinutes', 1] } } }]),
    ])
    res.json({ success: true, data: { peakRushHours, weeklyTraffic, sectorEfficiency } })
  } catch (error) { next(error) }
}

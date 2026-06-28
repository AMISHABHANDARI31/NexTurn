import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import cloudinary from '../config/cloudinary.js'
import Location from '../models/locationModel.js'
import SystemConfig from '../models/systemConfigModel.js'
import Token from '../models/tokenModel.js'
import User from '../models/userModel.js'
import { uploadImageBuffer } from '../utils/cloudinaryUpload.js'

const allowedCategories = ['Healthcare', 'Banking', 'Education & College', 'Government & Identity']
const trainingState = { status: 'idle', startedAt: null, completedAt: null, output: '', error: null }

function requireSystemAdmin(req, res) {
  if (req.user?.role === 'SystemAdmin') return true
  res.status(403).json({ success: false, error: { code: 'SYSTEM_ADMIN_REQUIRED', message: 'SystemAdmin access is required.' } })
  return false
}

const publicUser = (user) => ({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, assignedLocationId: user.assignedLocationId ? String(user.assignedLocationId) : null, isEmailVerified: user.isEmailVerified, isBootstrapAdmin: user.isBootstrapAdmin, createdAt: user.createdAt })

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
    user.role = req.body.role
    user.assignedLocationId = assignedLocationId
    await user.save({ validateBeforeSave: false })
    res.json({ success: true, message: `${user.name} is now ${user.role}.`, data: { user: publicUser(user) } })
  } catch (error) { next(error) }
}

export async function listAssignableLocations(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const locations = await Location.aggregate([{ $sort: { createdAt: 1 } }, { $group: { _id: '$location', id: { $first: '$_id' }, name: { $first: '$location' }, category: { $first: '$category' } } }, { $sort: { name: 1 } }, { $project: { _id: 0, id: { $toString: '$id' }, name: 1, category: 1 } }])
    res.json({ success: true, data: { locations } })
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
    const location = await Location.create({
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

export async function getModelStatus(req, res, next) {
  if (!requireSystemAdmin(req, res)) return
  try {
    const [config, performance] = await Promise.all([
      SystemConfig.findOneAndUpdate({ key: 'prediction' }, { $setOnInsert: { key: 'prediction' } }, { returnDocument: 'after', upsert: true }),
      Token.aggregate([
        { $match: { status: 'completed', processingMinutes: { $ne: null } } },
        { $project: { absoluteError: { $abs: { $subtract: ['$processingMinutes', '$estimatedMinutes'] } } } },
        { $group: { _id: null, meanAbsoluteError: { $avg: '$absoluteError' }, sampleSize: { $sum: 1 } } },
      ]),
    ])
    res.json({ success: true, data: { modelVersion: config.modelVersion, congestionFactor: config.congestionFactor, meanAbsoluteError: Number((performance[0]?.meanAbsoluteError || 0).toFixed(2)), sampleSize: performance[0]?.sampleSize || 0, training: trainingState } })
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
    const historicalTokens = await Token.countDocuments()
    const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '../integrations/prediction/retrain.py')
    const child = spawn(process.env.PYTHON_EXECUTABLE || 'python', [script, String(historicalTokens)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    Object.assign(trainingState, { status: 'running', startedAt: new Date(), completedAt: null, output: '', error: null })
    child.stdout.on('data', (data) => { trainingState.output = `${trainingState.output}${data}`.slice(-2000) })
    child.stderr.on('data', (data) => { trainingState.error = `${trainingState.error || ''}${data}`.slice(-2000) })
    child.on('error', (error) => Object.assign(trainingState, { status: 'failed', completedAt: new Date(), error: error.message }))
    child.on('close', (code) => Object.assign(trainingState, { status: code === 0 ? 'completed' : 'failed', completedAt: new Date(), error: code === 0 ? null : trainingState.error || `Python exited with code ${code}` }))
    res.status(202).json({ success: true, message: 'Prediction model retraining started.', data: { training: trainingState } })
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

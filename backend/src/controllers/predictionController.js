import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import mongoose from 'mongoose'
import Counter from '../models/counterModel.js'
import Location from '../models/locationModel.js'
import SystemConfig from '../models/systemConfigModel.js'
import Token from '../models/tokenModel.js'

const helperPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../integrations/prediction/predict.py')

export async function getCorePrediction(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.locationId)) return res.status(400).json({ success: false, error: { code: 'INVALID_LOCATION_ID', message: 'The location identifier is invalid.' } })
    const location = await Location.findById(req.params.locationId).lean()
    if (!location) return res.status(404).json({ success: false, error: { code: 'LOCATION_NOT_FOUND', message: 'Service location not found.' } })

    const branchScope = req.query.scope === 'branch' && req.user.role === 'Manager' && String(req.user.assignedLocationId) === String(location._id)
    const locationIds = branchScope ? await Location.find({ location: location.location }).distinct('_id') : [location._id]
    const [activeCounterCount, activeTokens, serviceAggregation, config] = await Promise.all([
      Counter.countDocuments({ location: location._id, status: 'Active' }),
      Token.find({ location: { $in: locationIds }, status: { $in: ['waiting', 'serving'] } }).select('_id user priority status createdAt').sort({ createdAt: 1 }).lean(),
      Token.aggregate([{ $match: { location: { $in: locationIds }, status: 'completed', processingMinutes: { $gt: 0 } } }, { $group: { _id: null, averageMinutes: { $avg: '$processingMinutes' } } }]),
      SystemConfig.findOne({ key: 'prediction' }).lean(),
    ])

    const activeCounters = Math.max(1, activeCounterCount || 0)
    const averageServiceDurationMinutes = Math.max(1, serviceAggregation[0]?.averageMinutes || location.defaultServiceMinutes || 15)
    const congestionFactor = Math.min(3, Math.max(0.5, config?.congestionFactor || 1))
    const waitingTokens = activeTokens.filter((token) => token.status === 'waiting')
    const requestedTokenId = mongoose.isValidObjectId(req.query.tokenId) ? String(req.query.tokenId) : null
    const currentToken = requestedTokenId
      ? activeTokens.find((token) => String(token._id) === requestedTokenId && token.user && String(token.user) === String(req.user._id))
      : activeTokens.find((token) => token.user && String(token.user) === String(req.user._id))
    const peopleAhead = currentToken
      ? currentToken.status === 'serving'
        ? 0
        : waitingTokens.filter((token) => {
          if (String(token._id) === String(currentToken._id)) return false
          if (currentToken.priority === 'high') return token.priority === 'high' && token.createdAt < currentToken.createdAt
          return token.priority === 'high' || (token.priority !== 'high' && token.createdAt < currentToken.createdAt)
        }).length
      : waitingTokens.length

    // Little's Law-inspired operational estimate requested by SQPS.
    const baselineWaitMinutes = ((peopleAhead + 1) / activeCounters) * averageServiceDurationMinutes
    const estimatedWaitMinutes = Math.max(1, Math.round(baselineWaitMinutes * congestionFactor))
    const backlogClearanceMinutes = waitingTokens.length === 0 ? 0 : Math.ceil((waitingTokens.length / activeCounters) * averageServiceDurationMinutes * congestionFactor)
    const now = new Date()
    const confidence = await runConfidenceModel(waitingTokens.length, now.getHours(), now.getDay())

    res.json({ success: true, data: {
      locationId: String(location._id), locationName: location.location,
      estimatedWaitMinutes, peopleAhead, activeCounters, queueLength: waitingTokens.length,
      averageServiceDurationMinutes: Number(averageServiceDurationMinutes.toFixed(1)),
      backlogClearanceMinutes, congestionFactor,
      predictionConfidenceScore: confidence.score,
      predictionConfidenceText: confidenceText(confidence.score),
      predictionSource: confidence.source,
      calculatedAt: now.toISOString(),
    } })
  } catch (error) { next(error) }
}

function confidenceText(score) {
  if (score >= 90) return 'Very high confidence'
  if (score >= 80) return 'High confidence'
  if (score >= 65) return 'Moderate confidence'
  return 'Limited confidence — fallback estimate'
}

function runConfidenceModel(queueLength, hourOfDay, dayOfWeek) {
  return new Promise((resolve) => {
    const child = spawn(process.env.PYTHON_EXECUTABLE || 'python', [helperPath, String(queueLength), String(hourOfDay), String(dayOfWeek)], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''; let settled = false
    const finish = (value) => { if (settled) return; settled = true; clearTimeout(timer); resolve(value) }
    child.stdout.on('data', (data) => { output += data.toString() })
    child.on('error', () => finish({ score: fallbackConfidence(queueLength), source: 'deterministic-fallback' }))
    child.on('close', (code) => {
      if (code !== 0) return finish({ score: fallbackConfidence(queueLength), source: 'deterministic-fallback' })
      try {
        const parsed = JSON.parse(output.trim().split(/\r?\n/).at(-1))
        finish({ score: Math.min(99, Math.max(50, Math.round(Number(parsed.confidenceScore)))), source: parsed.source || 'pytorch' })
      } catch { finish({ score: fallbackConfidence(queueLength), source: 'deterministic-fallback' }) }
    })
    const timer = setTimeout(() => { child.kill(); finish({ score: fallbackConfidence(queueLength), source: 'timeout-fallback' }) }, 5_000)
  })
}

const fallbackConfidence = (queueLength) => Math.max(62, Math.min(92, 92 - Math.floor(queueLength / 4)))

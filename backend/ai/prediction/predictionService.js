import Counter from '../../src/models/counterModel.js'
import Location from '../../src/models/locationModel.js'
import PredictionHistory from '../../src/models/predictionHistoryModel.js'
import PredictionModel from '../../src/models/predictionModelModel.js'
import SystemConfig from '../../src/models/systemConfigModel.js'
import Token from '../../src/models/tokenModel.js'
import { vectorize } from '../training/trainModel.js'

function dot(weights = [], vector = []) {
  return vector.reduce((sum, value, index) => sum + value * (weights[index] || 0), 0)
}

function confidenceFromMetrics(model, rows, queueLength) {
  const sampleScore = Math.min(25, (model?.sampleSize || rows.length || 0) / 20)
  const errorPenalty = Math.min(35, Number(model?.metrics?.mae || 8) * 2)
  const queuePenalty = Math.min(10, queueLength / 5)
  return Math.max(45, Math.min(96, Math.round(82 + sampleScore - errorPenalty - queuePenalty)))
}

export async function predictQueue({ locationId, userId = null, tokenId = null, branchScope = false } = {}) {
  const location = await Location.findById(locationId).lean()
  if (!location) return null

  const locationIds = branchScope ? await Location.find({ location: location.location }).distinct('_id') : [location._id]
  const [activeCounterCount, activeTokens, recentHistory, config, model] = await Promise.all([
    Counter.countDocuments({ location: location._id, status: 'Active' }),
    Token.find({ location: { $in: locationIds }, status: { $in: ['waiting', 'serving'] } }).select('_id user priority status createdAt estimatedMinutes').sort({ priority: -1, createdAt: 1 }).lean(),
    PredictionHistory.find({ locationId: { $in: locationIds } }).sort({ completedAt: -1 }).limit(200).lean(),
    SystemConfig.findOneAndUpdate({ key: 'prediction' }, { $setOnInsert: { key: 'prediction' } }, { upsert: true, returnDocument: 'after' }).lean(),
    PredictionModel.findOne({ name: 'wait-time-regression', status: 'active' }).lean(),
  ])

  const waitingTokens = activeTokens.filter((token) => token.status === 'waiting')
  const currentToken = tokenId
    ? activeTokens.find((token) => String(token._id) === String(tokenId) && (!userId || String(token.user) === String(userId)))
    : userId
      ? activeTokens.find((token) => token.user && String(token.user) === String(userId))
      : null
  const peopleAhead = currentToken
    ? currentToken.status === 'serving'
      ? 0
      : waitingTokens.filter((token) => {
        if (String(token._id) === String(currentToken._id)) return false
        if (currentToken.priority === 'high') return token.priority === 'high' && token.createdAt < currentToken.createdAt
        return token.priority === 'high' || (token.priority !== 'high' && token.createdAt < currentToken.createdAt)
      }).length
    : waitingTokens.length

  const activeCounters = Math.max(1, activeCounterCount || 0)
  const historicalServiceDuration = recentHistory.length
    ? recentHistory.reduce((sum, row) => sum + Number(row.actualServiceDuration || 0), 0) / recentHistory.length
    : location.defaultServiceMinutes || 15
  const previousDelay = recentHistory.length
    ? recentHistory.slice(0, 20).reduce((sum, row) => sum + Number(row.predictionError || 0), 0) / Math.min(20, recentHistory.length)
    : 0
  const now = new Date()
  const categoryMap = new Map(Object.entries(model?.categoryMap || {}))
  const vector = vectorize({
    queueLengthAtIssue: peopleAhead + 1,
    historicalServiceDuration,
    hourOfDay: now.getHours(),
    dayOfWeek: now.getDay(),
    serviceCategory: location.category,
    activeCountersAtIssue: activeCounters,
    previousDelay,
  }, categoryMap)
  const multiplier = Math.min(3, Math.max(0.5, Number(config?.congestionFactor || 1)))

  const fallbackWait = ((peopleAhead + 1) / activeCounters) * historicalServiceDuration * multiplier
  const fallbackService = historicalServiceDuration
  const modelUsable = model?.waitWeights?.length === vector.length && model?.serviceWeights?.length === vector.length && model.sampleSize >= 5
  const rawWait = modelUsable ? dot(model.waitWeights, vector) * multiplier : fallbackWait
  const rawService = modelUsable ? dot(model.serviceWeights, vector) : fallbackService
  const predictedWaitTime = Math.max(1, Math.round(modelUsable ? (rawWait * 0.7 + fallbackWait * 0.3) : fallbackWait))
  const predictedServiceDuration = Math.max(1, Math.round(modelUsable ? (rawService * 0.7 + fallbackService * 0.3) : fallbackService))
  const confidenceScore = modelUsable ? confidenceFromMetrics(model, recentHistory, waitingTokens.length) : Math.max(45, Math.min(78, 78 - Math.floor(waitingTokens.length / 4)))

  return {
    locationId: String(location._id),
    locationName: location.location,
    service: location.service,
    serviceCategory: location.category,
    predictedWaitTime,
    predictedServiceDuration,
    estimatedWaitMinutes: predictedWaitTime,
    peopleAhead,
    activeCounters,
    queueLength: waitingTokens.length,
    historicalServiceDuration: Number(historicalServiceDuration.toFixed(1)),
    backlogClearanceMinutes: waitingTokens.length === 0 ? 0 : Math.ceil((waitingTokens.length / activeCounters) * predictedServiceDuration),
    congestionFactor: multiplier,
    confidenceScore,
    predictionConfidenceScore: confidenceScore,
    predictionConfidenceText: confidenceScore >= 90 ? 'Very high confidence' : confidenceScore >= 80 ? 'High confidence' : confidenceScore >= 65 ? 'Moderate confidence' : 'Low confidence — using fallback averages',
    predictionSource: modelUsable ? 'trained-linear-regression' : 'historical-fallback',
    modelVersion: model?.version || 'fallback',
    lastUpdated: now.toISOString(),
    calculatedAt: now.toISOString(),
  }
}

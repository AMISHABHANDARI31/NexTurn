import Counter from '../../src/models/counterModel.js'
import PredictionHistory from '../../src/models/predictionHistoryModel.js'
import Token from '../../src/models/tokenModel.js'

function minutesBetween(start, end) {
  if (!start || !end) return 0
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60_000)
}

export async function buildHistoryFromCompletedToken(token) {
  if (!token || token.status !== 'completed' || !token.completedAt) return null

  const tokenIssuedTime = token.createdAt || token._id.getTimestamp?.() || token.completedAt
  const serviceStartTime = token.servingAt || token.calledAt || token.predictedStartTime || tokenIssuedTime
  const serviceEndTime = token.completedAt
  const actualWaitTime = minutesBetween(tokenIssuedTime, serviceStartTime)
  const actualServiceDuration = token.processingMinutes ?? minutesBetween(serviceStartTime, serviceEndTime)
  const predictionError = actualWaitTime - Number(token.estimatedMinutes || 0)
  const issuedAt = new Date(tokenIssuedTime)

  const [queueLengthAtIssue, activeCountersAtIssue] = await Promise.all([
    Token.countDocuments({ location: token.location, createdAt: { $lte: issuedAt }, status: { $in: ['waiting', 'serving', 'completed'] } }),
    Counter.countDocuments({ location: token.location, status: 'Active' }),
  ])

  return PredictionHistory.findOneAndUpdate(
    { tokenId: token._id },
    {
      $set: {
        tokenId: token._id,
        serviceType: token.service,
        serviceCategory: token.category,
        locationId: token.location,
        counterId: token.counter || null,
        staffId: token.createdByManager || null,
        arrivalTime: tokenIssuedTime,
        tokenIssuedTime,
        serviceStartTime,
        serviceEndTime,
        actualServiceDuration,
        predictedWaitTime: Number(token.estimatedMinutes || 0),
        actualWaitTime,
        predictionError,
        absoluteError: Math.abs(predictionError),
        activeCountersAtIssue: Math.max(1, activeCountersAtIssue || 1),
        queueLengthAtIssue,
        hourOfDay: issuedAt.getHours(),
        dayOfWeek: issuedAt.getDay(),
        completedAt: serviceEndTime,
      },
    },
    { upsert: true, returnDocument: 'after' },
  )
}

export async function ensureHistoricalDataset({ limit = 5000 } = {}) {
  const completedTokens = await Token.find({ status: 'completed', completedAt: { $ne: null } })
    .sort({ completedAt: -1 })
    .limit(limit)
  const results = []
  for (const token of completedTokens) {
    const history = await buildHistoryFromCompletedToken(token)
    if (history) results.push(history)
  }
  return results
}

export async function getTrainingRows({ limit = 10000 } = {}) {
  await ensureHistoricalDataset({ limit })
  return PredictionHistory.find()
    .sort({ completedAt: -1 })
    .limit(limit)
    .lean()
}

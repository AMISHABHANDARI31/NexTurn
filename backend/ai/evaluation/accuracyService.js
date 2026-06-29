import PredictionHistory from '../../src/models/predictionHistoryModel.js'
import PredictionMetric from '../../src/models/predictionMetricModel.js'

export function calculateMetrics(rows = []) {
  if (!rows.length) return { totalPredictions: 0, mae: 0, rmse: 0, averageError: 0, accuracyPercentage: 0 }
  const errors = rows.map((row) => Number(row.predictionError || 0))
  const abs = errors.map(Math.abs)
  const mae = abs.reduce((sum, value) => sum + value, 0) / rows.length
  const rmse = Math.sqrt(errors.reduce((sum, value) => sum + (value ** 2), 0) / rows.length)
  const averageActual = rows.reduce((sum, row) => sum + Math.max(1, Number(row.actualWaitTime || 0)), 0) / rows.length
  const accuracyPercentage = Math.max(0, Math.min(100, 100 - ((mae / Math.max(1, averageActual)) * 100)))
  return {
    totalPredictions: rows.length,
    averageError: Number((errors.reduce((sum, value) => sum + value, 0) / rows.length).toFixed(2)),
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    accuracyPercentage: Number(accuracyPercentage.toFixed(1)),
  }
}

export async function evaluatePredictionAccuracy({ from, to, modelVersion = 'current', scope = 'daily' } = {}) {
  const match = {}
  if (from || to) match.completedAt = {}
  if (from) match.completedAt.$gte = from
  if (to) match.completedAt.$lte = to
  const rows = await PredictionHistory.find(match).lean()
  const metrics = calculateMetrics(rows)
  const date = new Date(from || new Date())
  date.setHours(0, 0, 0, 0)
  await PredictionMetric.findOneAndUpdate(
    { date, scope },
    { $set: { ...metrics, date, scope, modelVersion } },
    { upsert: true, returnDocument: 'after' },
  )
  return metrics
}

export async function getAccuracyHistory({ days = 30 } = {}) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return PredictionMetric.find({ date: { $gte: since } }).sort({ date: 1 }).lean()
}

import PredictionModel from '../../src/models/predictionModelModel.js'
import { calculateMetrics } from '../evaluation/accuracyService.js'
import { getTrainingRows } from './datasetBuilder.js'

const features = ['bias', 'queueLength', 'historicalDuration', 'hourSin', 'hourCos', 'daySin', 'dayCos', 'categoryCode', 'activeCounters', 'previousDelay']

function categoryMapFromRows(rows) {
  const categories = [...new Set(rows.map((row) => row.serviceCategory || 'General'))].sort()
  return new Map(categories.map((category, index) => [category, index / Math.max(1, categories.length - 1)]))
}

export function vectorize(row, categoryMap = new Map()) {
  const hour = Number(row.hourOfDay ?? new Date(row.tokenIssuedTime || Date.now()).getHours())
  const day = Number(row.dayOfWeek ?? new Date(row.tokenIssuedTime || Date.now()).getDay())
  return [
    1,
    Number(row.queueLengthAtIssue || 0),
    Number(row.actualServiceDuration || row.historicalServiceDuration || 15),
    Math.sin((2 * Math.PI * hour) / 24),
    Math.cos((2 * Math.PI * hour) / 24),
    Math.sin((2 * Math.PI * day) / 7),
    Math.cos((2 * Math.PI * day) / 7),
    categoryMap.get(row.serviceCategory || row.category || 'General') ?? 0,
    Math.max(1, Number(row.activeCountersAtIssue || row.activeCounters || 1)),
    Number(row.previousDelay || row.predictionError || 0),
  ]
}

function predictWithWeights(weights, vector) {
  return vector.reduce((sum, value, index) => sum + value * (weights[index] || 0), 0)
}

function trainLinearRegression(rows, targetKey, categoryMap) {
  const weights = Array(features.length).fill(0)
  const learningRate = 0.00025
  const epochs = Math.min(700, Math.max(150, rows.length * 8))

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (const row of rows) {
      const x = vectorize(row, categoryMap)
      const target = Number(row[targetKey] || 0)
      const predicted = predictWithWeights(weights, x)
      const error = predicted - target
      for (let index = 0; index < weights.length; index += 1) {
        weights[index] -= learningRate * error * x[index]
      }
    }
  }

  return weights.map((value) => Number(value.toFixed(6)))
}

export async function trainPredictionModel({ trainedBy = null, limit = 10000 } = {}) {
  const rows = await getTrainingRows({ limit })
  if (rows.length < 5) {
    return { trained: false, reason: 'Need at least 5 completed tokens to train a data-driven model.', sampleSize: rows.length }
  }

  const categoryMap = categoryMapFromRows(rows)
  const waitWeights = trainLinearRegression(rows, 'actualWaitTime', categoryMap)
  const serviceWeights = trainLinearRegression(rows, 'actualServiceDuration', categoryMap)
  const predictedRows = rows.map((row) => {
    const x = vectorize(row, categoryMap)
    return { ...row, predictionError: predictWithWeights(waitWeights, x) - Number(row.actualWaitTime || 0) }
  })
  const metrics = calculateMetrics(predictedRows)
  const previous = await PredictionModel.findOne({ name: 'wait-time-regression' }).lean()
  const version = `sqps-ai-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`

  const model = await PredictionModel.findOneAndUpdate(
    { name: 'wait-time-regression' },
    {
      $set: {
        version,
        modelType: 'linear-regression',
        status: 'active',
        trainedAt: new Date(),
        sampleSize: rows.length,
        features,
        waitWeights,
        serviceWeights,
        categoryMap: Object.fromEntries(categoryMap),
        metrics,
        trainedBy,
        previousVersion: previous ? { version: previous.version, metrics: previous.metrics, trainedAt: previous.trainedAt } : undefined,
      },
      $setOnInsert: { name: 'wait-time-regression' },
    },
    { upsert: true, returnDocument: 'after' },
  )

  return { trained: true, model }
}

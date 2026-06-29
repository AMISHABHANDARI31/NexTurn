import mongoose from 'mongoose'

const predictionMetricSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  scope: { type: String, enum: ['daily', 'training'], default: 'daily', index: true },
  modelVersion: { type: String, default: 'fallback' },
  totalPredictions: { type: Number, default: 0 },
  averageError: { type: Number, default: 0 },
  mae: { type: Number, default: 0 },
  rmse: { type: Number, default: 0 },
  accuracyPercentage: { type: Number, default: 0 },
}, { timestamps: true, versionKey: false })

predictionMetricSchema.index({ date: 1, scope: 1 }, { unique: true })

export default mongoose.models.PredictionMetric || mongoose.model('PredictionMetric', predictionMetricSchema)

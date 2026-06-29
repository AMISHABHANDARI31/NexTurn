import mongoose from 'mongoose'

const predictionHistorySchema = new mongoose.Schema({
  tokenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true, unique: true, index: true },
  serviceType: { type: String, required: true, trim: true, index: true },
  serviceCategory: { type: String, required: true, trim: true, index: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  counterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', default: null, index: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  arrivalTime: { type: Date, required: true },
  tokenIssuedTime: { type: Date, required: true },
  serviceStartTime: { type: Date, default: null },
  serviceEndTime: { type: Date, required: true },
  actualServiceDuration: { type: Number, required: true, min: 0 },
  predictedWaitTime: { type: Number, required: true, min: 0 },
  actualWaitTime: { type: Number, required: true, min: 0 },
  predictionError: { type: Number, required: true },
  absoluteError: { type: Number, required: true, min: 0 },
  activeCountersAtIssue: { type: Number, default: 1, min: 0 },
  queueLengthAtIssue: { type: Number, default: 0, min: 0 },
  hourOfDay: { type: Number, min: 0, max: 23, index: true },
  dayOfWeek: { type: Number, min: 0, max: 6, index: true },
  completedAt: { type: Date, required: true, index: true },
}, { timestamps: true, versionKey: false })

predictionHistorySchema.index({ locationId: 1, completedAt: -1 })
predictionHistorySchema.index({ serviceCategory: 1, completedAt: -1 })

export default mongoose.models.PredictionHistory || mongoose.model('PredictionHistory', predictionHistorySchema)

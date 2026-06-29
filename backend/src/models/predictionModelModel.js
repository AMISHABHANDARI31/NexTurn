import mongoose from 'mongoose'

const predictionModelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, default: 'wait-time-regression' },
  version: { type: String, required: true },
  modelType: { type: String, default: 'linear-regression' },
  status: { type: String, enum: ['training', 'active', 'failed'], default: 'active' },
  trainedAt: { type: Date, default: Date.now },
  sampleSize: { type: Number, default: 0 },
  features: { type: [String], default: [] },
  waitWeights: { type: [Number], default: [] },
  serviceWeights: { type: [Number], default: [] },
  categoryMap: { type: Map, of: Number, default: {} },
  metrics: {
    mae: { type: Number, default: null },
    rmse: { type: Number, default: null },
    accuracyPercentage: { type: Number, default: null },
  },
  previousVersion: {
    version: String,
    metrics: mongoose.Schema.Types.Mixed,
    trainedAt: Date,
  },
  trainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false })

export default mongoose.models.PredictionModel || mongoose.model('PredictionModel', predictionModelSchema)

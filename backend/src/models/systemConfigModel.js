import mongoose from 'mongoose'

const systemConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true, default: 'prediction' },
  congestionFactor: { type: Number, min: 0.5, max: 3, default: 1 },
  modelVersion: { type: String, default: 'sqps-demo-v1' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, versionKey: false })

export default mongoose.model('SystemConfig', systemConfigSchema)

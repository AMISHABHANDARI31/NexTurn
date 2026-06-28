import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  name: { type: String, required: true, trim: true },
  number: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['Active', 'Break', 'Closed'], default: 'Closed', index: true },
  lastStatusChangedAt: { type: Date, default: Date.now },
}, { timestamps: true, versionKey: false })

counterSchema.index({ location: 1, number: 1 }, { unique: true })
export default mongoose.model('Counter', counterSchema)

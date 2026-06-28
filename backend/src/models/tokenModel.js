import mongoose from 'mongoose'

const tokenSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdByManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  counter: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', default: null, index: true },
  service: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  phone: { type: String, required: true },
  accessibility: { type: Boolean, default: false },
  priority: { type: String, enum: ['standard', 'high'], default: 'standard', index: true },
  estimatedMinutes: { type: Number, required: true, min: 0 },
  processingMinutes: { type: Number, default: null, min: 0 },
  status: { type: String, enum: ['waiting', 'serving', 'completed', 'cancelled'], default: 'waiting', index: true },
  servingAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false })

export default mongoose.model('Token', tokenSchema)

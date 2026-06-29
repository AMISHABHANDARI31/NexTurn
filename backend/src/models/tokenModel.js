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
  predictedStartTime: { type: Date, default: null, index: true },
  predictedCompletionTime: { type: Date, default: null, index: true },
  serviceDuration: { type: Number, default: null, min: 0 },
  autoProcessed: { type: Boolean, default: false, index: true },
  processingMinutes: { type: Number, default: null, min: 0 },
  status: { type: String, enum: ['waiting', 'serving', 'completed', 'cancelled'], default: 'waiting', index: true },
  calledAt: { type: Date, default: null },
  servingAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null, trim: true, maxlength: 300 },
  cancelledBy: { type: String, enum: ['USER', 'MANAGER', 'SYSTEM', null], default: null },
}, { timestamps: true, versionKey: false })

tokenSchema.index({ location: 1, status: 1, createdAt: 1 })
tokenSchema.index({ user: 1, status: 1, createdAt: -1 })
tokenSchema.index({ counter: 1, status: 1 })

export default mongoose.model('Token', tokenSchema)

import mongoose from 'mongoose'

const authAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  action: { type: String, required: true, index: true },
  ip: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  attempts: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
  lastRequestTime: { type: Date, default: Date.now },
  blockedUntil: { type: Date, default: null, index: true },
}, { timestamps: true, versionKey: false })

authAttemptSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 })

export default mongoose.models.AuthAttempt || mongoose.model('AuthAttempt', authAttemptSchema)

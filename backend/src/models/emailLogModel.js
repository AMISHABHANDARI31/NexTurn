import mongoose from 'mongoose'

const emailLogSchema = new mongoose.Schema({
  to: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  template: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'],
    default: 'PENDING',
    index: true,
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  nextAttemptAt: { type: Date, default: Date.now, index: true },
  sentAt: Date,
  failedAt: Date,
  lastError: { type: String, trim: true },
  messageId: { type: String, trim: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

emailLogSchema.index({ status: 1, nextAttemptAt: 1 })
emailLogSchema.index({ to: 1, createdAt: -1 })

export default mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema)

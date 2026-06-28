import mongoose from 'mongoose'

const locationSchema = new mongoose.Schema({
  service: { type: String, required: true, trim: true, default: 'General services' },
  location: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true, index: true },
  status: { type: String, enum: ['Available', 'Busy', 'Unavailable'], default: 'Available' },
  predictedWaitMinutes: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, default: null },
  imagePublicId: { type: String, default: null, select: false },
  activeCounters: { type: Number, default: 1, min: 1, max: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  businessHours: {
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '17:00' },
  },
  defaultServiceMinutes: { type: Number, default: 15, min: 1, max: 240 },
  scheduleImageUrl: { type: String, default: null },
  scheduleImagePublicId: { type: String, default: null, select: false },
}, { timestamps: true, versionKey: false })

locationSchema.index({ service: 1, location: 1 }, { unique: true })

export default mongoose.model('Location', locationSchema)

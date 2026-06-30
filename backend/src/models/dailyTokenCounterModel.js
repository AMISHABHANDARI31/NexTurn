import mongoose from 'mongoose'

const dailyTokenCounterSchema = new mongoose.Schema({
  date: { type: String, required: true, index: true },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true, index: true },
  serviceId: { type: String, required: true, trim: true, index: true },
  lastTokenNumber: { type: Number, required: true, default: 0, min: 0 },
}, { timestamps: true, versionKey: false })

dailyTokenCounterSchema.index({ date: 1, locationId: 1, serviceId: 1 }, { unique: true })

export default mongoose.models.DailyTokenCounter || mongoose.model('DailyTokenCounter', dailyTokenCounterSchema)

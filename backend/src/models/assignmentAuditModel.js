import mongoose from 'mongoose'

const assignmentAuditSchema = new mongoose.Schema({
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  oldLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  newLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
  action: { type: String, enum: ['ASSIGNED', 'CHANGED', 'REMOVED'], required: true, index: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, trim: true, default: '' },
}, { timestamps: true, versionKey: false })

assignmentAuditSchema.index({ managerId: 1, createdAt: -1 })

export default mongoose.models.AssignmentAudit || mongoose.model('AssignmentAudit', assignmentAuditSchema)

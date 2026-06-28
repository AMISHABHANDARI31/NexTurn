import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Name is required'], trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'] },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, maxlength: 128, select: false },
  role: { type: String, enum: ['User', 'Manager', 'SystemAdmin'], default: 'User', index: true },
  isBootstrapAdmin: { type: Boolean, default: false, index: true },
  assignedLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null, index: true },
  isEmailVerified: { type: Boolean, default: false, index: true },
  emailVerifiedAt: { type: Date, default: null },
  emailVerificationOtpHash: { type: String, default: null, select: false },
  emailVerificationOtpExpiresAt: { type: Date, default: null, select: false },
  emailVerificationOtpLastSentAt: { type: Date, default: null, select: false },
  emailVerificationOtpAttempts: { type: Number, default: 0, select: false },
}, { timestamps: true, versionKey: false })

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model('User', userSchema)
export default User

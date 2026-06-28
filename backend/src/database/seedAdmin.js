import 'dotenv/config'
import mongoose from 'mongoose'
import connectDatabase from '../config/db.js'
import User from '../models/userModel.js'

const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim()
const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase()
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD

if (!name || !email || !password) {
  console.error('Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and BOOTSTRAP_ADMIN_PASSWORD in backend/.env.')
  process.exit(1)
}
if (password.length < 12) {
  console.error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.')
  process.exit(1)
}

try {
  await connectDatabase()
  let admin = await User.findOne({ email }).select('+password')
  if (!admin) admin = new User({ name, email, password })
  else {
    admin.name = name
    admin.password = password
  }
  admin.role = 'SystemAdmin'
  admin.isBootstrapAdmin = true
  admin.isEmailVerified = true
  admin.emailVerifiedAt = new Date()
  admin.emailVerificationOtpHash = null
  admin.emailVerificationOtpExpiresAt = null
  admin.emailVerificationOtpLastSentAt = null
  admin.emailVerificationOtpAttempts = 0
  await admin.save()
  await User.updateMany({ _id: { $ne: admin._id }, isBootstrapAdmin: true }, { $set: { isBootstrapAdmin: false, role: 'User' } })
  console.log(`Bootstrap Admin ready: ${admin.email}`)
} catch (error) {
  console.error('Unable to seed the bootstrap Admin:', error.message)
  process.exitCode = 1
} finally {
  await mongoose.disconnect()
}

import crypto from 'node:crypto'
import Location from '../models/locationModel.js'
import Token from '../models/tokenModel.js'
import SystemConfig from '../models/systemConfigModel.js'

const serviceCatalog = {
  Healthcare: {
    location: 'City General Hospital - Outpatient Department',
    services: ['General medicine consultation', 'Pediatric consultation', 'Cardiology consultation', 'Orthopedic consultation', 'Dermatology consultation', 'Gynecology consultation', 'ENT consultation', 'Ophthalmology consultation', 'Dental consultation'],
  },
  Banking: {
    location: 'National Trust Bank - Central Branch',
    services: ['Cash deposit', 'Cash withdrawal', 'Account opening', 'KYC information update', 'Loan inquiry', 'Passbook or account statement', 'Foreign exchange services', 'Locker services'],
  },
  'Education & College': {
    location: 'NexTurn College - Administration Block',
    services: ['Admission inquiry', 'Admission application', 'Document verification', 'Fee payment', 'Student information update', 'Scholarship inquiry', 'Certificate or transcript collection'],
  },
  'Government & Identity': {
    location: 'Citizen Service Centre - Zone 2',
    services: ['Driving licence application', 'Driving licence renewal', 'Passport application', 'Passport verification', 'Aadhaar enrolment', 'Aadhaar biometric update', 'Aadhaar address or information update', 'Government document collection'],
  },
}

export const seedLocations = Object.entries(serviceCatalog).flatMap(([category, group]) =>
  group.services.map((service, index) => ({
    service,
    location: group.location,
    category,
    status: index % 4 === 3 ? 'Busy' : 'Available',
    predictedWaitMinutes: 10 + ((index * 4 + category.length) % 21),
  })),
)

export async function ensureLocations() {
  await Location.bulkWrite(seedLocations.map((location) => ({
    updateOne: {
      filter: { service: location.service, location: location.location },
      update: { $set: location },
      upsert: true,
    },
  })))
}

export async function getLocations(_req, res, next) {
  try {
    await ensureLocations()
    const locations = await Location.find().sort({ category: 1, predictedWaitMinutes: 1 }).lean()
    res.json({ success: true, data: locations })
  } catch (error) { next(error) }
}

export function getQueue(_req, res) {
  res.json({ success: true, data: {
    location: 'City General Hospital - Outpatient Department', service: 'General medicine consultation', waiting: 4,
    estimatedMinutes: 18, confidenceLow: 14, confidenceHigh: 23,
    updatedAt: new Date().toISOString(),
  } })
}

export async function getTokens(req, res, next) {
  try {
    const tokens = await Token.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20).lean()
    res.json({ success: true, data: tokens.map((token) => ({ id: token._id, code: token.code, customer: req.user.name, service: token.service, waitMinutes: token.estimatedMinutes, priority: token.accessibility ? 'priority' : 'standard', status: token.status === 'completed' ? 'done' : token.status === 'serving' ? 'serving' : 'waiting' })) })
  } catch (error) { next(error) }
}

export async function issueToken(req, res, next) {
  const { service, phone, accessibility = false } = req.body ?? {}
  if (!service || !/^\+?[0-9]{10,14}$/.test(String(phone ?? ''))) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose a service and enter a valid phone number.' } })
  }
  try {
    const location = await Location.findOne({ service }).lean()
    const config = await SystemConfig.findOne({ key: 'prediction' }).lean()
    const baseEstimate = accessibility ? 15 : location?.predictedWaitMinutes || 18
    const estimatedMinutes = Math.max(1, Math.round(baseEstimate * (config?.congestionFactor || 1)))
    const code = `NT-${Date.now().toString(36).toUpperCase()}-${crypto.randomInt(100, 1000)}`
    if (!location) return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'The selected service is unavailable.' } })
    const token = await Token.create({ code, user: req.user._id, location: location._id, service, category: location.category, phone, accessibility, priority: accessibility ? 'high' : 'standard', estimatedMinutes })
    return res.status(201).json({ success: true, message: 'Token issued successfully.', data: { tokenId: String(token._id), code, estimatedMinutes, locationId: String(location._id) } })
  } catch (error) { next(error) }
}

export function getNotifications(_req, res) {
  const now = Date.now()
  res.json({ success: true, data: [
    { id: 'queue-update', title: 'Queue updates are active', body: 'We will notify you as your position changes.', category: 'queue', read: false, createdAt: new Date(now - 6 * 60_000).toISOString(), href: '/app/queue' },
    { id: 'account-secure', title: 'Account secured', body: 'Your NexTurn session is protected with JWT authentication.', category: 'account', read: true, createdAt: new Date(now - 24 * 60 * 60_000).toISOString(), href: '/app/dashboard' },
  ] })
}

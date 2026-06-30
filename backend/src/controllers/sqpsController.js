import Location from '../models/locationModel.js'
import Token from '../models/tokenModel.js'
import Counter from '../models/counterModel.js'
import { enqueueBookingConfirmationEmail, enqueueTokenCancelledEmail } from '../services/emailQueue.js'
import { emitPredictionUpdated, emitQueueUpdated, emitTokenCancelled, emitUserQueueUpdated } from '../services/queueService.js'
import { getNotificationHistory, notifyUser } from '../services/notificationService.js'
import { generateDailyTokenNumber, getTokenDisplay } from '../services/tokenNumberService.js'
import { calculateServiceWindow } from '../modules/queue/predictionService.js'
import { predictQueue } from '../../ai/prediction/predictionService.js'

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
    const activeCounterCounts = await Counter.aggregate([
      { $match: { location: { $in: locations.map((location) => location._id) }, status: 'Active' } },
      { $group: { _id: '$location', count: { $sum: 1 } } },
    ])
    const activeCountersByLocation = new Map(activeCounterCounts.map((row) => [String(row._id), row.count]))
    res.json({ success: true, data: locations.map((location) => {
      const activeCounters = activeCountersByLocation.get(String(location._id)) || 0
      const activeHours = isWithinBusinessHours(location.businessHours)
      return {
        ...location,
        activeCounters,
        acceptsTokens: location.status !== 'Unavailable' && activeHours && activeCounters > 0,
        tokenAvailabilityReason: getTokenAvailabilityReason(location, activeCounters, activeHours),
      }
    }) })
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
    res.json({ success: true, data: tokens.map((token) => ({ id: token._id, code: getTokenDisplay(token), displayTokenNumber: getTokenDisplay(token), dailySequenceNumber: token.dailySequenceNumber, date: token.date, customer: req.user.name, service: token.service, waitMinutes: token.estimatedMinutes, priority: token.accessibility ? 'priority' : 'standard', status: token.status === 'completed' ? 'done' : token.status === 'serving' ? 'serving' : token.status === 'cancelled' ? 'cancelled' : 'waiting', cancelReason: token.cancelReason, cancelledAt: token.cancelledAt })) })
  } catch (error) { next(error) }
}

export async function cancelOwnToken(req, res, next) {
  try {
    const reason = String(req.body?.reason || '').trim()
    if (!reason || reason.length < 3) return res.status(400).json({ success: false, error: { code: 'CANCEL_REASON_REQUIRED', message: 'Please provide a cancellation reason.' } })
    const token = await Token.findOne({ _id: req.params.tokenId, user: req.user._id })
    if (!token) return res.status(404).json({ success: false, error: { code: 'TOKEN_NOT_FOUND', message: 'No active token was found for your account.' } })
    if (token.status === 'completed') return res.status(409).json({ success: false, error: { code: 'TOKEN_ALREADY_COMPLETED', message: 'Completed tokens cannot be cancelled.' } })
    if (token.status === 'cancelled') return res.status(409).json({ success: false, error: { code: 'TOKEN_ALREADY_CANCELLED', message: 'This token is already cancelled.' } })

    token.status = 'cancelled'
    token.cancelReason = reason
    token.cancelledBy = 'USER'
    token.cancelledAt = new Date()
    await token.save({ validateBeforeSave: false })

    emitTokenCancelled({ token })
    await emitQueueUpdated(token.location)
    await emitUserQueueUpdated(token.location, req.user._id)
    emitPredictionUpdated({ locationId: token.location, tokenId: token._id, oldWaitTime: token.estimatedMinutes, newWaitTime: null, confidenceScore: 90 })
    notifyUser(req.user._id, { title: 'Token cancelled', message: `Your token ${getTokenDisplay(token)} has been cancelled successfully.`, type: 'queue', data: { tokenId: token._id } })
    enqueueTokenCancelledEmail({
      email: req.user.email,
      name: req.user.name,
      queueNumber: getTokenDisplay(token),
      serviceName: token.service,
      reason,
      cancelledBy: 'You',
    }).catch((cause) => console.error('Token cancellation email queue failed:', cause.message))

    res.json({ success: true, message: 'Your token has been successfully cancelled.', data: { token } })
  } catch (error) { next(error) }
}

export async function issueToken(req, res, next) {
  const { service, phone, accessibility = false } = req.body ?? {}
  if (!service || !/^\+?[0-9]{10,14}$/.test(String(phone ?? ''))) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose a service and enter a valid phone number.' } })
  }
  try {
    const location = await Location.findOne({ service }).lean()
    if (!location) return res.status(404).json({ success: false, error: { code: 'SERVICE_NOT_FOUND', message: 'The selected service is unavailable.' } })
    if (location.status === 'Unavailable') return res.status(409).json({ success: false, error: { code: 'SERVICE_INACTIVE', message: 'This service is currently inactive. Please choose another service or try again later.' } })

    const activeHours = isWithinBusinessHours(location.businessHours)
    if (!activeHours) return res.status(409).json({ success: false, error: { code: 'OUTSIDE_BUSINESS_HOURS', message: `Tokens can only be generated during active hours (${location.businessHours?.openTime || '09:00'}-${location.businessHours?.closeTime || '17:00'}).` } })

    const activeCounterCount = await Counter.countDocuments({ location: location._id, status: 'Active' })
    if (activeCounterCount < 1) return res.status(409).json({ success: false, error: { code: 'NO_ACTIVE_COUNTER', message: 'Token generation is closed until a manager opens an active counter for this service.' } })

    const aiPrediction = await predictQueue({ locationId: location._id, userId: req.user._id })
    const estimatedMinutes = Math.max(1, Math.round(aiPrediction?.predictedWaitTime || (accessibility ? 15 : location.predictedWaitMinutes || 18)))
    const tokenNumber = await generateDailyTokenNumber({ locationId: location._id, serviceId: service })
    const code = `${tokenNumber.date}-${String(location._id)}-${Buffer.from(service).toString('base64url').slice(0, 16)}-${tokenNumber.dailySequenceNumber}`
    const predictedStartTime = new Date(Date.now() + estimatedMinutes * 60_000)
    const serviceDuration = Math.max(1, location.defaultServiceMinutes || 15)
    const { predictedCompletionTime } = calculateServiceWindow({ startAt: predictedStartTime, durationMinutes: serviceDuration })
    const token = await Token.create({ code, displayTokenNumber: tokenNumber.displayTokenNumber, dailySequenceNumber: tokenNumber.dailySequenceNumber, date: tokenNumber.date, user: req.user._id, location: location._id, service, category: location.category, phone, accessibility, priority: accessibility ? 'high' : 'standard', estimatedMinutes, predictedStartTime, predictedCompletionTime, serviceDuration })
    await emitQueueUpdated(location._id)
    await emitUserQueueUpdated(location._id, req.user._id)
    emitPredictionUpdated({ locationId: location._id, tokenId: token._id, newWaitTime: estimatedMinutes, confidenceScore: 90 })
    enqueueBookingConfirmationEmail({
      email: req.user.email,
      name: req.user.name,
      queueNumber: tokenNumber.displayTokenNumber,
      serviceName: service,
      estimatedWaitingTime: estimatedMinutes,
      bookingDateTime: new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(token.createdAt),
    }).catch((cause) => console.error('Booking confirmation email queue failed:', cause.message))
    return res.status(201).json({ success: true, message: 'Token issued successfully.', data: { tokenId: String(token._id), code: tokenNumber.displayTokenNumber, tokenNumber: tokenNumber.displayTokenNumber, displayTokenNumber: tokenNumber.displayTokenNumber, dailySequenceNumber: tokenNumber.dailySequenceNumber, date: tokenNumber.date, position: (aiPrediction?.peopleAhead ?? 0) + 1, estimatedWaitTime: `${estimatedMinutes} minutes`, estimatedMinutes, locationId: String(location._id) } })
  } catch (error) { next(error) }
}

function isWithinBusinessHours(businessHours = {}) {
  const openMinutes = parseTimeToMinutes(businessHours.openTime || '09:00')
  const closeMinutes = parseTimeToMinutes(businessHours.closeTime || '17:00')
  if (openMinutes === null || closeMinutes === null) return true

  const now = new Date()
  const localParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: process.env.BUSINESS_TIME_ZONE || 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const hour = Number(localParts.find((part) => part.type === 'hour')?.value)
  const minute = Number(localParts.find((part) => part.type === 'minute')?.value)
  const currentMinutes = hour * 60 + minute

  if (openMinutes === closeMinutes) return true
  if (openMinutes < closeMinutes) return currentMinutes >= openMinutes && currentMinutes < closeMinutes
  return currentMinutes >= openMinutes || currentMinutes < closeMinutes
}

function parseTimeToMinutes(value) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''))
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

function getTokenAvailabilityReason(location, activeCounters, activeHours) {
  if (location.status === 'Unavailable') return 'Service inactive'
  if (!activeHours) return `Opens during ${location.businessHours?.openTime || '09:00'}-${location.businessHours?.closeTime || '17:00'}`
  if (activeCounters < 1) return 'Waiting for manager to open a counter'
  return 'Accepting tokens'
}

export function getNotifications(req, res) {
  const now = Date.now()
  res.json({ success: true, data: [
    ...getNotificationHistory(req.user._id),
    { id: 'queue-update', title: 'Queue updates are active', body: 'We will notify you as your position changes.', category: 'queue', read: false, createdAt: new Date(now - 6 * 60_000).toISOString(), href: '/app/queue' },
    { id: 'account-secure', title: 'Account secured', body: 'Your NexTurn session is protected with JWT authentication.', category: 'account', read: true, createdAt: new Date(now - 24 * 60 * 60_000).toISOString(), href: '/app/dashboard' },
  ] })
}

import Counter from '../models/counterModel.js'
import Location from '../models/locationModel.js'
import Token from '../models/tokenModel.js'
import { getIO } from '../websocket/socketServer.js'
import { rooms, SOCKET_EVENTS } from '../websocket/events.js'
import { predictQueue } from '../../ai/prediction/predictionService.js'

export async function getQueueSnapshot(locationId, userId = null) {
  const location = await Location.findById(locationId).lean()
  if (!location) return null

  const [activeCounters, activeTokens] = await Promise.all([
    Counter.countDocuments({ location: locationId, status: 'Active' }),
    Token.find({ location: locationId, status: { $in: ['waiting', 'serving'] } })
      .select('_id code user service priority status estimatedMinutes createdAt servingAt counter')
      .sort({ priority: -1, createdAt: 1 })
      .lean(),
  ])

  const waitingTokens = activeTokens.filter((token) => token.status === 'waiting')
  const currentServingToken = activeTokens.find((token) => token.status === 'serving') || null
  const userToken = userId ? activeTokens.find((token) => token.user && String(token.user) === String(userId)) : null
  const peopleAhead = userToken
    ? userToken.status === 'serving'
      ? 0
      : waitingTokens.filter((token) => {
        if (String(token._id) === String(userToken._id)) return false
        if (userToken.priority === 'high') return token.priority === 'high' && token.createdAt < userToken.createdAt
        return token.priority === 'high' || (token.priority !== 'high' && token.createdAt < userToken.createdAt)
      }).length
    : waitingTokens.length
  const safeCounters = Math.max(1, activeCounters)
  const aiPrediction = await predictQueue({ locationId, userId })
  const estimatedWaitTime = aiPrediction?.estimatedWaitMinutes ?? Math.max(0, Math.round(((peopleAhead + (userToken?.status === 'serving' ? 0 : 1)) / safeCounters) * (location.defaultServiceMinutes || 15)))

  return {
    queueId: String(locationId),
    currentToken: currentServingToken ? serializeToken(currentServingToken) : null,
    userToken: userToken ? serializeToken(userToken) : null,
    peopleAhead,
    waitingCount: waitingTokens.length,
    estimatedWaitTime,
    activeCounters,
    predictionConfidenceScore: aiPrediction?.predictionConfidenceScore ?? null,
    predictionConfidenceText: aiPrediction?.predictionConfidenceText ?? null,
    predictionSource: aiPrediction?.predictionSource ?? 'fallback',
    modelVersion: aiPrediction?.modelVersion ?? 'fallback',
    queueProgress: userToken ? Math.max(0, Math.min(100, Math.round(((waitingTokens.length - peopleAhead) / Math.max(1, waitingTokens.length)) * 100))) : 0,
    timestamp: new Date().toISOString(),
  }
}

export async function emitQueueUpdated(locationId) {
  const io = getIO()
  if (!io) return
  const snapshot = await getQueueSnapshot(locationId)
  if (!snapshot) return
  io.to(rooms.location(locationId)).emit(SOCKET_EVENTS.QUEUE_UPDATED, snapshot)
  console.info(`[queue-event] ${SOCKET_EVENTS.QUEUE_UPDATED} location=${locationId} waiting=${snapshot.waitingCount}`)
}

export async function emitUserQueueUpdated(locationId, userId) {
  const io = getIO()
  if (!io) return
  const snapshot = await getQueueSnapshot(locationId, userId)
  if (!snapshot) return
  io.to(rooms.user(userId)).emit(SOCKET_EVENTS.QUEUE_UPDATED, snapshot)
}

export function emitTokenCancelled({ token }) {
  const io = getIO()
  if (!io || !token?.location) return
  const payload = {
    tokenId: String(token._id),
    tokenNumber: token.code,
    userId: token.user ? String(token.user) : null,
    cancelledBy: token.cancelledBy,
    reason: token.cancelReason,
    timestamp: token.cancelledAt?.toISOString?.() || new Date().toISOString(),
  }
  io.to(rooms.location(token.location)).emit(SOCKET_EVENTS.TOKEN_CANCELLED, payload)
  if (token.user) io.to(rooms.user(token.user)).emit(SOCKET_EVENTS.TOKEN_CANCELLED, payload)
  console.info(`[queue-event] ${SOCKET_EVENTS.TOKEN_CANCELLED} token=${token.code}`)
}

export function emitCounterStatusChanged({ counter, availableServices = [] }) {
  const io = getIO()
  if (!io || !counter?.location) return
  const payload = {
    counterId: String(counter._id),
    status: counter.status === 'Active' ? 'OPEN' : 'CLOSED',
    rawStatus: counter.status,
    availableServices,
    timestamp: new Date().toISOString(),
  }
  io.to(rooms.location(counter.location)).emit(SOCKET_EVENTS.COUNTER_STATUS_CHANGED, payload)
  console.info(`[queue-event] ${SOCKET_EVENTS.COUNTER_STATUS_CHANGED} counter=${counter._id} status=${counter.status}`)
}

export function emitNextUserCalled({ counterId, token, userId }) {
  const io = getIO()
  if (!io || !token?.location) return
  const payload = {
    counterId: String(counterId),
    currentToken: serializeToken(token),
    userId: userId ? String(userId) : null,
    message: 'Your turn is approaching',
    timestamp: new Date().toISOString(),
  }
  io.to(rooms.location(token.location)).emit(SOCKET_EVENTS.NEXT_USER_CALLED, payload)
  if (userId) io.to(rooms.user(userId)).emit(SOCKET_EVENTS.NEXT_USER_CALLED, payload)
  console.info(`[queue-event] ${SOCKET_EVENTS.NEXT_USER_CALLED} token=${token.code}`)
}

export function emitQueueAutoAdvanced({ queueId, previousToken, currentToken, counterId, estimatedWaitTime }) {
  const io = getIO()
  if (!io) return
  const payload = {
    queueId: String(queueId),
    previousToken: previousToken ? serializeToken(previousToken) : null,
    currentToken: currentToken ? serializeToken(currentToken) : null,
    counterId: counterId ? String(counterId) : null,
    estimatedWaitTime,
    timestamp: new Date().toISOString(),
  }
  io.to(rooms.location(queueId)).emit(SOCKET_EVENTS.QUEUE_AUTO_ADVANCED, payload)
  console.info(`[queue-event] ${SOCKET_EVENTS.QUEUE_AUTO_ADVANCED} queue=${queueId} current=${currentToken?.code || 'none'}`)
}

export function emitNextUserAutomaticallyCalled({ token, counter }) {
  const io = getIO()
  if (!io || !token?.location) return
  const payload = {
    tokenId: String(token._id),
    userId: token.user ? String(token.user) : null,
    counterNumber: counter?.number ?? null,
    message: `Your turn has started. Please visit ${counter?.name || 'the assigned counter'}.`,
    timestamp: new Date().toISOString(),
  }
  io.to(rooms.location(token.location)).emit(SOCKET_EVENTS.NEXT_USER_AUTOMATICALLY_CALLED, payload)
  if (token.user) io.to(rooms.user(token.user)).emit(SOCKET_EVENTS.NEXT_USER_AUTOMATICALLY_CALLED, payload)
  console.info(`[queue-event] ${SOCKET_EVENTS.NEXT_USER_AUTOMATICALLY_CALLED} token=${token.code}`)
}

export function emitPredictionUpdated({ locationId, tokenId, oldWaitTime = null, newWaitTime, confidenceScore }) {
  const io = getIO()
  if (!io) return
  const payload = { tokenId: tokenId ? String(tokenId) : null, oldWaitTime, newWaitTime, confidenceScore, timestamp: new Date().toISOString() }
  io.to(rooms.location(locationId)).emit(SOCKET_EVENTS.PREDICTION_UPDATED, payload)
}

export function emitManagerLocationUpdated({ managerId, oldLocationId = null, newLocationId = null, updatedBy }) {
  const io = getIO()
  if (!io) return
  const payload = {
    managerId: String(managerId),
    oldLocationId: oldLocationId ? String(oldLocationId) : null,
    newLocationId: newLocationId ? String(newLocationId) : null,
    updatedBy: updatedBy ? String(updatedBy) : null,
    timestamp: new Date().toISOString(),
  }
  io.to(rooms.user(managerId)).emit(SOCKET_EVENTS.MANAGER_LOCATION_UPDATED, payload)
  io.to(rooms.user(managerId)).emit(SOCKET_EVENTS.NOTIFICATION_RECEIVED, {
    userId: String(managerId),
    title: 'Assigned location updated',
    message: newLocationId ? 'Your manager workspace has been moved to a new branch. Please refresh or sign in again.' : 'Your manager branch assignment was removed.',
    type: 'access',
    timestamp: payload.timestamp,
  })
}

function serializeToken(token) {
  return {
    id: String(token._id),
    code: token.code,
    userId: token.user ? String(token.user) : null,
    service: token.service,
    priority: token.priority,
    status: token.status,
    estimatedMinutes: token.estimatedMinutes,
    createdAt: token.createdAt,
    calledAt: token.calledAt,
    servingAt: token.servingAt,
    predictedStartTime: token.predictedStartTime,
    predictedCompletionTime: token.predictedCompletionTime,
  }
}

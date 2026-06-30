import Counter from '../../models/counterModel.js'
import Location from '../../models/locationModel.js'
import Token from '../../models/tokenModel.js'
import {
  emitNextUserAutomaticallyCalled,
  emitPredictionUpdated,
  emitQueueAutoAdvanced,
  emitQueueUpdated,
  emitUserQueueUpdated,
} from './queueService.js'
import { notifyUser } from './notificationService.js'
import { calculateServiceWindow, confidenceIsSafe, estimateServiceDurationMinutes } from './predictionService.js'
import { buildHistoryFromCompletedToken } from '../../../ai/training/datasetBuilder.js'
import { getTokenDisplay } from '../../services/tokenNumberService.js'

export async function getBranchAutomationState(branchId) {
  const branch = await Location.findById(branchId).lean()
  if (!branch) return null
  const branchLocationIds = await Location.find({ location: branch.location }).distinct('_id')
  const [servingToken, nextToken, activeCounters] = await Promise.all([
    Token.findOne({ location: { $in: branchLocationIds }, status: 'serving' }).sort({ servingAt: 1 }).populate('counter', 'name number status').lean(),
    Token.findOne({ location: { $in: branchLocationIds }, status: 'waiting' }).sort({ priority: -1, createdAt: 1 }).lean(),
    Counter.find({ location: branch._id, status: 'Active' }).sort({ number: 1 }).lean(),
  ])
  const mode = branch.automationMode || 'MANUAL'
  const autoCallDelay = Number(branch.autoCallDelay ?? 60)
  const now = Date.now()
  const dueAt = servingToken?.predictedCompletionTime
    ? new Date(new Date(servingToken.predictedCompletionTime).getTime() + (mode === 'HYBRID' ? autoCallDelay * 1000 : 0))
    : null

  return {
    branchId: String(branch._id),
    branchName: branch.location,
    automationMode: mode,
    autoCallDelay,
    lastAutomationRun: branch.lastAutomationRun,
    activeCounterCount: activeCounters.length,
    currentToken: servingToken,
    nextToken,
    predictedCompletionTime: servingToken?.predictedCompletionTime || null,
    nextActionAt: dueAt,
    canAutoAdvance: mode !== 'MANUAL' && activeCounters.length > 0 && Boolean(nextToken) && Boolean(servingToken) && dueAt && now >= dueAt.getTime(),
  }
}

export async function updateBranchAutomationSettings(branchId, { automationMode, autoCallDelay }) {
  const branch = await Location.findById(branchId)
  if (!branch) return null
  const mode = ['MANUAL', 'AUTOMATIC', 'HYBRID'].includes(automationMode) ? automationMode : branch.automationMode || 'MANUAL'
  const delay = Number.isFinite(Number(autoCallDelay)) ? Math.max(0, Math.min(3600, Number(autoCallDelay))) : branch.autoCallDelay ?? 60
  const branchLocationIds = await Location.find({ location: branch.location }).distinct('_id')
  await Location.updateMany({ _id: { $in: branchLocationIds } }, { $set: { automationMode: mode, autoCallDelay: delay } })
  return getBranchAutomationState(branchId)
}

export async function processAutomationTick() {
  const candidates = await Location.find({ automationMode: { $in: ['AUTOMATIC', 'HYBRID'] } }).lean()
  const seenBranches = new Set()
  const results = []
  for (const branch of candidates) {
    if (seenBranches.has(branch.location)) continue
    seenBranches.add(branch.location)
    const result = await tryAdvanceBranch(branch._id).catch((error) => ({ advanced: false, reason: error.message }))
    results.push({ branchId: String(branch._id), ...result })
  }
  return results
}

export async function tryAdvanceBranch(branchId) {
  const branch = await Location.findById(branchId)
  if (!branch) return { advanced: false, reason: 'BRANCH_NOT_FOUND' }
  const automationMode = branch.automationMode || 'MANUAL'
  if (automationMode === 'MANUAL') return { advanced: false, reason: 'MANUAL_MODE' }

  const branchLocationIds = await Location.find({ location: branch.location }).distinct('_id')
  const activeCounter = await Counter.findOne({ location: branch._id, status: 'Active' }).sort({ number: 1 })
  if (!activeCounter) return { advanced: false, reason: 'NO_ACTIVE_COUNTER' }

  const servingToken = await Token.findOne({ location: { $in: branchLocationIds }, status: 'serving', counter: activeCounter._id }).sort({ servingAt: 1 })
  if (!servingToken?.predictedCompletionTime) return { advanced: false, reason: 'NO_DUE_SERVING_TOKEN' }

  const dueAt = new Date(servingToken.predictedCompletionTime).getTime() + (automationMode === 'HYBRID' ? Number(branch.autoCallDelay || 0) * 1000 : 0)
  if (Date.now() < dueAt) return { advanced: false, reason: 'NOT_DUE_YET' }
  if (!confidenceIsSafe(90)) return { advanced: false, reason: 'LOW_CONFIDENCE' }

  const nextToken = await Token.findOne({ location: { $in: branchLocationIds }, status: 'waiting' }).sort({ priority: -1, createdAt: 1 })
  if (!nextToken) return { advanced: false, reason: 'NO_WAITING_TOKEN' }

  const now = new Date()
  servingToken.status = 'completed'
  servingToken.completedAt = now
  servingToken.autoProcessed = true
  if (servingToken.servingAt) servingToken.processingMinutes = Math.max(0, (now - servingToken.servingAt) / 60_000)
  await servingToken.save({ validateBeforeSave: false })
  buildHistoryFromCompletedToken(servingToken).catch((cause) => console.error('Prediction history capture failed:', cause.message))

  const nextLocation = await Location.findById(nextToken.location).lean()
  const serviceDuration = await estimateServiceDurationMinutes(nextLocation || branch)
  const { predictedStartTime, predictedCompletionTime } = calculateServiceWindow({ startAt: now, durationMinutes: serviceDuration })
  nextToken.status = 'serving'
  nextToken.counter = activeCounter._id
  nextToken.calledAt = now
  nextToken.servingAt = now
  nextToken.predictedStartTime = predictedStartTime
  nextToken.predictedCompletionTime = predictedCompletionTime
  nextToken.serviceDuration = serviceDuration
  await nextToken.save({ validateBeforeSave: false })

  await Location.updateMany({ _id: { $in: branchLocationIds } }, { $set: { lastAutomationRun: now } })

  emitQueueAutoAdvanced({ queueId: nextToken.location, previousToken: servingToken, currentToken: nextToken, counterId: activeCounter._id, estimatedWaitTime: serviceDuration })
  emitNextUserAutomaticallyCalled({ token: nextToken, counter: activeCounter })
  emitPredictionUpdated({ locationId: nextToken.location, tokenId: nextToken._id, oldWaitTime: nextToken.estimatedMinutes, newWaitTime: 0, confidenceScore: 90 })
  await Promise.all(branchLocationIds.map((locationId) => emitQueueUpdated(locationId)))
  if (nextToken.user) {
    await emitUserQueueUpdated(nextToken.location, nextToken.user)
    notifyUser(nextToken.user, {
      title: 'Your turn has started',
      message: `${getTokenDisplay(nextToken)} is now serving. Please visit ${activeCounter.name}.`,
      type: 'queue',
      data: { tokenId: nextToken._id, counterId: activeCounter._id },
    })
  }

  return { advanced: true, previousToken: getTokenDisplay(servingToken), currentToken: getTokenDisplay(nextToken), counterId: String(activeCounter._id) }
}

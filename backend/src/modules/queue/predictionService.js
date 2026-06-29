import Token from '../../models/tokenModel.js'

export async function estimateServiceDurationMinutes(location) {
  const [sample] = await Token.aggregate([
    { $match: { location: location._id, status: 'completed', processingMinutes: { $gt: 0 } } },
    { $group: { _id: null, averageMinutes: { $avg: '$processingMinutes' } } },
  ])
  return Math.max(1, Math.round(sample?.averageMinutes || location.defaultServiceMinutes || 15))
}

export function calculateServiceWindow({ startAt = new Date(), durationMinutes }) {
  const predictedStartTime = new Date(startAt)
  const predictedCompletionTime = new Date(predictedStartTime.getTime() + Math.max(1, Number(durationMinutes) || 15) * 60_000)
  return { predictedStartTime, predictedCompletionTime }
}

export function confidenceIsSafe(score = 90) {
  return Number(score) >= Number(process.env.AUTOMATION_MIN_CONFIDENCE || 70)
}

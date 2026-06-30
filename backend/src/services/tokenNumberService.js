import DailyTokenCounter from '../models/dailyTokenCounterModel.js'

export function getQueueDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.BUSINESS_TIME_ZONE || 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

export async function generateDailyTokenNumber({ locationId, serviceId }) {
  const date = getQueueDate()
  const counter = await DailyTokenCounter.findOneAndUpdate(
    { date, locationId, serviceId },
    { $inc: { lastTokenNumber: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean()

  const dailySequenceNumber = counter.lastTokenNumber
  return {
    date,
    dailySequenceNumber,
    displayTokenNumber: `Token ${dailySequenceNumber}`,
  }
}

export function getTokenDisplay(token) {
  return token?.displayTokenNumber || token?.code || 'Token'
}

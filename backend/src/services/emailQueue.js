import EmailLog from '../models/emailLogModel.js'
import { renderEmailTemplate } from './emailTemplates.js'
import { sendEmail } from './emailService.js'

const retryDelaysMs = [0, 60_000, 5 * 60_000]
let workerTimer
let isProcessing = false

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase()
}

function maskEmail(email = '') {
  const [name, domain] = String(email).split('@')
  if (!domain) return 'unknown'
  return `${name.slice(0, 2)}***@${domain}`
}

function nextDelay(attempts) {
  return retryDelaysMs[Math.min(attempts, retryDelaysMs.length - 1)]
}

export async function enqueueEmail({ to, template, data = {}, metadata = {}, maxAttempts = 3 }) {
  const normalizedTo = normalizeEmail(to)
  if (!normalizedTo) {
    throw Object.assign(new Error('Email recipient is required.'), {
      status: 400,
      code: 'EMAIL_RECIPIENT_REQUIRED',
    })
  }

  const rendered = renderEmailTemplate(template, data)
  const job = await EmailLog.create({
    to: normalizedTo,
    subject: redactSensitiveText(rendered.subject),
    template,
    maxAttempts,
    metadata: { ...metadata, templateData: data },
  })

  processEmailQueue().catch((error) => {
    console.error('Email queue processing failed:', error.message)
  })
  return job
}

export async function processEmailQueue(limit = 10) {
  if (isProcessing) return
  isProcessing = true
  try {
    const dueJobs = await EmailLog.find({
      status: { $in: ['PENDING', 'RETRYING'] },
      nextAttemptAt: { $lte: new Date() },
      attempts: { $lt: 3 },
    }).sort({ nextAttemptAt: 1, createdAt: 1 }).limit(limit)

    for (const job of dueJobs) {
      await deliverJob(job)
    }
  } finally {
    isProcessing = false
  }
}

async function deliverJob(job) {
  const templateData = job.metadata?.templateData || {}
  const rendered = renderEmailTemplate(job.template, templateData)

  try {
    job.attempts += 1
    const result = await sendEmail({ to: job.to, ...rendered })
    job.status = 'SENT'
    job.sentAt = new Date()
    job.messageId = result?.messageId
    job.lastError = undefined
    job.metadata = redactEmailMetadata(job.metadata)
    await job.save()
    console.log(`Email sent: ${job.template} -> ${maskEmail(job.to)}`)
  } catch (error) {
    job.lastError = error?.cause?.message || error?.message || 'Unknown email error'
    if (job.attempts >= job.maxAttempts) {
      job.status = 'FAILED'
      job.failedAt = new Date()
      job.metadata = redactEmailMetadata(job.metadata)
    } else {
      job.status = 'RETRYING'
      job.nextAttemptAt = new Date(Date.now() + nextDelay(job.attempts))
    }
    await job.save()
    console.error(`Email failed: ${job.template} -> ${maskEmail(job.to)} (${job.status})`, job.lastError)
  }
}

function redactSensitiveText(value = '') {
  return String(value).replace(/\b\d{6}\b/g, '******').replace(/token=([^&\s]+)/gi, 'token=***')
}

function redactEmailMetadata(metadata = {}) {
  const safe = { ...metadata }
  if (safe.templateData) {
    safe.templateData = { ...safe.templateData }
    if (safe.templateData.otp) safe.templateData.otp = '******'
    if (safe.templateData.resetUrl) safe.templateData.resetUrl = redactSensitiveText(safe.templateData.resetUrl)
  }
  return safe
}

export function startEmailQueueWorker() {
  if (workerTimer) return workerTimer
  workerTimer = setInterval(() => {
    processEmailQueue().catch((error) => console.error('Email worker failed:', error.message))
  }, 15_000)
  workerTimer.unref?.()
  return workerTimer
}

export async function getEmailQueueStats() {
  const rows = await EmailLog.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: '$_id', count: 1 } },
  ])
  return rows.reduce((summary, row) => ({ ...summary, [row.status.toLowerCase()]: row.count }), {
    pending: 0,
    sent: 0,
    failed: 0,
    retrying: 0,
  })
}

export function enqueueOtpEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'EMAIL_VERIFICATION',
    data: { name: payload.name, otp: payload.otp, expiresInMinutes: payload.expiresInMinutes },
    metadata: { category: 'auth', purpose: 'email-verification' },
  })
}

export function enqueueWelcomeEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'WELCOME',
    data: { name: payload.name },
    metadata: { category: 'auth', purpose: 'welcome' },
  })
}

export function enqueuePasswordResetEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'PASSWORD_RESET',
    data: { name: payload.name, resetUrl: payload.resetUrl, expiresInMinutes: payload.expiresInMinutes },
    metadata: { category: 'auth', purpose: 'password-reset' },
  })
}

export function enqueueBookingConfirmationEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'TOKEN_CREATED',
    data: {
      name: payload.name,
      queueNumber: payload.queueNumber,
      serviceName: payload.serviceName,
      estimatedWaitingTime: payload.estimatedWaitingTime,
      bookingDateTime: payload.bookingDateTime,
    },
    metadata: { category: 'queue', purpose: 'booking-confirmation', token: payload.queueNumber },
  })
}

export function enqueueQueueApproachingEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'TURN_REMINDER',
    data: {
      name: payload.name,
      queueNumber: payload.queueNumber,
      serviceName: payload.serviceName,
      peopleAhead: payload.peopleAhead,
    },
    metadata: { category: 'queue', purpose: 'turn-reminder', token: payload.queueNumber },
  })
}

export function enqueueTokenCancelledEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'TOKEN_CANCELLED',
    data: {
      name: payload.name,
      queueNumber: payload.queueNumber,
      serviceName: payload.serviceName,
      reason: payload.reason,
      cancelledBy: payload.cancelledBy,
    },
    metadata: { category: 'queue', purpose: 'token-cancelled', token: payload.queueNumber },
  })
}

export function enqueueManagerAlertEmail(payload) {
  return enqueueEmail({
    to: payload.email,
    template: 'MANAGER_ALERT',
    data: {
      name: payload.name,
      branchName: payload.branchName,
      title: payload.title,
      message: payload.message,
    },
    metadata: { category: 'operations', purpose: 'manager-alert' },
  })
}

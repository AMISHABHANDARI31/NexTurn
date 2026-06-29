import nodemailer from 'nodemailer'
import { renderEmailTemplate, stripHtml } from './emailTemplates.js'

const configKeys = {
  host: ['EMAIL_HOST', 'SMTP_HOST'],
  port: ['EMAIL_PORT', 'SMTP_PORT'],
  user: ['EMAIL_USER', 'SMTP_USER'],
  password: ['EMAIL_PASSWORD', 'SMTP_PASSWORD'],
  from: ['EMAIL_FROM'],
  name: ['EMAIL_NAME'],
}

function readEnv(keys, fallback = '') {
  for (const key of keys) {
    const value = process.env[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return fallback
}

export function getEmailConfig() {
  const port = Number(readEnv(configKeys.port, '587'))
  const from = readEnv(configKeys.from)
  const name = readEnv(configKeys.name, 'NexTurn')

  return {
    host: readEnv(configKeys.host, 'smtp-relay.brevo.com'),
    port,
    secure: port === 465,
    user: readEnv(configKeys.user),
    password: readEnv(configKeys.password),
    from,
    name,
    fromAddress: from ? `"${name.replace(/"/g, '')}" <${from}>` : '',
  }
}

export function validateEmailConfig() {
  const config = getEmailConfig()
  const missing = []
  if (!config.host) missing.push('EMAIL_HOST')
  if (!Number.isInteger(config.port) || config.port <= 0) missing.push('EMAIL_PORT')
  if (!config.user) missing.push('EMAIL_USER')
  if (!config.password) missing.push('EMAIL_PASSWORD')
  if (!config.from) missing.push('EMAIL_FROM')

  if (missing.length) {
    throw Object.assign(new Error(`Missing email configuration: ${missing.join(', ')}`), {
      status: 500,
      code: 'EMAIL_NOT_CONFIGURED',
    })
  }
  return config
}

function transporterConfig() {
  const config = validateEmailConfig()
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
    requireTLS: config.port === 587,
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 60_000,
  }
}

let transporter

export function getEmailTransporter() {
  if (!transporter) transporter = nodemailer.createTransport(transporterConfig())
  return transporter
}

export function resetEmailTransporter() {
  transporter = undefined
}

export async function verifyEmailTransport() {
  return getEmailTransporter().verify()
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to || !subject || !html) {
    throw Object.assign(new Error('Email requires to, subject, and html.'), {
      status: 500,
      code: 'EMAIL_PAYLOAD_INVALID',
    })
  }

  try {
    const config = validateEmailConfig()
    return await getEmailTransporter().sendMail({
      from: config.fromAddress,
      to,
      subject,
      html,
      text: text || stripHtml(html),
    })
  } catch (cause) {
    throw Object.assign(new Error(cause?.message || 'Email delivery failed.'), {
      status: 502,
      code: 'EMAIL_DELIVERY_FAILED',
      cause,
    })
  }
}

async function sendTemplateEmail(template, to, data) {
  const rendered = renderEmailTemplate(template, data)
  return sendEmail({ to, ...rendered })
}

export async function sendOtpEmail({ email, name, otp, expiresInMinutes }) {
  return sendTemplateEmail('EMAIL_VERIFICATION', email, { name, otp, expiresInMinutes })
}

export async function sendWelcomeEmail({ email, name }) {
  return sendTemplateEmail('WELCOME', email, { name })
}

export async function sendPasswordResetEmail({ email, name, resetUrl, expiresInMinutes }) {
  return sendTemplateEmail('PASSWORD_RESET', email, { name, resetUrl, expiresInMinutes })
}

export async function sendBookingConfirmationEmail({ email, name, queueNumber, serviceName, estimatedWaitingTime, bookingDateTime }) {
  return sendTemplateEmail('TOKEN_CREATED', email, { name, queueNumber, serviceName, estimatedWaitingTime, bookingDateTime })
}

export async function sendQueueApproachingEmail({ email, name, queueNumber, serviceName, peopleAhead }) {
  return sendTemplateEmail('TURN_REMINDER', email, { name, queueNumber, serviceName, peopleAhead })
}

export async function sendTokenCancelledEmail({ email, name, queueNumber, serviceName, reason, cancelledBy }) {
  return sendTemplateEmail('TOKEN_CANCELLED', email, { name, queueNumber, serviceName, reason, cancelledBy })
}

export async function sendManagerAlertEmail({ email, name, branchName, title, message }) {
  return sendTemplateEmail('MANAGER_ALERT', email, { name, branchName, title, message })
}

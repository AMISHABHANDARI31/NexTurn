import nodemailer from 'nodemailer'

const requiredVariables = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM']

function smtpConfig() {
  const missing = requiredVariables.filter((name) => !process.env[name]?.trim())
  if (missing.length) {
    throw Object.assign(new Error(`Missing SMTP configuration: ${missing.join(', ')}`), {
      status: 500,
      code: 'SMTP_NOT_CONFIGURED',
    })
  }

  const port = Number(process.env.SMTP_PORT)
  if (!Number.isInteger(port) || port <= 0) {
    throw Object.assign(new Error('SMTP_PORT must be a valid port number.'), { status: 500, code: 'SMTP_INVALID_PORT' })
  }

  return {
    host: process.env.SMTP_HOST.trim(),
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASS },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
  }
}

let transporter

export function getMailer() {
  if (!transporter) transporter = nodemailer.createTransport(smtpConfig())
  return transporter
}

export async function verifyMailerConnection() {
  return getMailer().verify()
}

export async function sendOtpEmail({ email, name, otp, expiresInMinutes }) {
  return getMailer().sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `${otp} is your NexTurn verification code`,
    text: `Hello ${name}, your NexTurn verification code is ${otp}. It expires in ${expiresInMinutes} minutes. Do not share this code.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102a43"><h1 style="color:#123c69">NexTurn</h1><p>Hello ${escapeHtml(name)},</p><p>Use this verification code to finish creating your account:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f1f5f9;padding:18px;text-align:center;border-radius:12px">${otp}</p><p>This code expires in ${expiresInMinutes} minutes. Do not share it with anyone.</p><p style="color:#64748b;font-size:13px">If you did not request this account, you can ignore this email.</p></div>`,
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}

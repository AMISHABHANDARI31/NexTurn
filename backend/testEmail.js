import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getEmailConfig, sendEmail, verifyEmailTransport } from './src/services/emailService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true })

function mask(value = '') {
  if (!value) return 'missing'
  if (value.length <= 6) return 'present'
  return `${value.slice(0, 3)}***${value.slice(-3)}`
}

function validateEnvironment() {
  const config = getEmailConfig()
  const missing = []
  if (!config.host) missing.push('EMAIL_HOST')
  if (!config.port) missing.push('EMAIL_PORT')
  if (!config.user) missing.push('EMAIL_USER')
  if (!config.password) missing.push('EMAIL_PASSWORD')
  if (!config.from) missing.push('EMAIL_FROM')

  console.log('SMTP audit:')
  console.log(`- EMAIL_HOST: ${config.host || 'missing'}`)
  console.log(`- EMAIL_PORT: ${config.port || 'missing'}`)
  console.log(`- EMAIL_USER: ${mask(config.user)}`)
  console.log(`- EMAIL_PASSWORD: ${config.password ? 'present' : 'missing'}`)
  console.log(`- EMAIL_FROM: ${config.from || 'missing'}`)
  console.log(`- EMAIL_NAME: ${config.name || 'NexTurn'}`)

  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  if (config.host !== 'smtp-relay.brevo.com') console.warn('⚠️  Brevo SMTP host should normally be smtp-relay.brevo.com')
  if (Number(config.port) !== 587) console.warn('⚠️  Brevo SMTP relay should normally use port 587 with STARTTLS.')
  if (!config.user.includes('@smtp-brevo.com')) console.warn('⚠️  Brevo EMAIL_USER usually looks like b03a000000@smtp-brevo.com')
}

async function main() {
  try {
    validateEnvironment()

    await verifyEmailTransport()
    console.log('✅ SMTP connection successful')

    const to = process.env.TEST_EMAIL_TO || process.env.EMAIL_FROM
    await sendEmail({
      to,
      subject: 'NexTurn Brevo SMTP test',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102a43">
          <h1 style="color:#123c69">NexTurn SMTP test</h1>
          <p>If you received this email, Brevo SMTP is configured correctly.</p>
          <p style="color:#64748b;font-size:13px">Sent from backend/testEmail.js</p>
        </div>
      `,
    })
    console.log(`✅ Email sent successfully to ${to}`)
  } catch (error) {
    console.error('❌ SMTP test failed')
    console.error(error.message)
    if (error.cause?.message) console.error(`Cause: ${error.cause.message}`)
    process.exitCode = 1
  }
}

main()

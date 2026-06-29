import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters.'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().optional(),
  EMAIL_USER: z.string().optional(),
  EMAIL_PASSWORD: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().email(),
  EMAIL_NAME: z.string().default('NexTurn'),
})

export function validateEnvironment() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new Error(`Environment validation failed: ${errors}`)
  }
  const hasEmailUser = process.env.EMAIL_USER?.trim() || process.env.SMTP_USER?.trim()
  const hasEmailPassword = process.env.EMAIL_PASSWORD?.trim() || process.env.SMTP_PASSWORD?.trim()
  if (!hasEmailUser || !hasEmailPassword) throw new Error('Environment validation failed: EMAIL_USER and EMAIL_PASSWORD are required.')
  return parsed.data
}

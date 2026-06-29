import { z } from 'zod'

const email = z.string().trim().toLowerCase().email('Enter a valid email address.')
const strongPassword = z.string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be at most 128 characters.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.')

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Enter your full name.').max(80),
    email,
    password: strongPassword,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, 'Password is required.').max(128),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const otpSchema = z.object({
  body: z.object({
    email,
    otp: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit verification code.'),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const resendOtpSchema = z.object({
  body: z.object({ email }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const resetPasswordSchema = z.object({
  body: z.object({
    email,
    token: z.string().trim().min(32, 'Reset token is invalid.'),
    password: strongPassword,
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

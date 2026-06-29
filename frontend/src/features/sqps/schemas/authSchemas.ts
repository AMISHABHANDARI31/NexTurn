import { z } from 'zod'

const strongPassword = z.string()
  .min(8, 'Use at least 8 characters')
  .regex(/[A-Z]/, 'Include one uppercase letter')
  .regex(/[a-z]/, 'Include one lowercase letter')
  .regex(/[0-9]/, 'Include one number')

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export const registrationSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  password: strongPassword,
})

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
})

export const resetPasswordSchema = z.object({
  password: strongPassword,
  confirmPassword: z.string().min(1, 'Confirm your new password'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegistrationValues = z.infer<typeof registrationSchema>
export type OtpValues = z.infer<typeof otpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

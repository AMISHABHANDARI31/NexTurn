import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters'),
})

export const registrationSchema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  password: z.string().min(8, 'Use at least 8 characters').regex(/[A-Z]/, 'Include one uppercase letter'),
})

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegistrationValues = z.infer<typeof registrationSchema>
export type OtpValues = z.infer<typeof otpSchema>

import { z } from 'zod'

export const tokenRequestSchema = z.object({
  service: z.string().min(1, 'Choose a service'),
  phone: z.string().regex(/^\+?[0-9]{10,14}$/, 'Enter a valid phone number'),
  accessibility: z.boolean(),
})

export type TokenRequestValues = z.infer<typeof tokenRequestSchema>

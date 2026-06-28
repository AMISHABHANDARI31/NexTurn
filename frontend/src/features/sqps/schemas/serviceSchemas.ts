import { z } from 'zod'
export const serviceSchema = z.object({ name: z.string().min(3), location: z.string().min(3), averageMinutes: z.coerce.number().min(1).max(240), description: z.string().min(10).max(280) })
export const tokenSchema = z.object({ service: z.string().min(1, 'Choose a service'), phone: z.string().regex(/^\+?[0-9]{10,14}$/, 'Enter a valid phone number'), accessibility: z.boolean() })

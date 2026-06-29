import { z } from 'zod'

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid identifier.')

export const issueTokenSchema = z.object({
  body: z.object({
    service: z.string().trim().min(2, 'Choose a service.').max(160),
    phone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, 'Enter a valid phone number.'),
    accessibility: z.boolean().optional().default(false),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
})

export const cancelTokenSchema = z.object({
  body: z.object({
    reason: z.string().trim().min(3, 'Please provide a cancellation reason.').max(300),
  }),
  params: z.object({ tokenId: objectId }),
  query: z.object({}).optional(),
})

export const tokenStatusSchema = z.object({
  body: z.object({
    status: z.enum(['completed', 'cancelled']),
    reason: z.string().trim().max(300).optional(),
  }),
  params: z.object({ tokenId: objectId }),
  query: z.object({}).optional(),
})

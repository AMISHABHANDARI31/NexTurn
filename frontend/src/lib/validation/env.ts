import { z } from 'zod'
const schema = z.object({ VITE_API_BASE_URL: z.string().default('/api'), VITE_ENABLE_MOCKS: z.enum(['true', 'false']).default('true') })
export const env = schema.parse(import.meta.env)

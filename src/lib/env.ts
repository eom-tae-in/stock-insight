import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SERPAPI_KEY: z.string().optional(),
})

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  SERPAPI_KEY: process.env.SERPAPI_KEY,
})

export type Env = z.infer<typeof envSchema>

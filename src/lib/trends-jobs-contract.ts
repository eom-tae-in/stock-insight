import { z } from 'zod'

export const trendsJobQuerySchema = z
  .object({
    keyword: z.string().trim().min(1).max(100),
    geo: z.string().regex(/^([A-Z]{2})?$/),
    timeframe: z.literal('today 5-y'),
    gprop: z.enum(['', 'youtube', 'images', 'news', 'froogle']),
  })
  .strict()
  .readonly()
export type TrendsJobQuery = z.infer<typeof trendsJobQuerySchema>
export const trendsJobSchema = z
  .object({
    id: z.uuid(),
    generation: z.number().int().positive(),
    state: z.enum(['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED']),
    query: trendsJobQuerySchema,
    requestedAt: z.iso.datetime({ offset: true }),
    deadline: z.iso.datetime({ offset: true }),
    points: z
      .array(
        z
          .object({
            date: z.iso.date(),
            value: z.number().int().min(0).max(100),
          })
          .readonly()
      )
      .max(300)
      .readonly(),
    errorCode: z
      .enum(['', 'NO_DATA', 'DEADLINE_EXCEEDED', 'PROVIDER_FAILED'])
      .nullable(),
    provider: z.literal('fixture-v1').nullable(),
  })
  .strict()
  .readonly()
export type TrendsJob = z.infer<typeof trendsJobSchema>

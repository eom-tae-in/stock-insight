import { z } from 'zod'
import { currentCards } from './current'
import { renewalCards } from './renewal'

export const journeys = {
  current: { title: '사용법을 알아봐요', path: '/guide', cards: currentCards },
  renewal: {
    title: '새로워질 모습을 살펴봐요',
    path: '/renewal',
    cards: renewalCards,
  },
} as const
export type Journey = keyof typeof journeys
export type GuideCard = (typeof journeys)[Journey]['cards'][number]

export function guideStep(input: unknown, count: number): number {
  const parsed = z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(count))
    .safeParse(input)
  return parsed.success ? parsed.data : 1
}

export function guideHref(journey: Journey, step = 1): string {
  return `${journeys[journey].path}?step=${step}#guide-title`
}

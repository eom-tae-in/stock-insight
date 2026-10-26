import Image from 'next/image'

const charts = {
  intro: 160,
  metrics: 160,
  keyword: 130,
  comparison: 145,
  exports: 145,
  briefing: 150,
  evidence: 160,
  mobile: 130,
} as const
export type GuideChartName = keyof typeof charts

export function GuideChart({ name }: { readonly name: GuideChartName }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-8 text-xs">
        <span className="text-brand-text">관심도</span>
        <span>주가</span>
      </div>
      {(['light', 'dark'] as const).map(theme => (
        <picture
          key={theme}
          className={
            theme === 'light' ? 'block dark:hidden' : 'hidden dark:block'
          }
        >
          <source
            media="(max-width: 639px)"
            srcSet={`/guides/${name}-mobile${theme === 'light' ? '-light' : ''}.svg`}
            width={270}
            height={['intro', 'metrics', 'evidence'].includes(name) ? 95 : 90}
          />
          <Image
            src={`/guides/${name}${theme === 'light' ? '-light' : ''}.svg`}
            alt="관심도와 주가의 주간 흐름을 나란히 그린 설명용 그래프. 실제 데이터가 아니에요."
            width={668}
            height={charts[name]}
            className="h-auto max-w-full"
            unoptimized
          />
        </picture>
      ))}
      <p className="text-text-tertiary text-xs leading-4">
        설명용 시계열 · 실제 데이터가 아니에요
      </p>
    </div>
  )
}

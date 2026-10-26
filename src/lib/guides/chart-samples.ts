import { calculateMA13 } from '@/lib/indicators'

export type GuidePoint = {
  readonly date: string
  readonly close: number
  readonly interest: number
  readonly ma13: number | null
}
export const guideSeries = {
  interest: {
    label: '검색 관심도',
    unit: ' / 100',
    color: 'var(--chart-interest)',
    axis: 'interest',
  },
  close: {
    label: '주간 종가',
    unit: ' USD',
    color: 'var(--chart-price)',
    axis: 'price',
  },
  ma13: {
    label: '13주 이동평균',
    unit: ' USD',
    color: 'var(--chart-ma13)',
    axis: 'price',
  },
} as const
export type GuideSeries = keyof typeof guideSeries

// Hand-authored teaching samples, not observed prices or Google Trends results.
// Each row is [weekly closing price in USD, relative search interest].
const appleRows = [
  [186.4, 42],
  [189.8, 46],
  [187.2, 41],
  [191.6, 48],
  [195.3, 52],
  [193.7, 45],
  [198.1, 59],
  [201.5, 67],
  [197.6, 55],
  [194.2, 51],
  [190.8, 49],
  [188.6, 44],
  [192.4, 53],
  [196.8, 61],
  [202.3, 78],
  [205.7, 94],
  [200.1, 76],
  [197.8, 64],
  [203.6, 68],
  [207.2, 72],
  [204.5, 62],
  [199.3, 57],
  [202.8, 65],
  [206.1, 71],
  [210.7, 81],
  [208.4, 74],
] as const
const nvidiaRows = [
  [132.6, 35],
  [135.1, 38],
  [129.8, 42],
  [127.4, 46],
  [131.2, 41],
  [136.7, 49],
  [139.3, 56],
  [134.8, 51],
  [130.2, 44],
  [126.5, 40],
  [128.9, 47],
  [133.1, 52],
  [137.6, 58],
  [140.2, 62],
  [138.1, 55],
  [133.7, 61],
  [129.4, 68],
  [125.2, 73],
  [128.6, 65],
  [123.4, 79],
  [119.8, 87],
  [122.1, 82],
  [117.5, 91],
  [114.2, 96],
  [118.7, 88],
  [116.3, 93],
] as const
function weeklyPoints(
  rows: readonly (readonly [number, number])[]
): readonly GuidePoint[] {
  const prices = rows.map(([close], index) => ({
    date: new Date(Date.UTC(2025, 0, 6 + index * 7)).toISOString().slice(0, 10),
    close,
  }))
  const averages = calculateMA13(prices)
  return prices.map((price, index) => ({
    ...price,
    interest: rows[index]?.[1] ?? 0,
    ma13: averages[index] ?? null,
  }))
}
const apple = weeklyPoints(appleRows)
const nvidia = weeklyPoints(nvidiaRows)

type Sample = {
  readonly title: string
  readonly condition: string
  readonly lesson: string
  readonly data: readonly GuidePoint[]
  readonly series: readonly GuideSeries[]
}
export const chartSamples = {
  intro: {
    title: 'Apple 관심도 × AAPL 주가',
    condition: '전체 지역 · 웹 검색 · 26주',
    lesson: '같은 주차에서도 관심도와 주가는 다르게 움직여요.',
    data: apple,
    series: ['interest', 'close'],
  },
  metrics: {
    title: 'AAPL · 종가와 13주 평균',
    condition: 'USD · 주간 종가 · 26주',
    lesson: '첫 12주는 계산에 필요한 주 수가 부족해 이동평균이 없어요.',
    data: apple,
    series: ['close', 'ma13'],
  },
  keyword: {
    title: 'Apple · 검색 관심도',
    condition: '전체 지역 · 웹 검색 · 26주',
    lesson: '관심도는 상대 지수예요. 검색 횟수나 주가가 아니에요.',
    data: apple,
    series: ['interest'],
  },
  comparison: {
    title: 'Apple × AAPL · 같은 주차 비교',
    condition: '관심도 0~100 · 주가 USD · 최근 16주',
    lesson:
      '왼쪽은 관심도, 오른쪽은 가격이에요. 선이 겹쳐도 같은 수치는 아니에요.',
    data: apple.slice(-16),
    series: ['interest', 'close'],
  },
  exports: {
    title: '내 차트 · AAPL 최근 13주',
    condition: '종가 + MA13 · 선택한 기간의 주간 값',
    lesson: '전체 시계열에서 평균을 계산한 뒤 표시 기간을 골라요.',
    data: apple.slice(-13),
    series: ['close', 'ma13'],
  },
  briefing: {
    title: 'NVIDIA × NVDA · 엇갈린 흐름',
    condition: '전체 지역 · 웹 검색 · 최근 12주',
    lesson:
      '이 샘플에서는 관심도가 높아지는 동안 주가가 내려가요. 인과관계를 뜻하지 않아요.',
    data: nvidia.slice(-12),
    series: ['interest', 'close'],
  },
  evidence: {
    title: 'Apple × AAPL · 최근 6주 근거',
    condition: '동일 주차 정렬 · 원래 단위로 확인',
    lesson: '선의 모양을 본 뒤 날짜별 수치를 표에서 다시 확인해요.',
    data: apple.slice(-6),
    series: ['interest', 'close'],
  },
  mobile: {
    title: 'NVIDIA · 최근 8주 관심도',
    condition: '핵심 기간만 보기 · 주차별 값 선택',
    lesson: '모바일에서는 아래 슬라이더로 주차를 골라 값을 읽어봐요.',
    data: nvidia.slice(-8),
    series: ['interest'],
  },
} as const satisfies Readonly<Record<string, Sample>>
export type GuideChartName = keyof typeof chartSamples

export function guideValue(series: GuideSeries, value: number | null): string {
  if (value === null) return '— (13주 미만)'
  return series === 'interest' ? `${value} / 100` : `$${value.toFixed(2)}`
}

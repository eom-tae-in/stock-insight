import { CHART_SERIES_COLORS } from '@/lib/constants/chart-series'

export const SERIES_CONFIG = {
  open: {
    name: '시가',
    color: CHART_SERIES_COLORS.open,
    yAxisId: 'left',
    type: 'line',
    enabled: true,
    minWeeks: 0,
  },
  close: {
    name: '종가',
    color: CHART_SERIES_COLORS.price,
    yAxisId: 'left',
    type: 'line',
    enabled: true,
    minWeeks: 0,
  },
  low: {
    name: '저가',
    color: CHART_SERIES_COLORS.low,
    yAxisId: 'left',
    type: 'line',
    enabled: false,
    minWeeks: 0,
  },
  high: {
    name: '고가',
    color: CHART_SERIES_COLORS.high,
    yAxisId: 'left',
    type: 'line',
    enabled: false,
    minWeeks: 0,
  },
  ma13: {
    name: '13주 MA',
    color: CHART_SERIES_COLORS.ma13,
    yAxisId: 'left',
    type: 'area',
    enabled: true,
    minWeeks: 13,
  },
  yoy: {
    name: '13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)',
    color: CHART_SERIES_COLORS.yoy,
    yAxisId: 'right',
    type: 'area',
    enabled: true,
    minWeeks: 65,
  },
}

export type SeriesKey = keyof typeof SERIES_CONFIG

export const TIME_RANGE_PRESETS = [
  { weeks: 52, label: '1Y' },
  { weeks: 104, label: '2Y' },
  { weeks: 156, label: '3Y' },
  { weeks: 208, label: '4Y' },
  { weeks: 260, label: '5Y' },
]

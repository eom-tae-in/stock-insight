'use client'

const chartTheme = {
  gridColor: 'var(--chart-grid)',
  axisColor: 'var(--text-tertiary)',
  tooltipBg: 'var(--popover)',
  tooltipBorder: 'var(--border)',
  legendColor: 'var(--text-secondary)',
} as const

export function useChartTheme() {
  return chartTheme
}

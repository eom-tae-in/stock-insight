'use client'

import { useTheme } from 'next-themes'
import { useMemo } from 'react'

/**
 * Recharts에 사용할 테마 색상을 동적으로 반환합니다.
 * 현재 테마(dark/light/calm)에 따라 차트 색상을 조정합니다.
 */
export function useChartTheme() {
  const { resolvedTheme } = useTheme()

  return useMemo(() => {
    const isDark = resolvedTheme === 'dark'
    const isCalm = resolvedTheme === 'calm'

    return {
      // CartesianGrid 색상
      gridColor: isDark || isCalm ? '#374151' : '#e5e7eb', // gray-700 / gray-200
      // X/Y 축 색상
      axisColor: isDark || isCalm ? '#9ca3af' : '#6b7280', // gray-400 / gray-500
      // Tooltip 배경색
      tooltipBg: isDark || isCalm ? '#1f2937' : '#ffffff', // gray-800 / white
      // Tooltip 보더 색상
      tooltipBorder: isDark || isCalm ? '#374151' : '#e5e7eb', // gray-700 / gray-200
      // 범례 텍스트 색상
      legendColor: isDark || isCalm ? '#d1d5db' : '#374151', // gray-300 / gray-700
    }
  }, [resolvedTheme])
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getCurrencyFromTicker } from '@/lib/utils/currency'
import type { StockCardProps } from '@/types'

interface StockCardWithEditProps extends StockCardProps {
  isEditMode?: boolean
  isDragging?: boolean
  editMode?: 'none' | 'delete' | 'reorder'
}

export function StockCard({
  id,
  ticker,
  companyName,
  currency,
  weeklyOpen,
  weeklyHigh,
  weeklyLow,
  currentPrice,
  previousClose,
  ma13,
  yoyChange,
  lastUpdatedAt,
  onRefresh,
  isLoading = false,
  isEditMode = false,
  isDragging = false,
  editMode = isEditMode ? 'reorder' : 'none',
}: StockCardWithEditProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  const currencyInfo = getCurrencyFromTicker(currency || ticker)
  const formatPriceValue = (value: number): string => {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })
  }

  // 전주 대비 수익률
  const weekOverWeekReturn =
    previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : 0
  const isWeekPositive = weekOverWeekReturn >= 0
  const isYoYPositive = yoyChange >= 0
  const isManaging = editMode !== 'none' || isEditMode
  const isReorderMode = editMode === 'reorder' || isEditMode
  const isRefreshingActive = isRefreshing || isLoading

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <Link
      href={isManaging ? '#' : `/stock-analysis/${id}`}
      onClick={e => isManaging && e.preventDefault()}
    >
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-300',
          !isManaging && 'cursor-pointer hover:shadow-lg',
          editMode === 'delete' && 'cursor-pointer',
          isRefreshingActive &&
            'border-cyan-400 bg-cyan-50/50 shadow-md ring-2 ring-cyan-400/30 dark:bg-cyan-950/20',
          isReorderMode &&
            'cursor-grab border-2 border-blue-500 bg-blue-500/5 hover:cursor-grab',
          isDragging && 'ring-2 ring-blue-500 ring-offset-2'
        )}
        onMouseEnter={() => !isManaging && setShowOverlay(true)}
        onMouseLeave={() => !isManaging && setShowOverlay(false)}
        onClick={() => !isManaging && setShowOverlay(!showOverlay)}
      >
        {isRefreshingActive && (
          <div className="absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full border border-cyan-300 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700 shadow-sm dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
            <RefreshCw className="h-3 w-3 animate-spin" />
            최신화 중
          </div>
        )}

        <div className="px-6 pt-3 pb-3">
          {/* 헤더: 드래그 핸들 + Ticker + Company Name */}
          <div className="mb-6 flex items-baseline gap-2">
            {isReorderMode && (
              <GripVertical className="h-5 w-5 flex-shrink-0 text-blue-500" />
            )}
            <h3 className="text-2xl font-bold">{ticker}</h3>
            {companyName && (
              <p className="text-muted-foreground text-sm">{companyName}</p>
            )}
          </div>

          {/* 지난 주 데이터 */}
          <div className="mb-6">
            <p className="text-muted-foreground mb-3 text-xs font-semibold">
              지난 주 데이터
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">시가</p>
                <p className="font-semibold">
                  {currencyInfo.symbol}
                  {formatPriceValue(weeklyOpen)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">종가</p>
                <p className="font-semibold">
                  {currencyInfo.symbol}
                  {formatPriceValue(currentPrice)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">고가</p>
                <p className="font-semibold">
                  {currencyInfo.symbol}
                  {formatPriceValue(weeklyHigh)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">저가</p>
                <p className="font-semibold">
                  {currencyInfo.symbol}
                  {formatPriceValue(weeklyLow)}
                </p>
              </div>
            </div>
          </div>

          {/* 지난 주 종가 기반 지표 */}
          <div className="mb-6">
            <p className="text-muted-foreground mb-3 text-xs font-semibold">
              지난 주 종가 및 13주 이동평균 기반 지표
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">
                  전주 대비 수익률
                </p>
                <p
                  className={cn(
                    'font-semibold',
                    isWeekPositive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isWeekPositive ? '+' : ''}
                  {weekOverWeekReturn.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">최근 13주 평균</p>
                <p className="font-semibold">
                  {currencyInfo.symbol}
                  {formatPriceValue(ma13)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                <p className="text-muted-foreground text-xs">
                  13주 이동평균 기준 전년동기 대비 증감률(52주 YoY)
                </p>
                <p
                  className={cn(
                    'font-semibold',
                    isYoYPositive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isYoYPositive ? '+' : ''}
                  {yoyChange.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* 저장 날짜 */}
          <div className="text-right">
            <p className="text-muted-foreground text-xs">
              {(() => {
                const date = new Date(lastUpdatedAt)
                const year = date.getFullYear()
                const month = String(date.getMonth() + 1).padStart(2, '0')
                const day = String(date.getDate()).padStart(2, '0')
                return `${year}.${month}.${day}`
              })()}
            </p>
          </div>
        </div>

        {/* 호버/터치 오버레이 (수정 모드가 아닐 때만) */}
        {!isManaging && (showOverlay || isRefreshingActive) && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <Button
              size="lg"
              variant="outline"
              className="bg-background/95 h-14 w-14 rounded-full border-cyan-300 text-cyan-700 shadow-md transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:text-cyan-800 hover:shadow-lg dark:border-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-950"
              onClick={e => {
                e.preventDefault()
                handleRefresh()
              }}
              disabled={isRefreshingActive}
              aria-label="최신화"
            >
              <RefreshCw
                className={cn('h-6 w-6', isRefreshingActive && 'animate-spin')}
              />
            </Button>
          </div>
        )}
      </Card>
    </Link>
  )
}

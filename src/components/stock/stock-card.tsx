'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Trash2, GripVertical } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getCurrencyFromTicker } from '@/lib/utils/currency'
import type { StockCardProps } from '@/types'

interface StockCardWithEditProps extends StockCardProps {
  isEditMode?: boolean
  isDragging?: boolean
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
  onDelete,
  isLoading = false,
  isEditMode = false,
  isDragging = false,
}: StockCardWithEditProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
      setShowDeleteDialog(false)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Link
        href={isEditMode ? '#' : `/analysis/${id}`}
        onClick={e => isEditMode && e.preventDefault()}
      >
        <Card
          className={cn(
            'group relative overflow-hidden transition-all duration-300',
            !isEditMode && 'cursor-pointer hover:shadow-lg',
            isEditMode &&
              'cursor-move border-2 border-blue-500 bg-blue-500/5 hover:shadow-lg hover:shadow-blue-500/20',
            isDragging && 'ring-2 ring-blue-500 ring-offset-2'
          )}
          onMouseEnter={() => !isEditMode && setShowOverlay(true)}
          onMouseLeave={() => !isEditMode && setShowOverlay(false)}
          onClick={() => !isEditMode && setShowOverlay(!showOverlay)}
        >
          <div className="px-6 pt-3 pb-3">
            {/* 헤더: 드래그 핸들 + Ticker + Company Name */}
            <div className="mb-6 flex items-baseline gap-2">
              {isEditMode && (
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
                지난 주 종가 기반 지표
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
                  <p className="text-muted-foreground text-xs">
                    최근 13주 평균
                  </p>
                  <p className="font-semibold">
                    {currencyInfo.symbol}
                    {formatPriceValue(ma13)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <p className="text-muted-foreground text-xs">
                    52주 전 대비 수익률
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
          {!isEditMode && showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 backdrop-blur-sm transition-opacity">
              <Button
                size="lg"
                className="h-14 w-14 rounded-xl border border-slate-500/30 bg-gradient-to-br from-slate-600 to-slate-700 text-cyan-300 shadow-md transition-all hover:from-slate-500 hover:to-slate-600 hover:shadow-lg"
                onClick={e => {
                  e.preventDefault()
                  handleRefresh()
                }}
                disabled={isRefreshing || isLoading}
                aria-label="최신화"
              >
                <RefreshCw
                  className={cn('h-6 w-6', isRefreshing && 'animate-spin')}
                />
              </Button>
              <Button
                size="lg"
                className="h-14 w-14 rounded-xl border border-slate-500/30 bg-gradient-to-br from-slate-600 to-slate-700 text-rose-300 shadow-md transition-all hover:from-slate-500 hover:to-slate-600 hover:shadow-lg"
                onClick={e => {
                  e.preventDefault()
                  setShowDeleteDialog(true)
                }}
                disabled={isDeleting || isLoading}
                aria-label="삭제"
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>
          )}
        </Card>
      </Link>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>종목 삭제</DialogTitle>
            <DialogDescription>
              {ticker} ({companyName})을 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

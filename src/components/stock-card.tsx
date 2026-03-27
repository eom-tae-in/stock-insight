'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Trash2 } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
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
import type { StockCardProps } from '@/types'

export function StockCard({
  id,
  ticker,
  companyName,
  currentPrice,
  previousClose,
  yoyChange,
  sparklineData,
  onRefresh,
  onDelete,
  isLoading = false,
}: StockCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)

  const isPositive = yoyChange >= 0
  // 전일 대비 변화율
  const priceChange =
    previousClose !== undefined && previousClose > 0
      ? ((currentPrice - previousClose) / previousClose) * 100
      : 0
  const isPricePositive = priceChange >= 0

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
      <Link href={`/analysis/${id}`}>
        <Card
          className="group relative cursor-pointer overflow-hidden transition-all hover:shadow-lg"
          onMouseEnter={() => setShowOverlay(true)}
          onMouseLeave={() => setShowOverlay(false)}
          onClick={() => setShowOverlay(!showOverlay)}
        >
          <div className="p-6">
            {/* 헤더: Ticker와 회사명 (가로 배치) */}
            <div className="mb-6 flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{ticker}</h3>
              <p className="text-muted-foreground text-sm">{companyName}</p>
            </div>

            {/* 현재가 + 전일 대비 변화 */}
            <div className="mb-4 space-y-2">
              <p className="text-4xl font-bold">${currentPrice.toFixed(2)}</p>
              {previousClose !== undefined && (
                <p
                  className={cn(
                    'text-sm font-medium',
                    isPricePositive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  전일 대비 {isPricePositive ? '+' : ''}
                  {priceChange.toFixed(2)}%
                </p>
              )}
            </div>

            {/* 52주 수익률 */}
            <div className="mb-6 space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase">
                52주 수익률
              </p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isPositive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {isPositive ? '+' : ''}
                {yoyChange.toFixed(2)}%
              </p>
            </div>

            {/* Sparkline - 더 크게 표시 */}
            <div className="mb-3 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={sparklineData.slice(-52)}
                  margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
                >
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={isPositive ? '#3b82f6' : '#ef4444'}
                    strokeWidth={2}
                    dot={false}
                    animationDuration={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 캡션 */}
            <p className="text-muted-foreground text-xs">1년 가격 추이</p>
          </div>

          {/* 호버/터치 오버레이 */}
          {showOverlay && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity">
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/90 hover:bg-white"
                onClick={e => {
                  e.preventDefault()
                  handleRefresh()
                }}
                disabled={isRefreshing || isLoading}
                aria-label="새로고침"
              >
                <RefreshCw
                  className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="bg-white/90 hover:bg-white"
                onClick={e => {
                  e.preventDefault()
                  setShowDeleteDialog(true)
                }}
                disabled={isDeleting || isLoading}
                aria-label="삭제"
              >
                <Trash2 className="h-4 w-4" />
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

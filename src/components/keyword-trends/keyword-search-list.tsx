'use client'

import { format, parseISO } from 'date-fns'
import type { KeywordRecord } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface KeywordSearchListProps {
  keywords: KeywordRecord[]
  onRestore: (keyword: KeywordRecord) => void
  onDelete: (keywordSearchId: string) => void
}

export default function KeywordSearchList({
  keywords,
  onRestore,
  onDelete,
}: KeywordSearchListProps) {
  return (
    <Card className="sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg">저장된 키워드</CardTitle>
      </CardHeader>
      <CardContent>
        {keywords.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            저장된 키워드가 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {keywords.map(keyword => (
              <div
                key={keyword.id}
                className="bg-card hover:bg-muted/50 space-y-2 rounded-lg border p-3 transition-colors"
              >
                {/* 키워드 이름 */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="flex-1 truncate text-sm font-semibold">
                    {keyword.keyword}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                    onClick={() => onDelete(keyword.id)}
                    aria-label={`"${keyword.keyword}" 키워드 삭제`}
                  >
                    ×
                  </Button>
                </div>

                {/* 지표 요약 */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">MA13</p>
                    <p className="font-mono font-semibold">
                      {keyword.ma13 != null ? keyword.ma13.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">YoY</p>
                    <p
                      className={`font-mono font-semibold ${
                        keyword.yoy_change == null
                          ? 'text-gray-500'
                          : keyword.yoy_change >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {keyword.yoy_change != null
                        ? `${keyword.yoy_change >= 0 ? '+' : ''}${keyword.yoy_change.toFixed(2)}%`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* 저장 날짜 */}
                <p className="text-muted-foreground text-xs">
                  {format(parseISO(keyword.searched_at), 'MMM dd, yyyy')}
                </p>

                {/* 복원 버튼 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onRestore(keyword)}
                >
                  복원
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

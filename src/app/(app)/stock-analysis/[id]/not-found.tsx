/**
 * Task 014: 404 페이지
 *
 * 존재하지 않는 종목 ID로 접근했을 때 표시
 */

import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex-1">
      <Container className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">종목을 찾을 수 없습니다</h1>
          <p className="text-muted-foreground mb-6">
            요청하신 종목 분석 데이터가 없습니다.
          </p>
          <Button asChild>
            <Link href="/stock-analysis">내 종목 목록으로 돌아가기</Link>
          </Button>
        </div>
      </Container>
    </main>
  )
}

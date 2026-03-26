import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Container className="py-8">
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-bold">저장된 종목</h1>
          </div>

          {/* 빈 상태 - 저장된 종목이 없을 때 표시 */}
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground mb-6 text-lg">
              저장된 종목이 없습니다.
            </p>
            <Button asChild>
              <Link href="/search">+ 추가</Link>
            </Button>
          </div>
        </Container>
      </main>
    </div>
  )
}

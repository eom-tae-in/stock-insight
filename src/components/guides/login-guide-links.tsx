import Link from 'next/link'
import { Button } from '@/components/ui/button'
export function LoginGuideLinks() {
  return (
    <aside
      aria-labelledby="login-guides-title"
      className="bg-card space-y-4 rounded-lg border p-5"
    >
      <h2 id="login-guides-title" className="text-base font-semibold">
        로그인 전에 먼저 알아보세요
      </h2>
      <p className="text-text-secondary text-sm leading-[22px]">
        큰 화면 예시로 사용법과 앞으로의 변화를 살펴볼 수 있어요.
      </p>
      <div className="space-y-2">
        <Button asChild variant="secondary" size="mobile" className="w-full">
          <Link href="/guide">서비스 사용법</Link>
        </Button>
        <Button asChild variant="ghost" size="mobile" className="w-full">
          <Link href="/renewal">리뉴얼 미리보기</Link>
        </Button>
      </div>
    </aside>
  )
}

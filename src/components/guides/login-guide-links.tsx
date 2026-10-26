import Link from 'next/link'
import { ArrowUpRight, BookOpen, Sparkles } from 'lucide-react'

const entries = [
  {
    href: '/guide',
    title: '사용법을 알아봐요',
    detail: '종목 저장부터 키워드 비교까지',
    icon: BookOpen,
  },
  {
    href: '/renewal',
    title: '새로워질 모습을 살펴봐요',
    detail: '더 편하게 분석할 수 있도록 바꿔가요',
    icon: Sparkles,
  },
] as const

export function LoginGuideLinks() {
  return (
    <nav aria-label="서비스 안내" className="space-y-2 border-t pt-6">
      {entries.map(({ href, title, detail, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="group hover:bg-surface-sunken focus-visible:ring-ring flex min-h-11 items-center gap-3 rounded-lg px-3 py-4 transition-colors outline-none focus-visible:ring-2 motion-reduce:transition-none"
        >
          <Icon aria-hidden className="text-text-secondary size-5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-text-secondary text-xs leading-5">{detail}</p>
          </div>
          <ArrowUpRight
            aria-hidden
            className="text-text-tertiary size-4 shrink-0"
          />
        </Link>
      ))}
    </nav>
  )
}

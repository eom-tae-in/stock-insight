import Link from 'next/link'
import { Container } from './container'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">StockInsight</span>
          </Link>
          <ThemeToggle />
        </div>
      </Container>
    </header>
  )
}

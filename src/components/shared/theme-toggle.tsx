'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { readonly className?: string }) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () =>
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')

  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={toggleTheme}
      disabled={!mounted}
      title={
        resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'
      }
      className={cn(
        'text-text-secondary hover:bg-surface-raised focus-visible:ring-ring focus-visible:ring-offset-background size-11 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
    >
      {mounted && (
        <>
          <Sun
            className={`h-5 w-5 transition-all ${
              resolvedTheme === 'light'
                ? 'scale-100 rotate-0'
                : 'absolute scale-0 rotate-90'
            }`}
          />
          <Moon
            className={`absolute h-5 w-5 transition-all ${
              resolvedTheme === 'dark'
                ? 'scale-100 rotate-0'
                : 'scale-0 rotate-90'
            }`}
          />
        </>
      )}
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}

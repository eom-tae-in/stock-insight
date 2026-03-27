'use client'

import { Moon, Sun, Leaf } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'calm']
    const currentIndex = themes.indexOf(resolvedTheme || 'light')
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  return (
    <Button
      size="icon"
      onClick={cycleTheme}
      className="border-primary/50 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary rounded-full border transition-colors"
    >
      <Sun
        className={`h-5 w-5 transition-all ${
          resolvedTheme === 'light'
            ? 'scale-100 rotate-0'
            : 'absolute scale-0 rotate-90'
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 transition-all ${
          resolvedTheme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
        }`}
      />
      <Leaf
        className={`absolute h-5 w-5 transition-all ${
          resolvedTheme === 'calm' || !resolvedTheme
            ? 'scale-100 rotate-0'
            : 'scale-0 rotate-90'
        }`}
      />
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}

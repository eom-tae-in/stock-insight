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
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      className="text-primary hover:bg-primary/10 rounded-full"
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          resolvedTheme === 'light' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
        }`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
          resolvedTheme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
        }`}
      />
      <Leaf
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
          resolvedTheme === 'calm' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'
        }`}
      />
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}

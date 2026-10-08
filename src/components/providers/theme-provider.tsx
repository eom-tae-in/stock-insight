'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes'

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeMigration />
      {children}
    </NextThemesProvider>
  )
}

function ThemeMigration() {
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    document.documentElement.classList.remove('calm')
    if (theme === 'calm') {
      setTheme('system')
    }
  }, [theme, setTheme])

  return null
}

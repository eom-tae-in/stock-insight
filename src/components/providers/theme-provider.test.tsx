import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from './theme-provider'
import { ThemeSelector } from '@/components/shared/theme-selector'

function renderTheme() {
  return render(
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={['light', 'dark']}
    >
      <ThemeSelector />
    </ThemeProvider>
  )
}

describe('browser theme preference', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      })
    )
  })

  it('defaults to the system preference without saving a fixed mode', async () => {
    renderTheme()
    expect(screen.getByRole('radio', { name: '시스템' })).toBeChecked()
    await waitFor(() => expect(document.documentElement).toHaveClass('light'))
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('migrates calm to system and removes the obsolete class', async () => {
    localStorage.setItem('theme', 'calm')
    document.documentElement.className = 'calm'
    renderTheme()
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('system'))
    expect(screen.getByRole('radio', { name: '시스템' })).toBeChecked()
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('calm')
  })

  it.each(['light', 'dark'])('preserves a saved %s preference', async mode => {
    localStorage.setItem('theme', mode)
    renderTheme()
    await waitFor(() => expect(document.documentElement).toHaveClass(mode))
    expect(localStorage.getItem('theme')).toBe(mode)
  })

  it('saves selections, supports arrow keys and restores system mode', async () => {
    const user = userEvent.setup()
    renderTheme()
    await user.click(screen.getByRole('radio', { name: '라이트' }))
    expect(localStorage.getItem('theme')).toBe('light')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: '다크' })).toBeChecked()
    expect(localStorage.getItem('theme')).toBe('dark')
    await user.click(screen.getByRole('radio', { name: '시스템' }))
    expect(localStorage.getItem('theme')).toBe('system')
    expect(document.documentElement).toHaveClass('light')
  })
})

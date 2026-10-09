import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderToString } from 'react-dom/server'
import { ThemeToggle } from './theme-toggle'

const themeMock = vi.hoisted(() => ({
  resolvedTheme: 'light' as string | undefined,
  setTheme: vi.fn(),
}))

vi.mock('next-themes', () => ({
  useTheme: () => themeMock,
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    themeMock.resolvedTheme = 'light'
    themeMock.setTheme.mockReset()
  })

  it('서버 렌더링 제목은 저장된 테마와 관계없이 동일하다', () => {
    themeMock.resolvedTheme = 'dark'
    const dark = renderToString(<ThemeToggle />)
    themeMock.resolvedTheme = 'light'
    expect(renderToString(<ThemeToggle />)).toBe(dark)
    expect(dark).toContain('title="테마 전환"')
  })

  it('renders an accessible theme toggle button after mount', async () => {
    render(<ThemeToggle />)

    expect(
      await screen.findByRole('button', { name: '테마 전환' })
    ).toBeInTheDocument()
  })

  it.each([
    ['light', 'dark'],
    ['dark', 'light'],
    [undefined, 'dark'],
  ])('cycles from %s to %s', async (resolvedTheme, expectedTheme) => {
    const user = userEvent.setup()
    themeMock.resolvedTheme = resolvedTheme

    render(<ThemeToggle />)
    await user.click(await screen.findByRole('button', { name: '테마 전환' }))

    await waitFor(() => {
      expect(themeMock.setTheme).toHaveBeenCalledWith(expectedTheme)
    })
  })
})

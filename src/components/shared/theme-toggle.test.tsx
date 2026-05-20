import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  it('renders an accessible theme toggle button after mount', async () => {
    render(<ThemeToggle />)

    expect(
      await screen.findByRole('button', { name: '테마 전환' })
    ).toBeInTheDocument()
  })

  it.each([
    ['light', 'dark'],
    ['dark', 'calm'],
    ['calm', 'light'],
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

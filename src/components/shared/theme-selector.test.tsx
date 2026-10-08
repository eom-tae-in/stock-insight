import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeSelector } from './theme-selector'

const themeMock = vi.hoisted<{
  theme: string | undefined
  setTheme: ReturnType<typeof vi.fn>
}>(() => ({ theme: undefined, setTheme: vi.fn() }))

vi.mock('next-themes', () => ({ useTheme: () => themeMock }))

describe('ThemeSelector hydration', () => {
  it.each(['light', 'dark'])(
    'restores a saved %s theme without a hydration error',
    async theme => {
      themeMock.theme = undefined
      const container = document.createElement('div')
      container.innerHTML = renderToString(<ThemeSelector />)
      document.body.append(container)
      themeMock.theme = theme
      const errors: unknown[] = []
      let root: ReturnType<typeof hydrateRoot> | undefined
      try {
        await act(async () => {
          root = hydrateRoot(container, <ThemeSelector />, {
            onRecoverableError: error => errors.push(error),
          })
        })
        expect(errors).toEqual([])
        expect(container.querySelector(`input[value="${theme}"]`)).toBeChecked()
      } finally {
        await act(async () => root?.unmount())
        container.remove()
      }
    }
  )
})

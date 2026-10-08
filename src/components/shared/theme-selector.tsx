'use client'

import { useEffect, useId, useRef, useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'

const modes = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '라이트' },
  { value: 'dark', label: '다크' },
] as const

const subscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

export function ThemeSelector({
  autoFocus = false,
}: {
  readonly autoFocus?: boolean
}) {
  const id = useId()
  const groupRef = useRef<HTMLFieldSetElement>(null)
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot
  )
  const selectedTheme = mounted ? (theme ?? 'system') : 'system'

  useEffect(() => {
    if (autoFocus) {
      groupRef.current
        ?.querySelector<HTMLInputElement>('input:checked')
        ?.focus()
    }
  }, [autoFocus])

  return (
    <fieldset ref={groupRef} className="space-y-2">
      <legend className="text-text-secondary mb-2 text-xs font-medium">
        화면 모드
      </legend>
      <div className="bg-surface-raised flex rounded-md p-1">
        {modes.map(mode => (
          <label key={mode.value} className="relative flex-1 cursor-pointer">
            <input
              type="radio"
              name={id}
              value={mode.value}
              checked={selectedTheme === mode.value}
              onChange={() => setTheme(mode.value)}
              aria-describedby={`${id}-description`}
              className="peer sr-only"
            />
            <span className="text-text-secondary peer-checked:bg-brand-subtle peer-checked:text-brand-text peer-focus-visible:ring-ring peer-focus-visible:ring-offset-background flex min-h-9 items-center justify-center rounded-md px-2 text-xs peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2">
              {mode.label}
            </span>
          </label>
        ))}
      </div>
      <p id={`${id}-description`} className="text-tertiary text-xs">
        {selectedTheme === 'light' || selectedTheme === 'dark'
          ? '이 기기(브라우저)에 저장돼요.'
          : 'prefers-color-scheme을 따라요.'}
      </p>
    </fieldset>
  )
}

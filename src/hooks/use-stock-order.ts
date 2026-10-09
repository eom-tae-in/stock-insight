'use client'

import { useSyncExternalStore } from 'react'
import { z } from 'zod'

const key = 'stock-sort-order'
const eventName = 'stock-insight:stock-order'
const orderSchema = z.record(z.string(), z.number().int().nonnegative())
const subscribe = (notify: () => void) => {
  const storage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) notify()
  }
  window.addEventListener('storage', storage)
  window.addEventListener(eventName, notify)
  return () => {
    window.removeEventListener('storage', storage)
    window.removeEventListener(eventName, notify)
  }
}
const snapshot = () => window.localStorage.getItem(key)
const serverSnapshot = () => null

export function useStockOrder<T extends { readonly id: string }>(
  records: readonly T[]
) {
  const stored = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  let order: Readonly<Record<string, number>> = {}
  if (stored) {
    try {
      const parsed = orderSchema.safeParse(JSON.parse(stored))
      if (parsed.success) order = parsed.data
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error
    }
  }
  const ordered = [...records].sort(
    (a, b) => (order[a.id] ?? Infinity) - (order[b.id] ?? Infinity)
  )
  const saveOrder = (next: readonly T[]) => {
    const values = Object.fromEntries(
      next.map((item, index) => [item.id, index])
    )
    window.localStorage.setItem(key, JSON.stringify(values))
    window.dispatchEvent(new Event(eventName))
  }
  return { ordered, saveOrder }
}

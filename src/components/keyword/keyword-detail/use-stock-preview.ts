'use client'

import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'

const stockSchema = z.object({
  ticker: z.string().min(1),
  companyName: z.string(),
  priceData: z.array(
    z.object({ date: z.string(), price: z.number().finite() })
  ),
})
type PreviewStock = z.infer<typeof stockSchema>

export function useStockPreview({
  ticker,
  ready,
  condition,
  setStock,
  setLoading,
}: {
  readonly ticker?: string
  readonly ready: boolean
  readonly condition: string
  readonly setStock: (stock: PreviewStock | null) => void
  readonly setLoading: (loading: boolean) => void
}) {
  const [enabled, setEnabled] = useState(true)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    if (!ready || !ticker || !enabled) return
    const controller = new AbortController()
    request.current = controller
    const previewTicker = ticker
    setLoading(true)
    async function load() {
      try {
        const response = await fetch(
          `/api/stocks/${encodeURIComponent(previewTicker)}`,
          { signal: controller.signal }
        )
        if (!response.ok)
          throw new Error('종목 비교 데이터를 불러오지 못했습니다')
        const body: unknown = await response.json()
        const parsed = z.object({ data: stockSchema }).parse(body)
        if (!controller.signal.aborted) setStock(parsed.data)
      } catch {
        if (!controller.signal.aborted)
          toast.error('종목 비교 데이터를 불러오지 못했습니다')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => {
      controller.abort()
      setLoading(false)
    }
  }, [ticker, ready, condition, enabled, setStock, setLoading])
  return () => {
    request.current?.abort()
    setLoading(false)
    setEnabled(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('preview')
    window.history.replaceState(
      window.history.state,
      '',
      url.pathname + url.search + url.hash
    )
  }
}

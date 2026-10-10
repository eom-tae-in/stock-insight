import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useStockPreview } from './use-stock-preview'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
describe('useStockPreview', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('waits for analysis selection, loads typed data and removes only preview on close', async () => {
    window.history.replaceState(
      null,
      '',
      '/keywords/k1?preview=NVDA&region=KR&searchType=NEWS'
    )
    const setStock = vi.fn()
    const setLoading = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json({
          data: {
            ticker: 'NVDA',
            companyName: 'NVIDIA',
            priceData: [{ date: '2026-10-05', price: 180 }],
          },
        })
      )
    )
    const { result, rerender } = renderHook(
      ({ ready }) =>
        useStockPreview({
          ticker: 'NVDA',
          ready,
          condition: 'KR:NEWS',
          setStock,
          setLoading,
        }),
      { initialProps: { ready: false } }
    )
    expect(fetch).not.toHaveBeenCalled()
    rerender({ ready: true })
    await waitFor(() =>
      expect(setStock).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'NVDA' })
      )
    )
    act(() => result.current())
    expect(window.location.search).toBe('?region=KR&searchType=NEWS')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('aborts a pending request on close and ignores its late response', async () => {
    let finish: ((response: Response) => void) | undefined
    const setStock = vi.fn()
    const setLoading = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>(resolve => {
            finish = resolve
          })
      )
    )
    const { result } = renderHook(() =>
      useStockPreview({
        ticker: 'NVDA',
        ready: true,
        condition: 'GLOBAL:WEB',
        setStock,
        setLoading,
      })
    )
    act(() => result.current())
    await act(async () => {
      finish?.(
        Response.json({
          data: { ticker: 'NVDA', companyName: 'NVIDIA', priceData: [] },
        })
      )
    })
    expect(setStock).not.toHaveBeenCalled()
    expect(setLoading).toHaveBeenLastCalledWith(false)
  })
  it('rejects malformed response data', async () => {
    const setStock = vi.fn()
    const setLoading = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ data: { ticker: 'NVDA', priceData: 'bad' } })
        )
    )
    renderHook(() =>
      useStockPreview({
        ticker: 'NVDA',
        ready: true,
        condition: 'GLOBAL:WEB',
        setStock,
        setLoading,
      })
    )
    await waitFor(() => expect(setLoading).toHaveBeenLastCalledWith(false))
    expect(setStock).not.toHaveBeenCalled()
  })

  it('cancels the old selection when analysis conditions change', () => {
    const requests: AbortSignal[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options: RequestInit) => {
        if (options.signal) requests.push(options.signal)
        return new Promise<Response>(() => {})
      })
    )
    const setStock = vi.fn()
    const setLoading = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ condition }) =>
        useStockPreview({
          ticker: 'NVDA',
          ready: true,
          condition,
          setStock,
          setLoading,
        }),
      { initialProps: { condition: 'GLOBAL:WEB' } }
    )
    rerender({ condition: 'KR:NEWS' })
    expect(requests).toHaveLength(2)
    expect(requests[0]?.aborted).toBe(true)
    expect(requests[1]?.aborted).toBe(false)
    unmount()
    expect(requests[1]?.aborted).toBe(true)
  })
})

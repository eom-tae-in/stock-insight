import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useStockOrder } from './use-stock-order'

const records = [{ id: 'a' }, { id: 'b' }, { id: 'new' }] as const
describe('공유 종목 순서', () => {
  beforeEach(() => localStorage.clear())
  it('저장 순서를 복원하고 새 종목은 서버 순서로 뒤에 둔다', () => {
    localStorage.setItem(
      'stock-sort-order',
      JSON.stringify({ b: 0, a: 1, deleted: 2 })
    )
    const { result } = renderHook(() => useStockOrder(records))
    expect(result.current.ordered.map(item => item.id)).toEqual([
      'b',
      'a',
      'new',
    ])
  })
  it.each(['{', '[]', '{"a":-1}', '{"a":"first"}'])(
    '잘못된 저장값 %s는 서버 순서를 유지한다',
    saved => {
      localStorage.setItem('stock-sort-order', saved)
      const { result } = renderHook(() => useStockOrder(records))
      expect(result.current.ordered).toEqual(records)
    }
  )
  it('한 탭의 두 소비자에 저장한 순서를 즉시 반영한다', () => {
    const first = renderHook(() => useStockOrder(records))
    const second = renderHook(() => useStockOrder(records))
    act(() => first.result.current.saveOrder([...records].reverse()))
    expect(second.result.current.ordered.map(item => item.id)).toEqual([
      'new',
      'b',
      'a',
    ])
    expect(
      JSON.parse(localStorage.getItem('stock-sort-order') ?? '{}')
    ).toEqual({ new: 0, b: 1, a: 2 })
  })
  it('다른 탭의 저장과 초기화를 반영한다', () => {
    const { result } = renderHook(() => useStockOrder(records))
    act(() => {
      localStorage.setItem('stock-sort-order', '{"b":0}')
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'stock-sort-order' })
      )
    })
    expect(result.current.ordered.map(item => item.id)).toEqual([
      'b',
      'a',
      'new',
    ])
    act(() => {
      localStorage.clear()
      window.dispatchEvent(new StorageEvent('storage', { key: null }))
    })
    expect(result.current.ordered).toEqual(records)
  })
})

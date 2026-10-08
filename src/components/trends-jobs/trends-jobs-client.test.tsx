import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ky from 'ky'
import { TrendsJobsClient } from './trends-jobs-client'

vi.mock('ky', () => ({ default: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('Trends 작업 요청과 복구', () => {
  it('진행 중 갱신이 실패해도 취소한 폴링 요청을 계속 보내지 않는다', async () => {
    vi.useFakeTimers()
    const now = new Date()
    vi.mocked(ky)
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: crypto.randomUUID(),
            generation: 1,
            state: 'PENDING',
            query: {
              keyword: 'coffee',
              geo: '',
              timeframe: 'today 5-y',
              gprop: '',
            },
            requestedAt: now.toISOString(),
            deadline: new Date(now.getTime() + 300000).toISOString(),
            points: [],
            errorCode: null,
            provider: null,
          }),
          { status: 202 }
        )
      )
      .mockRejectedValue(new Error('Refresh unavailable'))
    render(<TrendsJobsClient csrf="csrf-token" />)
    fireEvent.change(screen.getByLabelText('검색어'), {
      target: { value: 'coffee' },
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '분석 요청' }))
    })
    expect(screen.getByText('대기 중')).toBeVisible()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '다시 분석' }))
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      '요청을 완료하지 못했어요'
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(ky).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: '상태 다시 확인' })).toBeEnabled()
  })

  it('거절된 로그인 상태를 안내한다', async () => {
    vi.mocked(ky).mockResolvedValue(new Response('{}', { status: 401 }))
    const user = userEvent.setup()
    render(<TrendsJobsClient csrf="csrf-token" />)
    await user.type(screen.getByLabelText('검색어'), 'coffee')
    await user.click(screen.getByRole('button', { name: '분석 요청' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('로그인이 만료')
    expect(screen.getByRole('link', { name: '로그인 화면' })).toHaveAttribute(
      'href',
      '/login'
    )
  })

  it('불확실하게 실패한 같은 요청을 같은 멱등 키로 재시도한다', async () => {
    vi.mocked(ky).mockRejectedValue(new Error('Connection lost'))
    const user = userEvent.setup()
    render(<TrendsJobsClient csrf="csrf-token" />)
    await user.type(screen.getByLabelText('검색어'), '  coffee   beans  ')
    await user.click(screen.getByRole('button', { name: '분석 요청' }))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: '분석 요청' }))
    await waitFor(() => expect(ky).toHaveBeenCalledTimes(2))
    const first = vi.mocked(ky).mock.calls[0]?.[1]
    const second = vi.mocked(ky).mock.calls[1]?.[1]
    expect(first?.json).toEqual({
      keyword: 'coffee beans',
      geo: '',
      timeframe: 'today 5-y',
      gprop: '',
    })
    expect(first?.headers).toEqual(second?.headers)
    expect(first?.headers).toMatchObject({ 'X-CSRF-Token': 'csrf-token' })
  })

  it('입력을 변경하면 새로운 요청 키를 사용한다', async () => {
    vi.mocked(ky).mockRejectedValue(new Error('Connection lost'))
    const user = userEvent.setup()
    render(<TrendsJobsClient csrf="csrf-token" />)
    const input = screen.getByLabelText('검색어')
    await user.type(input, 'coffee')
    await user.click(screen.getByRole('button', { name: '분석 요청' }))
    await screen.findByRole('alert')
    await user.clear(input)
    await user.type(input, 'tea')
    await user.click(screen.getByRole('button', { name: '분석 요청' }))
    await waitFor(() => expect(ky).toHaveBeenCalledTimes(2))
    expect(vi.mocked(ky).mock.calls[0]?.[1]?.headers).not.toEqual(
      vi.mocked(ky).mock.calls[1]?.[1]?.headers
    )
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'
import { apiFetchJson } from '@/lib/fetch-client'
import type { AdminSummary } from '@/server/admin-service'

const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/lib/fetch-client', () => ({
  apiFetchJson: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: toastMock,
}))

function makeSummary(overrides: Partial<AdminSummary> = {}): AdminSummary {
  return {
    generatedAt: '2026-05-18T12:00:00.000Z',
    scope: 'global',
    scopeMessage: '서비스 역할 키로 전체 운영 데이터를 표시합니다.',
    environment: {
      nodeEnv: 'test',
      vercelEnv: null,
      vercelUrl: null,
    },
    statuses: [
      {
        id: 'supabase',
        label: 'Supabase',
        status: 'ok',
        message: '연결 정상',
      },
    ],
    metrics: [
      {
        id: 'analyses',
        label: '분석 수',
        value: 3,
        helper: '저장된 분석',
      },
    ],
    recentAnalyses: [
      {
        id: 'analysis-1',
        keyword: 'AI',
        region: 'GLOBAL',
        searchType: 'WEB',
        period: '5Y',
        pointCount: 260,
        firstDate: '2021-01-01',
        lastDate: '2026-01-01',
        refreshedAt: '2026-05-18T00:00:00.000Z',
      },
    ],
    recentOverlays: [
      {
        id: 'overlay-1',
        keyword: 'AI',
        conditionLabel: 'GLOBAL / WEB / 5Y',
        ticker: 'AAPL',
        companyName: 'Apple Inc.',
        pointCount: 260,
        firstDate: '2021-01-01',
        lastDate: '2026-01-01',
        refreshedAt: '2026-05-18T00:00:00.000Z',
      },
    ],
    anomalies: [],
    ...overrides,
  }
}

describe('AdminDashboardClient integration', () => {
  beforeEach(() => {
    vi.mocked(apiFetchJson).mockReset()
    toastMock.success.mockReset()
    toastMock.error.mockReset()
  })

  it('renders the initial admin summary tables and metrics', () => {
    render(<AdminDashboardClient initialSummary={makeSummary()} />)

    expect(
      screen.getByRole('heading', { name: '운영 대시보드' })
    ).toBeInTheDocument()
    expect(screen.getByText('Supabase')).toBeInTheDocument()
    expect(screen.getByText('연결 정상')).toBeInTheDocument()
    expect(screen.getByText('분석 수')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getAllByText('AI')).toHaveLength(2)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('점검할 이상 항목이 없습니다.')).toBeInTheDocument()
  })

  it('refreshes the summary and updates the rendered data', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockResolvedValue(
      makeSummary({
        metrics: [{ id: 'analyses', label: '분석 수', value: 8 }],
        statuses: [
          {
            id: 'supabase',
            label: 'Supabase',
            status: 'warning',
            message: '점검 필요',
          },
        ],
      })
    )

    render(<AdminDashboardClient initialSummary={makeSummary()} />)

    await user.click(screen.getByRole('button', { name: /새로고침/ }))

    await waitFor(() =>
      expect(apiFetchJson).toHaveBeenCalledWith('/api/admin/summary')
    )
    expect(await screen.findByText('점검 필요')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(toastMock.success).toHaveBeenCalledWith(
      '관리자 대시보드를 새로고침했습니다.'
    )
  })

  it('keeps the current summary and shows a toast when refresh fails', async () => {
    const user = userEvent.setup()
    vi.mocked(apiFetchJson).mockRejectedValue(new Error('권한이 없습니다.'))

    render(<AdminDashboardClient initialSummary={makeSummary()} />)

    await user.click(screen.getByRole('button', { name: /새로고침/ }))

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith('권한이 없습니다.')
    )
    expect(screen.getByText('연결 정상')).toBeInTheDocument()
  })
})

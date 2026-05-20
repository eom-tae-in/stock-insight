import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { generateTableExcelFile } from '@/lib/export'
import { toast } from 'sonner'
import { TableHeader } from './table-header'

vi.mock('@/lib/export', () => ({
  generateTableExcelFile: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const tableData = [
  {
    date: '2026-05-15',
    close: 100,
    trends: 50,
    ma13: 95,
    yoy: 10,
  },
]

describe('TableHeader', () => {
  beforeEach(() => {
    vi.mocked(generateTableExcelFile).mockReset()
    vi.mocked(toast.success).mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it('renders the ticker, company name, and download button', () => {
    render(
      <TableHeader
        ticker="AAPL"
        companyName="Apple Inc."
        tableData={tableData}
      />
    )

    expect(
      screen.getByRole('heading', { name: 'AAPL - Apple Inc.' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: '테이블 데이터를 엑셀 파일로 다운로드',
      })
    ).toBeInTheDocument()
  })

  it('generates an Excel file and shows a success toast when clicked', async () => {
    const user = userEvent.setup()
    render(
      <TableHeader
        ticker="AAPL"
        companyName="Apple Inc."
        tableData={tableData}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: '테이블 데이터를 엑셀 파일로 다운로드',
      })
    )

    expect(generateTableExcelFile).toHaveBeenCalledWith('AAPL', tableData)
    expect(toast.success).toHaveBeenCalledWith(
      '엑셀 파일이 다운로드되었습니다.'
    )
  })

  it('shows an error toast when Excel generation fails', async () => {
    const user = userEvent.setup()
    vi.mocked(generateTableExcelFile).mockImplementation(() => {
      throw new Error('파일 생성 실패')
    })

    render(
      <TableHeader
        ticker="AAPL"
        companyName="Apple Inc."
        tableData={tableData}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: '테이블 데이터를 엑셀 파일로 다운로드',
      })
    )

    expect(toast.error).toHaveBeenCalledWith('파일 생성 실패')
  })
})

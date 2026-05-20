import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProgressIndicator } from './progress-indicator'

describe('ProgressIndicator', () => {
  it.each([
    ['idle', '조회할 종목을 입력해주세요'],
    ['fetching-price', '주가 데이터 수집 중...'],
    ['fetching-trends', 'Google Trends 데이터 수집 중...'],
    ['calculating', '기술 지표 계산 중...'],
    ['saving', '데이터 저장 중...'],
    ['complete', '조회 완료'],
    ['error', '오류 발생'],
  ] as const)(
    'renders the default message for %s stage',
    (stage, expectedMessage) => {
      render(<ProgressIndicator stage={stage} message="" />)

      expect(screen.getByText(expectedMessage)).toBeInTheDocument()
    }
  )

  it('prefers a custom message over the default stage message', () => {
    render(<ProgressIndicator stage="saving" message="저장 준비 중" />)

    expect(screen.getByText('저장 준비 중')).toBeInTheDocument()
    expect(screen.queryByText('데이터 저장 중...')).not.toBeInTheDocument()
  })

  it('renders an error detail when provided', () => {
    render(
      <ProgressIndicator
        stage="error"
        message=""
        error="Google Trends 요청이 실패했습니다."
      />
    )

    expect(screen.getByText('오류 발생')).toBeInTheDocument()
    expect(
      screen.getByText('Google Trends 요청이 실패했습니다.')
    ).toBeInTheDocument()
  })
})

import { toPng } from 'html-to-image'
import { format } from 'date-fns'

interface CaptureChartOptions {
  ticker: string
  chartName?: string
}

/**
 * HTML 요소를 PNG로 캡처하고 다운로드합니다.
 */
export async function captureChartAsPng(
  element: HTMLElement,
  { ticker, chartName = 'unified-chart' }: CaptureChartOptions
): Promise<void> {
  if (!element) {
    throw new Error('차트 요소를 찾을 수 없습니다.')
  }

  // 현재 테마 감지 (dark 또는 light/calm)
  const isDark = document.documentElement.classList.contains('dark')

  try {
    // toPng로 이미지 데이터 URL 생성
    const dataUrl = await toPng(element, {
      // 배경색 설정 (다크 모드: 어두운 배경, 라이트 모드: 흰 배경)
      backgroundColor: isDark ? '#09090b' : '#ffffff', // zinc-950 / white
      // Retina 디스플레이 지원
      pixelRatio: 2,
      // 외부 폰트 포함 (Google Fonts 등)
      skipFonts: false,
      // 추가 여유 공간 (px)
      cacheBust: true,
    })

    // 파일명: {ticker}_{chartName}_{YYYYMMDD}.png
    const filename = `${ticker}_${chartName}_${format(new Date(), 'yyyyMMdd')}.png`

    // <a> 태그로 다운로드 트리거
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PNG 생성에 실패했습니다.'
    throw new Error(`차트 캡처 실패: ${message}`)
  }
}

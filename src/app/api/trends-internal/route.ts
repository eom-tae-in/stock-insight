/**
 * 로컬 개발용 Google Trends API Route
 * (배포 시에는 /api/trends Python Function 사용)
 *
 * POST /api/trends-internal
 * Body: { keyword, geo, timeframe, gprop }
 * Response: [{ date, value }, ...]
 */

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keyword, geo = '', timeframe = '5y', gprop = '' } = body

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      )
    }

    // 로컬 개발: Python 스크립트 호출
    try {
      const pythonPath = 'python3'
      const scriptPath = path.join(process.cwd(), 'src', 'lib', 'get_trends.py')

      const { stdout } = await execFileAsync(pythonPath, [
        scriptPath,
        keyword,
        geo,
        timeframe,
        gprop,
      ])

      const trendsData = JSON.parse(stdout)
      return NextResponse.json(trendsData, { status: 200 })
    } catch (pythonError) {
      // Python/pytrends 실패 시 경고 로그만 출력하고 빈 배열 반환
      // (로컬 개발에서 pytrends 미설치 시 우아한 실패 처리)
      console.warn(
        `Trends data not available (Python error): ${pythonError instanceof Error ? pythonError.message : 'Unknown error'}`
      )

      // 빈 배열로 조회 계속 진행 (부분 성공)
      return NextResponse.json([], { status: 200 })
    }
  } catch (error) {
    console.error('Error in trends-internal API:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Failed to parse response' },
        { status: 500 }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

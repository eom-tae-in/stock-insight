/**
 * 로컬 개발용 Google Trends API Route
 * GET /api/trends-internal?keyword=...
 * POST /api/trends-internal
 * Response: [{ date, value }, ...]
 */

import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

/**
 * Python 스크립트 실행
 */
async function getTrendsData(
  keyword: string,
  geo: string,
  timeframe: string,
  gprop: string
) {
  try {
    const pythonPath = path.join(process.cwd(), '.venv', 'bin', 'python3')
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'get_trends.py')

    const { stdout, stderr } = await execFileAsync(pythonPath, [
      scriptPath,
      keyword,
      geo,
      timeframe,
      gprop,
    ])

    // stderr 확인
    if (stderr) {
      console.warn(`Python stderr: ${stderr}`)
    }

    // stdout 파싱
    try {
      const trendsData = JSON.parse(stdout)
      return NextResponse.json(trendsData, { status: 200 })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('stdout content:', stdout)
      return NextResponse.json([], { status: 200 })
    }
  } catch (pythonError) {
    console.error(
      `Python execution failed: ${pythonError instanceof Error ? pythonError.message : 'Unknown error'}`
    )
    if (pythonError instanceof Error && 'stderr' in pythonError) {
      const errorWithStderr = pythonError as Error & { stderr?: string }
      console.error('stderr:', errorWithStderr.stderr)
    }
    return NextResponse.json([], { status: 200 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const keyword = request.nextUrl.searchParams.get('keyword') || ''
    const geo = request.nextUrl.searchParams.get('geo') || ''
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '5y'
    const gprop = request.nextUrl.searchParams.get('gprop') || ''

    if (!keyword || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: 'Keyword is required' },
        { status: 400 }
      )
    }

    return await getTrendsData(keyword, geo, timeframe, gprop)
  } catch (error) {
    console.error('trends-internal GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

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

    return await getTrendsData(keyword, geo, timeframe, gprop)
  } catch (error) {
    console.error('trends-internal POST error:', error)
    return NextResponse.json([], { status: 200 })
  }
}

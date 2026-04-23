/**
 * 키워드 검색 페이지 - 리다이렉트
 * Route: /keywords/search → /keyword-analysis/new
 *
 * 이전 경로 호환성을 위한 리다이렉트
 * 모든 요청을 /keyword-analysis/new로 전달
 */

import { redirect } from 'next/navigation'

export default function KeywordSearchPage() {
  redirect('/keyword-analysis/new')
}

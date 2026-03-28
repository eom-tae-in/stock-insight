/**
 * 브라우저 클라이언트 - Supabase Auth용
 * Client Component ('use client')에서만 사용
 * OAuth 로그인/로그아웃 처리
 */

import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return browserClient
}

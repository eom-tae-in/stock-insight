/**
 * OAuth 로그인 버튼
 * Client Component - Google OAuth 로그인 처리
 */

'use client'

import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface OAuthLoginButtonProps {
  provider: 'google'
  className?: string
  nextPath?: string
}

export function OAuthLoginButton({
  provider,
  className,
  nextPath,
}: OAuthLoginButtonProps) {
  const supabase = createSupabaseBrowserClient()

  const handleLogin = async () => {
    try {
      const callbackUrl = new URL('/api/auth/callback', window.location.origin)

      if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) {
        callbackUrl.searchParams.set('next', nextPath)
      }

      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })
    } catch (error) {
      console.error(`${provider} 로그인 오류:`, error)
    }
  }

  return (
    <Button
      onClick={handleLogin}
      className={cn('h-12 gap-3 text-sm', className)}
      variant="outline"
      size="lg"
    >
      <Image src="/auth/google.svg" width={18} height={18} alt="" aria-hidden />
      Google로 로그인
    </Button>
  )
}

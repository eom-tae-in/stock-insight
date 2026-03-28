/**
 * OAuth 로그인 버튼
 * Client Component - Google OAuth 로그인 처리
 */

'use client'

import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

interface OAuthLoginButtonProps {
  provider: 'google'
  className?: string
}

export function OAuthLoginButton({
  provider,
  className,
}: OAuthLoginButtonProps) {
  const supabase = createSupabaseBrowserClient()

  const handleLogin = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      })
    } catch (error) {
      console.error(`${provider} 로그인 오류:`, error)
    }
  }

  const providerLabel = 'Google'
  const providerEmoji = '🔍'

  return (
    <Button
      onClick={handleLogin}
      className={className}
      variant="outline"
      size="lg"
    >
      {providerEmoji} {providerLabel}로 로그인
    </Button>
  )
}

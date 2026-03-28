/**
 * 이메일 + 비밀번호 회원가입 폼 (OTP 이메일 인증 방식)
 * Client Component
 *
 * 플로우:
 * 1. 이메일 입력 + "인증 이메일 발송" 버튼 → OTP 메일 발송
 * 2. 사용자가 이메일 링크 클릭 → /api/auth/callback → 세션 생성 → /set-password 이동
 * 3. 비밀번호 설정 페이지에서 비밀번호 설정
 */

'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const supabase = createSupabaseBrowserClient()

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    // 기본 이메일 형식 확인
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('유효한 이메일을 입력해주세요.')
      return
    }

    setIsSendingEmail(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/auth/callback?next=/set-password`,
        },
      })

      if (error) {
        if (error.message === 'User already registered') {
          toast.error('이미 가입된 이메일입니다.')
        } else {
          toast.error(error.message || '이메일 발송에 실패했습니다.')
        }
        return
      }

      setIsEmailSent(true)
      toast.success('인증 이메일이 발송되었습니다!')
    } catch (error) {
      console.error('OTP 발송 오류:', error)
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isEmailSent) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-primary/10 rounded-lg p-4">
          <p className="text-primary text-sm font-medium">
            ✓ 인증 이메일이 발송되었습니다!
          </p>
          <p className="text-muted-foreground mt-2 text-xs">
            {email}로 받은 이메일의 링크를 클릭하여 인증을 완료하세요.
          </p>
        </div>
        <button
          onClick={() => {
            setIsEmailSent(false)
            setEmail('')
          }}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          다른 이메일로 가입
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={isSendingEmail}
          className="h-10"
        />
        <Button
          onClick={handleSendOtp}
          variant="default"
          size="lg"
          disabled={isSendingEmail || !email.trim()}
          className="whitespace-nowrap"
        >
          {isSendingEmail ? '발송 중...' : '인증 이메일 발송'}
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="text-primary hover:underline">
          로그인
        </a>
      </p>
    </div>
  )
}

/**
 * 비밀번호 설정 폼
 * Client Component
 * 비밀번호 요구사항: 8자 이상 + 특수문자 1개 이상
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const PASSWORD_REGEX = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

function validatePassword(password: string) {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('8자 이상이어야 합니다')
  }

  if (!PASSWORD_REGEX.test(password) && password.length > 0) {
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('특수문자를 포함해야 합니다')
    }
  }

  return errors
}

export function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const passwordErrors = validatePassword(password)
  const confirmPasswordError =
    confirmPassword && password !== confirmPassword
      ? '비밀번호가 일치하지 않습니다'
      : null

  const isFormValid =
    password &&
    confirmPassword &&
    passwordErrors.length === 0 &&
    !confirmPasswordError

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid) {
      toast.error('비밀번호 조건을 확인해주세요.')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        toast.error(error.message || '비밀번호 설정에 실패했습니다.')
        return
      }

      // 비밀번호 설정 완료 → 로그아웃 → 로그인 페이지로 이동
      await supabase.auth.signOut()
      toast.success('비밀번호가 설정되었습니다! 로그인해주세요.')
      router.push('/login')
    } catch (error) {
      console.error('비밀번호 설정 오류:', error)
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLoading}
          className="h-10"
        />
        {password && (
          <div className="space-y-1 text-xs">
            {passwordErrors.map((error, idx) => (
              <p key={idx} className="text-red-500">
                ✗ {error}
              </p>
            ))}
            {passwordErrors.length === 0 && (
              <p className="text-green-500">✓ 비밀번호 조건 충족</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          className="h-10"
        />
        {confirmPassword && confirmPasswordError && (
          <p className="text-xs text-red-500">✗ {confirmPasswordError}</p>
        )}
        {confirmPassword &&
          !confirmPasswordError &&
          password === confirmPassword && (
            <p className="text-xs text-green-500">✓ 비밀번호가 일치합니다</p>
          )}
      </div>

      <Button
        type="submit"
        className="w-full"
        variant="default"
        size="lg"
        disabled={isLoading || !isFormValid}
      >
        {isLoading ? '설정 중...' : '비밀번호 설정 완료'}
      </Button>
    </form>
  )
}

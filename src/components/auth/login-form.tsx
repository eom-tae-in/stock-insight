/**
 * 이메일 + 비밀번호 로그인 폼
 * Client Component
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

function getSafeNextPath(input: string | null): string {
  if (!input || !input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

interface LoginFormProps {
  nextPath?: string
}

export function LoginForm({ nextPath = '/' }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }

    if (!password) {
      toast.error('비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.')
        } else {
          toast.error(error.message || '로그인에 실패했습니다.')
        }
        return
      }

      toast.success('로그인 성공했습니다!')
      const next = getSafeNextPath(nextPath)
      router.push(next)
      router.refresh()
    } catch (error) {
      console.error('로그인 오류:', error)
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        type="email"
        placeholder="이메일"
        value={email}
        onChange={e => setEmail(e.target.value)}
        disabled={isLoading}
        className="h-10"
      />
      <Input
        type="password"
        placeholder="비밀번호"
        value={password}
        onChange={e => setPassword(e.target.value)}
        disabled={isLoading}
        className="h-10"
      />
      <Button
        type="submit"
        className="w-full"
        variant="default"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? '로그인 중...' : '로그인'}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        아직 계정이 없으신가요?{' '}
        <a
          href={`/signup${
            nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
          }`}
          className="text-primary hover:underline"
        >
          회원가입
        </a>
      </p>
    </form>
  )
}

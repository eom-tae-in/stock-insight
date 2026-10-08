'use client'

import { useEffect, useState } from 'react'
import type { UserResponse } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { AccountMenu } from './account-menu'
import type { AccountProfile } from '@/lib/app-shell'

export function UserMenu({
  initialProfile,
  mode = 'avatar',
}: {
  readonly initialProfile?: AccountProfile
  readonly mode?: 'profile' | 'avatar' | 'mobile'
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<AccountProfile | null>(
    initialProfile ?? null
  )
  const [pending, setPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  useEffect(() => {
    if (initialProfile) return
    let active = true
    const supabase = createSupabaseBrowserClient()
    void supabase.auth.getUser().then(({ data }: UserResponse) => {
      if (active && data.user?.email)
        setProfile({
          name: data.user.email.split('@')[0],
          email: data.user.email,
        })
    })
    return () => {
      active = false
    }
  }, [initialProfile])

  const handleLogout = async () => {
    setPending(true)
    setErrorMessage(null)
    try {
      const { error } = await createSupabaseBrowserClient().auth.signOut()
      if (error) throw error
      router.push('/login')
      router.refresh()
    } catch (error: unknown) {
      if (!(error instanceof Error)) throw error
      setErrorMessage('로그아웃하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPending(false)
    }
  }
  if (!profile) return null
  return (
    <AccountMenu
      profile={profile}
      mode={mode}
      logout={
        <>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={handleLogout}
            className="w-full justify-start"
          >
            <LogOut aria-hidden />
            로그아웃
          </Button>
          {errorMessage && (
            <p role="alert" className="text-danger p-2 text-xs">
              {errorMessage}
            </p>
          )}
        </>
      }
    />
  )
}

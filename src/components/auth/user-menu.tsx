/**
 * 사용자 메뉴 드롭다운
 * Client Component - 로그인 사용자 정보 표시 및 로그아웃
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function UserMenu() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 현재 사용자 조회
    const supabase = createSupabaseBrowserClient()

    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      setIsLoading(false)
    }

    checkUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (isLoading || !user?.email) {
    return null
  }

  const emailInitial = user.email[0].toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none">
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {emailInitial}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col space-y-1 p-2">
          <p className="text-muted-foreground text-xs font-medium">로그인됨</p>
          <p className="truncate text-sm font-semibold">{user?.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

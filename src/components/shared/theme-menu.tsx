'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeSelector } from './theme-selector'

export function ThemeMenu({ displayName }: { readonly displayName: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label="화면 모드 선택"
          className="h-11 max-w-40"
        >
          <span className="truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="shadow-popover w-[300px] p-3">
        <ThemeSelector autoFocus />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

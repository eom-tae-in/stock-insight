'use client'
import { createContext, useContext } from 'react'
import type { ShellData } from '@/lib/app-shell'

export const ShellContext = createContext<ShellData | null>(null)
export function useShellData() {
  return useContext(ShellContext)
}

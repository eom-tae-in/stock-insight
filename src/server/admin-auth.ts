import { NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createErrorResponse } from '@/lib/api-helpers'

function parseAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false
  return parseAdminEmails().includes(email.trim().toLowerCase())
}

export async function getAdminUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) return null
  return user
}

export async function validateAdminApiAuth(
  supabase: SupabaseClient
): Promise<{ user: User } | NextResponse> {
  const user = await getAdminUser(supabase)

  if (!user) {
    return createErrorResponse('NOT_FOUND', 'Not found', 404)
  }

  return { user }
}

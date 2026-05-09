const PLACEHOLDER_VALUES = new Set([
  '추가해야함',
  '제거예정',
  'your_supabase_publishable_key_here',
  'your_supabase_anon_key_here',
  'your_legacy_supabase_anon_key_here',
  'sb_publishable_your_key_here',
])

function readConfiguredValue(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return undefined
  return trimmed
}

export function getSupabaseUrl() {
  const url =
    readConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ??
    readConfiguredValue(process.env.SUPABASE_URL)

  if (!url) {
    throw new Error('Supabase URL is not configured.')
  }

  return url
}

export function getSupabasePublishableKey() {
  const key =
    readConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    readConfiguredValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ??
    readConfiguredValue(process.env.SUPABASE_KEY)

  if (!key) {
    throw new Error(
      'Supabase publishable key is not configured. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return key
}

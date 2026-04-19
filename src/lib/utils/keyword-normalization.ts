export function normalizeKeywordSpacing(keyword: unknown): string {
  if (typeof keyword !== 'string') return ''

  return keyword.trim().replace(/\s+/g, ' ')
}

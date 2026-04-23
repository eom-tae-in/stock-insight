/**
 * pytrends-parser.ts
 *
 * Purpose:
 * - Convert internal UI/API input values such as GLOBAL, 5Y, WEB
 *   into pytrends-compatible payload values.
 * - Validate input early and fail with clear error messages.
 * - Keep all parsing logic in one place.
 *
 * Example:
 *   const parsed = parsePytrendsParams({
 *     geo: 'GLOBAL',
 *     timeframe: '5Y',
 *     gprop: 'WEB',
 *     keyword: 'tesla',
 *   })
 *
 *   // parsed =>
 *   // {
 *   //   keyword: 'tesla',
 *   //   geo: '',
 *   //   timeframe: 'today 5-y',
 *   //   gprop: '',
 *   //   buildPayloadParams: {
 *   //     kw_list: ['tesla'],
 *   //     timeframe: 'today 5-y',
 *   //     geo: '',
 *   //     gprop: ''
 *   //   }
 *   // }
 */

export type InputGeo =
  | 'GLOBAL'
  | 'US'
  | 'KR'
  | 'JP'
  | 'GB'
  | 'DE'
  | 'FR'
  | 'CA'
  | 'AU'
  | 'IN'
  | 'BR'
  | 'CN'
  | 'TW'
  | 'HK'
  | 'SG'
  | string

export type InputTimeframe =
  | '1H'
  | '4H'
  | '1D'
  | '7D'
  | '1M'
  | '3M'
  | '12M'
  | '1Y'
  | '2Y'
  | '3Y'
  | '4Y'
  | '5Y'
  | 'ALL'
  | string

export type InputGprop =
  | 'WEB'
  | 'IMAGES'
  | 'NEWS'
  | 'YOUTUBE'
  | 'SHOPPING'
  | string

export interface ParsePytrendsParamsInput {
  keyword: string
  geo: InputGeo
  timeframe: InputTimeframe
  gprop: InputGprop
  /**
   * Optional category id for pytrends build_payload(cat=...)
   * Default: 0
   */
  cat?: number
}

export interface ParsedPytrendsParams {
  keyword: string
  geo: string
  timeframe: string
  gprop: string
  cat: number
  buildPayloadParams: {
    kw_list: string[]
    timeframe: string
    geo: string
    gprop: string
    cat: number
  }
}

const GEO_ALIASES: Record<string, string> = {
  GLOBAL: '',
}

const TIMEFRAME_MAP: Record<string, string> = {
  '1H': 'now 1-H',
  '4H': 'now 4-H',
  '1D': 'now 1-d',
  '7D': 'now 7-d',
  '1M': 'today 1-m',
  '3M': 'today 3-m',
  '12M': 'today 12-m',
  '1Y': 'today 12-m',
  '2Y': 'today 2-y',
  '3Y': 'today 3-y',
  '4Y': 'today 4-y',
  '5Y': 'today 5-y',
  ALL: 'all',
}

const GPROP_MAP: Record<string, string> = {
  WEB: '',
  IMAGES: 'images',
  NEWS: 'news',
  YOUTUBE: 'youtube',
  SHOPPING: 'froogle',
}

const SUPPORTED_GPROP_VALUES = Object.keys(GPROP_MAP)
const SUPPORTED_TIMEFRAME_VALUES = Object.keys(TIMEFRAME_MAP)

/**
 * Parses UI/API geo into pytrends geo.
 *
 * Rules:
 * - GLOBAL -> ''
 * - Country code like US/KR/JP stays uppercase
 * - Region-like codes such as US-AL, GB-ENG are allowed as-is after uppercase normalization
 */
export function parseGeo(input: InputGeo): string {
  const raw = normalizeRequiredString(input, 'geo')
  const upper = raw.toUpperCase()

  if (upper in GEO_ALIASES) {
    return GEO_ALIASES[upper]
  }

  // Allow 2-letter country code, e.g. US, KR, JP
  if (/^[A-Z]{2}$/.test(upper)) {
    return upper
  }

  // Allow region/subregion code, e.g. US-AL, GB-ENG
  if (/^[A-Z]{2}-[A-Z0-9]{1,10}$/.test(upper)) {
    return upper
  }

  throw new Error(
    `[pytrends-parser] Invalid geo: "${input}". ` +
      `Use GLOBAL, a 2-letter country code like US/KR/JP, or a regional code like US-AL.`
  )
}

/**
 * Parses internal timeframe enum into pytrends timeframe.
 */
export function parseTimeframe(input: InputTimeframe): string {
  const raw = normalizeRequiredString(input, 'timeframe')
  const upper = raw.toUpperCase()
  const parsed = TIMEFRAME_MAP[upper]

  if (!parsed) {
    throw new Error(
      `[pytrends-parser] Invalid timeframe: "${input}". ` +
        `Supported values: ${SUPPORTED_TIMEFRAME_VALUES.join(', ')}`
    )
  }

  return parsed
}

/**
 * Parses internal search type into pytrends gprop.
 */
export function parseGprop(input: InputGprop): string {
  const raw = normalizeRequiredString(input, 'gprop')
  const upper = raw.toUpperCase()
  const parsed = GPROP_MAP[upper]

  if (parsed === undefined) {
    throw new Error(
      `[pytrends-parser] Invalid gprop: "${input}". ` +
        `Supported values: ${SUPPORTED_GPROP_VALUES.join(', ')}`
    )
  }

  return parsed
}

/**
 * Full parser for build_payload-compatible values.
 */
export function parsePytrendsParams(
  input: ParsePytrendsParamsInput
): ParsedPytrendsParams {
  const keyword = normalizeRequiredString(input.keyword, 'keyword')
  const geo = parseGeo(input.geo)
  const timeframe = parseTimeframe(input.timeframe)
  const gprop = parseGprop(input.gprop)
  const cat = input.cat ?? 0

  validateCategory(cat)

  return {
    keyword,
    geo,
    timeframe,
    gprop,
    cat,
    buildPayloadParams: {
      kw_list: [keyword],
      timeframe,
      geo,
      gprop,
      cat,
    },
  }
}

/**
 * For comparing multiple keywords in one pytrends request.
 * pytrends/Google Trends allows up to 5 keywords in one comparison group.
 */
export function parsePytrendsMultiKeywordParams(input: {
  keywords: string[]
  geo: InputGeo
  timeframe: InputTimeframe
  gprop: InputGprop
  cat?: number
}): {
  keywords: string[]
  geo: string
  timeframe: string
  gprop: string
  cat: number
  buildPayloadParams: {
    kw_list: string[]
    timeframe: string
    geo: string
    gprop: string
    cat: number
  }
} {
  if (!Array.isArray(input.keywords) || input.keywords.length === 0) {
    throw new Error('[pytrends-parser] keywords must be a non-empty array.')
  }

  const keywords = input.keywords.map((keyword, index) =>
    normalizeRequiredString(keyword, `keywords[${index}]`)
  )

  if (keywords.length > 5) {
    throw new Error('[pytrends-parser] keywords can contain at most 5 items.')
  }

  const geo = parseGeo(input.geo)
  const timeframe = parseTimeframe(input.timeframe)
  const gprop = parseGprop(input.gprop)
  const cat = input.cat ?? 0

  validateCategory(cat)

  return {
    keywords,
    geo,
    timeframe,
    gprop,
    cat,
    buildPayloadParams: {
      kw_list: keywords,
      timeframe,
      geo,
      gprop,
      cat,
    },
  }
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`[pytrends-parser] ${fieldName} must be a string.`)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`[pytrends-parser] ${fieldName} must not be empty.`)
  }

  return trimmed
}

function validateCategory(cat: number): void {
  if (!Number.isInteger(cat) || cat < 0) {
    throw new Error('[pytrends-parser] cat must be a non-negative integer.')
  }
}

/**
 * Optional helper for runtime checks before making a request.
 */
export function assertPytrendsRequestable(
  input: ParsePytrendsParamsInput
): void {
  parsePytrendsParams(input)
}

/**
 * Example usage:
 *
 * const parsed = parsePytrendsParams({
 *   keyword: 'tesla',
 *   geo: 'GLOBAL',
 *   timeframe: '5Y',
 *   gprop: 'WEB',
 * })
 *
 * pytrends.build_payload(
 *   parsed.buildPayloadParams.kw_list,
 *   parsed.buildPayloadParams.cat,
 *   parsed.buildPayloadParams.timeframe,
 *   parsed.buildPayloadParams.geo,
 *   parsed.buildPayloadParams.gprop,
 * )
 */

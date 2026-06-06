export type NormalizedProviderError = {
  status: number
  code: string
  message: string
  provider: string
  retryAfter?: number | null
}

type ProviderErrorLike = {
  status?: number
  statusCode?: number
  code?: string
  type?: string
  name?: string
  message?: string
  headers?: Record<string, string | number | undefined>
  response?: {
    status?: number
    headers?: Record<string, string | number | undefined>
    data?: unknown
  }
  error?: {
    code?: string
    message?: string
    status?: string
  }
  details?: unknown
}

function readRetryAfter(error: ProviderErrorLike): number | null {
  const raw =
    error.headers?.['retry-after'] ??
    error.response?.headers?.['retry-after']
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function stringifyUnknown(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function detectProvider(error: ProviderErrorLike, fallback: string): string {
  if (fallback !== 'unknown') return fallback

  const haystack = [
    error.name,
    error.type,
    error.code,
    error.error?.code,
    error.error?.status,
    error.message,
    stringifyUnknown(error.response?.data),
    stringifyUnknown(error.details),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (haystack.includes('openai') || haystack.includes('insufficient_quota')) return 'gpt'
  if (haystack.includes('gemini') || haystack.includes('google') || haystack.includes('resource_exhausted')) return 'gemini'
  if (haystack.includes('anthropic') || haystack.includes('claude')) return 'claude'
  return fallback
}

function detectStatus(error: ProviderErrorLike, lower: string): number {
  const explicitStatus =
    error.status ??
    error.statusCode ??
    error.response?.status

  if (typeof explicitStatus === 'number') return explicitStatus

  const providerStatus = error.error?.status?.toLowerCase()
  if (providerStatus === 'unauthenticated') return 401
  if (providerStatus === 'permission_denied') return 403
  if (providerStatus === 'resource_exhausted') return 429
  if (providerStatus === 'invalid_argument') return 400
  if (providerStatus === 'unavailable') return 503

  const numericStatusMatch = lower.match(/\b(400|401|403|429|500|503|529)\b/)
  if (numericStatusMatch) return Number(numericStatusMatch[1])

  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests')
  ) {
    return 429
  }

  return 500
}

export function normalizeProviderError(
  error: unknown,
  provider = 'unknown',
): NormalizedProviderError {
  const candidate = (error ?? {}) as ProviderErrorLike
  const rawMessage =
    candidate.message ??
    candidate.error?.message ??
    (error instanceof Error ? error.message : String(error))
  const message = rawMessage || 'AI provider error'
  const lower = [
    message,
    candidate.code,
    candidate.type,
    candidate.error?.code,
    candidate.error?.status,
    stringifyUnknown(candidate.response?.data),
    stringifyUnknown(candidate.details),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const status = detectStatus(candidate, lower)
  const resolvedProvider = detectProvider(candidate, provider)

  if (lower.includes('anthropic_not_configured')) {
    return { status: 400, code: 'PROVIDER_NOT_CONFIGURED', message, provider: resolvedProvider, retryAfter: null }
  }
  if (status === 401 || lower.includes('api key') || lower.includes('unauthorized')) {
    return { status: 401, code: 'INVALID_PROVIDER_KEY', message, provider: resolvedProvider, retryAfter: null }
  }
  if (status === 403 || lower.includes('permission') || lower.includes('forbidden')) {
    return { status: 403, code: 'PROVIDER_FORBIDDEN', message, provider: resolvedProvider, retryAfter: null }
  }
  if (status === 429) {
    const isQuota =
      lower.includes('quota') ||
      lower.includes('insufficient_quota') ||
      lower.includes('resource_exhausted') ||
      candidate.code === 'insufficient_quota' ||
      candidate.error?.code === 'insufficient_quota'
    return {
      status: 429,
      code: isQuota ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED',
      message,
      provider: resolvedProvider,
      retryAfter: readRetryAfter(candidate),
    }
  }
  if (status === 400) {
    return { status: 400, code: 'INVALID_PROVIDER_REQUEST', message, provider: resolvedProvider, retryAfter: null }
  }
  if (status === 503 || status === 529 || lower.includes('overloaded') || lower.includes('unavailable')) {
    return { status: status === 529 ? 529 : 503, code: 'PROVIDER_OVERLOADED', message, provider: resolvedProvider, retryAfter: readRetryAfter(candidate) }
  }

  return { status: 500, code: 'INTERNAL_ERROR', message, provider: resolvedProvider, retryAfter: null }
}

export class ProviderGenerationError extends Error {
  normalized: NormalizedProviderError

  constructor(normalized: NormalizedProviderError) {
    super(normalized.message)
    this.name = 'ProviderGenerationError'
    this.normalized = normalized
  }
}

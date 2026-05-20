import crypto from 'node:crypto'

import type { Prisma } from '@starway/db/prisma-client'

export const SECURITY_LEVELS = [
  'PUBLIC',
  'USER',
  'FOCUS_MEMBER',
  'PLATFORM_MEMBER',
  'ADMIN',
  'SYSTEM',
] as const

export type SecurityLevel = typeof SECURITY_LEVELS[number]

export const ACTOR_TYPES = [
  'anonymous',
  'user',
  'focus_member',
  'platform_member',
  'admin',
  'system',
] as const

export type ActorType = typeof ACTOR_TYPES[number]

export const ACCESS_SCOPES = [
  'public',
  'user',
  'focus_member',
  'platform_member',
  'admin',
  'system',
] as const

export type AccessScope = typeof ACCESS_SCOPES[number]

export const PROTECTED_RESOURCES = [
  'events',
  'flows',
  'analytics',
  'telegram',
  'payments',
  'platform_access',
  'tenant_data',
] as const

export type ProtectedResource = typeof PROTECTED_RESOURCES[number]

export const RATE_LIMIT_GROUPS = [
  'cta_spam',
  'analytics_scraping',
  'brute_force',
  'webhook_abuse',
  'retry_abuse',
  'bot_traffic',
] as const

export type RateLimitGroup = typeof RATE_LIMIT_GROUPS[number]

export const SESSION_TRUST_LEVELS = ['low', 'medium', 'high'] as const
export type SessionTrustLevel = typeof SESSION_TRUST_LEVELS[number]

export const WEBHOOK_TRUST_SOURCES = ['telegram', 'wayforpay', 'internal'] as const
export type WebhookTrustSource = typeof WEBHOOK_TRUST_SOURCES[number]

export type SecurityAnomaly =
  | 'suspicious_activity'
  | 'replay_attempt'
  | 'invalid_scope_access'
  | 'abnormal_retry_pattern'
  | 'callback_signature_failure'
  | 'tenant_violation_attempt'

export type SecurityContext = {
  actor_type: ActorType
  security_level: SecurityLevel
  access_scope: AccessScope
  protected_resource: ProtectedResource | null
  rate_limit_group: RateLimitGroup | null
  session_trust_level: SessionTrustLevel
  webhook_trust_source: WebhookTrustSource | null
  tenant_id: string | null
  request_fingerprint: string | null
  suspicious_activity: boolean
  replay_attempt: boolean
  invalid_scope_access: boolean
  abnormal_retry_pattern: boolean
  callback_signature_failure: boolean
  tenant_violation_attempt: boolean
}

export type CanonicalSecurityEvent = {
  security: SecurityContext
  anomalies: SecurityAnomaly[]
}

const MASKED_KEYS = new Set([
  'prompt',
  'raw_prompt',
  'system_prompt',
  'secret',
  'token',
  'signature',
  'internal',
  'debug',
  'request_fingerprint',
  'requestFingerprint',
  'tenant_id',
  'tenantId',
  'flow_id',
  'flowId',
  'cta_id',
  'ctaId',
  'message_key',
  'messageKey',
  'callback_action',
  'callbackAction',
])

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeScope(value: unknown): AccessScope | null {
  const scope = asString(value)
  return scope && (ACCESS_SCOPES as readonly string[]).includes(scope) ? scope as AccessScope : null
}

function normalizeTrustLevel(value: unknown): SessionTrustLevel {
  const level = asString(value)
  return level === 'high' || level === 'medium' ? level : 'low'
}

function normalizeTrustSource(value: unknown): WebhookTrustSource | null {
  const source = asString(value)
  return source && (WEBHOOK_TRUST_SOURCES as readonly string[]).includes(source) ? source as WebhookTrustSource : null
}

function normalizeActorType(value: unknown): ActorType {
  const actor = asString(value)
  return actor && (ACTOR_TYPES as readonly string[]).includes(actor) ? actor as ActorType : 'anonymous'
}

function normalizeRateLimitGroup(value: unknown): RateLimitGroup | null {
  const group = asString(value)
  return group && (RATE_LIMIT_GROUPS as readonly string[]).includes(group) ? group as RateLimitGroup : null
}

function resolveSecurityLevelFromScope(scope: AccessScope, actorType: ActorType): SecurityLevel {
  if (actorType === 'system') return 'SYSTEM'
  if (actorType === 'admin') return 'ADMIN'
  switch (scope) {
    case 'user':
      return 'USER'
    case 'focus_member':
      return 'FOCUS_MEMBER'
    case 'platform_member':
      return 'PLATFORM_MEMBER'
    case 'admin':
      return 'ADMIN'
    case 'system':
      return 'SYSTEM'
    case 'public':
    default:
      return 'PUBLIC'
  }
}

export function buildSecureCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  } as const
}

export function buildClearSecureCookieOptions() {
  const options = buildSecureCookieOptions()
  return {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  } as const
}

export function resolveTenantId(input: {
  tenantId?: string | null
  productId?: string | null
  userId?: string | null
  actorId?: string | null
}): string | null {
  return asString(input.tenantId) ?? asString(input.productId) ?? asString(input.userId) ?? asString(input.actorId)
}

export function resolveSecurityContext(input: {
  actorType?: string | null
  actorId?: string | null
  accessScope?: string | null
  tenantId?: string | null
  productId?: string | null
  userId?: string | null
  resource?: ProtectedResource | null
  trustSource?: string | null
  requestFingerprint?: string | null
  retries?: number | null
  signatureValid?: boolean | null
  scopeDenied?: boolean | null
  tenantViolation?: boolean | null
  replayAttempt?: boolean | null
  suspiciousActivity?: boolean | null
  rateLimitGroup?: string | null
}): SecurityContext {
  const accessScope = normalizeScope(input.accessScope) ?? 'public'
  const actorType = normalizeActorType(input.actorType)
  const securityLevel = resolveSecurityLevelFromScope(accessScope, actorType)
  const tenantId = resolveTenantId({
    tenantId: input.tenantId,
    productId: input.productId,
    userId: input.userId,
    actorId: input.actorId,
  })
  const callbackSignatureFailure = input.signatureValid === false
  const invalidScopeAccess = Boolean(input.scopeDenied)
  const replayAttempt = Boolean(input.replayAttempt)
  const abnormalRetryPattern = (input.retries ?? 0) >= 3
  const tenantViolationAttempt = Boolean(input.tenantViolation) || Boolean(input.tenantId && tenantId && input.tenantId !== tenantId)

  return {
    actor_type: actorType,
    security_level: securityLevel,
    access_scope: accessScope,
    protected_resource: input.resource ?? null,
    rate_limit_group: normalizeRateLimitGroup(input.rateLimitGroup)
      ?? (input.resource === 'analytics'
      ? 'analytics_scraping'
      : input.resource === 'telegram'
        ? 'bot_traffic'
        : input.resource === 'payments'
          ? 'webhook_abuse'
          : null),
    session_trust_level: normalizeTrustLevel(input.trustSource),
    webhook_trust_source: normalizeTrustSource(input.trustSource),
    tenant_id: tenantId,
    request_fingerprint: asString(input.requestFingerprint),
    suspicious_activity: Boolean(input.suspiciousActivity) || callbackSignatureFailure || invalidScopeAccess || replayAttempt || abnormalRetryPattern || tenantViolationAttempt,
    replay_attempt: replayAttempt,
    invalid_scope_access: invalidScopeAccess,
    abnormal_retry_pattern: abnormalRetryPattern,
    callback_signature_failure: callbackSignatureFailure,
    tenant_violation_attempt: tenantViolationAttempt,
  }
}

export function buildRequestFingerprint(input: {
  method?: string | null
  path?: string | null
  ip?: string | null
  userAgent?: string | null
  tenantId?: string | null
  userId?: string | null
  payload?: Prisma.JsonValue | null
}): string {
  const payloadHash = isJsonObject(input.payload)
    ? crypto.createHash('sha256').update(JSON.stringify(input.payload)).digest('hex')
    : 'nil'

  return crypto.createHash('sha256')
    .update([
      asString(input.method)?.toUpperCase() ?? 'UNKNOWN',
      asString(input.path) ?? 'UNKNOWN',
      asString(input.ip) ?? 'UNKNOWN',
      asString(input.userAgent) ?? 'UNKNOWN',
      asString(input.tenantId) ?? 'UNKNOWN',
      asString(input.userId) ?? 'UNKNOWN',
      payloadHash,
    ].join('|'))
    .digest('hex')
}

export function validateSignedPayload(input: {
  payload: string | Prisma.JsonValue | null
  signature?: string | null
  secret: string
  timestamp?: string | number | Date | null
  maxAgeMs?: number
}): {
  ok: boolean
  replayAttempt: boolean
  timestampValid: boolean
  reason: 'missing_signature' | 'signature_mismatch' | 'stale_timestamp' | null
  fingerprint: string
} {
  const body = typeof input.payload === 'string'
    ? input.payload
    : JSON.stringify(input.payload ?? {})
  const signature = asString(input.signature)
  const timestamp = input.timestamp instanceof Date
    ? input.timestamp.getTime()
    : asNumber(typeof input.timestamp === 'string' ? Number(input.timestamp) : input.timestamp)
  const maxAgeMs = input.maxAgeMs ?? 60 * 60 * 1000
  const expected = crypto.createHmac('sha256', input.secret).update(body).digest('hex')
  const fingerprint = crypto.createHash('sha256').update(`${body}|${signature ?? 'missing'}|${timestamp ?? 'missing'}`).digest('hex')

  if (!signature) {
    return {
      ok: false,
      replayAttempt: false,
      timestampValid: false,
      reason: 'missing_signature',
      fingerprint,
    }
  }

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  const signatureValid = signatureBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  if (!signatureValid) {
    return {
      ok: false,
      replayAttempt: false,
      timestampValid: false,
      reason: 'signature_mismatch',
      fingerprint,
    }
  }

  const timestampValid = typeof timestamp === 'number' && Number.isFinite(timestamp) && (Date.now() - timestamp) <= maxAgeMs
  if (!timestampValid) {
    return {
      ok: false,
      replayAttempt: true,
      timestampValid: false,
      reason: 'stale_timestamp',
      fingerprint,
    }
  }

  return {
    ok: true,
    replayAttempt: false,
    timestampValid: true,
    reason: null,
    fingerprint,
  }
}

export function sanitizeSecurityPayload(payload: Prisma.JsonValue | null): Prisma.JsonValue | null {
  if (!isJsonObject(payload)) {
    return payload
  }

  const result: Prisma.JsonObject = {}
  for (const [key, value] of Object.entries(payload)) {
    if (MASKED_KEYS.has(key)) {
      continue
    }

    if (isJsonObject(value)) {
      result[key] = sanitizeSecurityPayload(value) as Prisma.JsonValue
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => sanitizeSecurityPayload(item)) as Prisma.JsonValue
    } else {
      result[key] = value
    }
  }

  return result
}

export function enrichCanonicalSecurityEvent(input: {
  type: string
  state?: string | null
  payload?: Prisma.JsonValue
  tenantId?: string | null
  userId?: string | null
  productId?: string | null
  actorType?: string | null
  accessScope?: string | null
  trustSource?: string | null
}): {
  payload: Prisma.JsonObject
  canonical: Prisma.JsonObject | null
} {
  const payload = isJsonObject(input.payload) ? { ...input.payload } : {}
  const securityPayload = isJsonObject(payload.security) ? payload.security : {}
  const tenantId = resolveTenantId({
    tenantId: input.tenantId ?? asString(securityPayload.tenant_id),
    productId: input.productId ?? asString(payload.productId),
    userId: input.userId ?? asString(payload.userId),
  })
  const requestFingerprint = asString(
    payload.request_fingerprint
    ?? payload.requestFingerprint
    ?? securityPayload.request_fingerprint
    ?? securityPayload.requestFingerprint,
  )
  const trustSource = input.trustSource ?? asString(securityPayload.webhook_trust_source)
  const signatureValid = asBoolean(securityPayload.signature_valid ?? securityPayload.signatureValid)
  const scopeDenied = asBoolean(securityPayload.scope_denied ?? securityPayload.scopeDenied)
  const replayAttempt = asBoolean(securityPayload.replay_attempt ?? securityPayload.replayAttempt)
  const tenantViolation = asBoolean(securityPayload.tenant_violation ?? securityPayload.tenantViolation)
  const suspiciousActivity = asBoolean(securityPayload.suspicious_activity ?? securityPayload.suspiciousActivity)
  const retries = asNumber(securityPayload.retries ?? securityPayload.retry_count ?? securityPayload.retryCount)

  const security = resolveSecurityContext({
    actorType: input.actorType,
    accessScope: input.accessScope,
    tenantId,
    productId: input.productId,
    userId: input.userId,
    resource: input.type.includes('payment') ? 'payments' : input.type.includes('telegram') ? 'telegram' : input.type.includes('analytics') ? 'analytics' : null,
    trustSource,
    requestFingerprint,
    retries,
    signatureValid,
    scopeDenied,
    tenantViolation,
    replayAttempt,
    suspiciousActivity,
    rateLimitGroup: asString(securityPayload.rate_limit_group ?? securityPayload.rateLimitGroup),
  })

  const anomalies: SecurityAnomaly[] = []
  if (security.suspicious_activity) anomalies.push('suspicious_activity')
  if (security.replay_attempt) anomalies.push('replay_attempt')
  if (security.invalid_scope_access) anomalies.push('invalid_scope_access')
  if (security.abnormal_retry_pattern) anomalies.push('abnormal_retry_pattern')
  if (security.callback_signature_failure) anomalies.push('callback_signature_failure')
  if (security.tenant_violation_attempt) anomalies.push('tenant_violation_attempt')

  const canonical = {
    tenant_id: security.tenant_id,
    security_level: security.security_level,
    access_scope: security.access_scope,
    actor_type: security.actor_type,
    protected_resource: security.protected_resource,
    rate_limit_group: security.rate_limit_group,
    session_trust_level: security.session_trust_level,
    webhook_trust_source: security.webhook_trust_source,
    request_fingerprint: security.request_fingerprint,
    suspicious_activity: security.suspicious_activity,
    replay_attempt: security.replay_attempt,
    invalid_scope_access: security.invalid_scope_access,
    abnormal_retry_pattern: security.abnormal_retry_pattern,
    callback_signature_failure: security.callback_signature_failure,
    tenant_violation_attempt: security.tenant_violation_attempt,
    anomalies,
  }

  return {
    payload: {
      ...payload,
      security: canonical,
    },
    canonical,
  }
}

export function validateCanonicalSecurityFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []

  if (new Set(SECURITY_LEVELS).size !== SECURITY_LEVELS.length) {
    errors.push('duplicate_security_levels_detected')
  }
  if (new Set(ACTOR_TYPES).size !== ACTOR_TYPES.length) {
    errors.push('duplicate_actor_types_detected')
  }
  if (new Set(ACCESS_SCOPES).size !== ACCESS_SCOPES.length) {
    errors.push('duplicate_access_scopes_detected')
  }
  if (new Set(PROTECTED_RESOURCES).size !== PROTECTED_RESOURCES.length) {
    errors.push('duplicate_protected_resources_detected')
  }
  if (new Set(RATE_LIMIT_GROUPS).size !== RATE_LIMIT_GROUPS.length) {
    errors.push('duplicate_rate_limit_groups_detected')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

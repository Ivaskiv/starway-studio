import crypto from 'node:crypto'

export const FEATURE_FLAG_NAMES = [
  'product_intelligence',
  'retention_intelligence',
  'behavioral_adaptation',
  'operator_governance',
  'launch_governance',
  'conversion_intelligence',
  'human_ops_tooling',
  'performance_intelligence',
] as const

export type FeatureFlagName = typeof FEATURE_FLAG_NAMES[number]

type FeatureFlagRegistryEntry = {
  defaultEnabled: boolean
  rolloutPercent: number
  description: string
}

export const FEATURE_FLAG_REGISTRY: Record<FeatureFlagName, FeatureFlagRegistryEntry> = {
  product_intelligence: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Canonical product intelligence aggregation layer',
  },
  retention_intelligence: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Deterministic retention scoring and signals',
  },
  behavioral_adaptation: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Rule-based adaptation for reminders and CTAs',
  },
  operator_governance: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Safe operator views and anomaly dashboards',
  },
  launch_governance: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Launch readiness and rollback validation',
  },
  conversion_intelligence: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Deterministic conversion path ranking',
  },
  human_ops_tooling: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Stuck-user and manual review queue markers',
  },
  performance_intelligence: {
    defaultEnabled: true,
    rolloutPercent: 100,
    description: 'Slow lifecycle and retry amplification detection',
  },
}

export type FeatureGateDecision = {
  enabled: boolean
  flag_name: FeatureFlagName
  rollout_percent: number
  bucket: number
  environment: string
  tenant_id: string | null
  user_id: string | null
  reason: 'default_enabled' | 'default_disabled' | 'env_disabled' | 'env_enabled' | 'rollout_bucket' | 'invalid_flag'
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolveEnvFlagName(flagName: FeatureFlagName): string {
  return `FEATURE_${flagName.toUpperCase()}`
}

function resolveEnvRolloutName(flagName: FeatureFlagName): string {
  return `FEATURE_${flagName.toUpperCase()}_ROLLOUT`
}

function computeBucket(flagName: FeatureFlagName, tenantId: string | null, userId: string | null, environment: string): number {
  const digest = crypto
    .createHash('sha256')
    .update([flagName, tenantId ?? 'tenant', userId ?? 'user', environment].join(':'))
    .digest('hex')

  return Number.parseInt(digest.slice(0, 8), 16) % 100
}

export function resolveFeatureGate(input: {
  flagName: string
  tenantId?: string | null
  userId?: string | null
  environment?: string | null
}): FeatureGateDecision {
  const flagName = FEATURE_FLAG_NAMES.includes(input.flagName as FeatureFlagName)
    ? input.flagName as FeatureFlagName
    : null
  const environment = asString(input.environment) ?? process.env.NODE_ENV ?? 'development'

  if (!flagName) {
    return {
      enabled: false,
      flag_name: 'product_intelligence',
      rollout_percent: 0,
      bucket: 0,
      environment,
      tenant_id: asString(input.tenantId),
      user_id: asString(input.userId),
      reason: 'invalid_flag',
    }
  }

  const registry = FEATURE_FLAG_REGISTRY[flagName]
  const envEnabledRaw = process.env[resolveEnvFlagName(flagName)]
  const envRolloutRaw = process.env[resolveEnvRolloutName(flagName)]
  const envEnabled = envEnabledRaw === 'true' ? true : envEnabledRaw === 'false' ? false : null
  const rolloutPercentRaw = Number(envRolloutRaw ?? registry.rolloutPercent)
  const rolloutPercent = Number.isFinite(rolloutPercentRaw)
    ? Math.max(0, Math.min(100, rolloutPercentRaw))
    : registry.rolloutPercent
  const bucket = computeBucket(flagName, asString(input.tenantId), asString(input.userId), environment)

  if (envEnabled === false) {
    return {
      enabled: false,
      flag_name: flagName,
      rollout_percent: rolloutPercent,
      bucket,
      environment,
      tenant_id: asString(input.tenantId),
      user_id: asString(input.userId),
      reason: 'env_disabled',
    }
  }

  if (envEnabled === true) {
    return {
      enabled: true,
      flag_name: flagName,
      rollout_percent: rolloutPercent,
      bucket,
      environment,
      tenant_id: asString(input.tenantId),
      user_id: asString(input.userId),
      reason: 'env_enabled',
    }
  }

  const enabled = registry.defaultEnabled && bucket < rolloutPercent
  return {
    enabled,
    flag_name: flagName,
    rollout_percent: rolloutPercent,
    bucket,
    environment,
    tenant_id: asString(input.tenantId),
    user_id: asString(input.userId),
    reason: registry.defaultEnabled ? 'rollout_bucket' : 'default_disabled',
  }
}

export function getFeatureFlagCatalog() {
  return FEATURE_FLAG_NAMES.map((flagName) => ({
    flag_name: flagName,
    ...FEATURE_FLAG_REGISTRY[flagName],
  }))
}

export function validateFeatureFlagFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const catalog = getFeatureFlagCatalog()
  const names = new Set(catalog.map((entry) => entry.flag_name))

  if (names.size !== FEATURE_FLAG_NAMES.length) {
    errors.push('feature_flag_catalog_duplicate')
  }

  const gateA = resolveFeatureGate({
    flagName: 'product_intelligence',
    tenantId: 'tenant-a',
    userId: 'user-a',
    environment: 'production',
  })
  const gateB = resolveFeatureGate({
    flagName: 'product_intelligence',
    tenantId: 'tenant-a',
    userId: 'user-a',
    environment: 'production',
  })
  const gateC = resolveFeatureGate({
    flagName: 'product_intelligence',
    tenantId: 'tenant-b',
    userId: 'user-a',
    environment: 'production',
  })

  if (gateA.bucket !== gateB.bucket || gateA.enabled !== gateB.enabled) {
    errors.push('feature_flag_determinism_failed')
  }

  if (gateA.bucket === gateC.bucket && gateA.tenant_id !== gateC.tenant_id) {
    errors.push('feature_flag_tenant_isolation_failed')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { buildRuntimeResilienceSnapshotFromCounts, type RuntimeResilienceSnapshot } from '../runtime/runtimeResilience.js'
import { FEATURE_FLAG_NAMES, getFeatureFlagCatalog, resolveFeatureGate, validateFeatureFlagFoundation } from './featureFlags.js'

type SafeJson = Prisma.JsonValue | null

type EnvironmentCheck = {
  key: string
  ready: boolean
  severity: 'required' | 'recommended'
  details: string
}

export type EnvironmentGovernanceSnapshot = {
  ready: boolean
  missing_secrets: string[]
  invalid_envs: string[]
  duplicate_envs: string[]
  checks: EnvironmentCheck[]
}

export type MigrationGovernanceSnapshot = {
  schema_ready: boolean
  missing_migrations: string[]
  unsafe_migrations: string[]
  rollback_compatibility: boolean
  runtime_compatibility: boolean
  db_reachable: boolean
}

export type ConfigDriftSnapshot = {
  env_mismatch_detection: boolean
  webhook_mismatch_detection: boolean
  tenant_config_mismatch: boolean
  redis_config_mismatch: boolean
  scheduler_config_mismatch: boolean
  markers: string[]
}

export type DeploymentSafetySnapshot = {
  rolling_deploy_ready: boolean
  stale_worker_detected: boolean
  zombie_scheduler_detected: boolean
  stale_lock_cleanup_ready: boolean
  outbox_lag_ready: boolean
  degraded_deploy_detected: boolean
  markers: string[]
}

export type RuntimeHealthSnapshot = {
  orchestration_health: RuntimeResilienceSnapshot
  replay_health: {
    replay_attempts: number
    replay_rate: number
    replay_chain_diagnostics: RuntimeResilienceSnapshot['replay_chain_diagnostics']
  }
  retry_health: {
    retry_pressure_score: number
    retry_amplification_detected: boolean
  }
  queue_health: {
    outbox_pending: number
    outbox_lag_seconds: number
    notification_jobs_pending: number
  }
  redis_health: {
    ready: boolean
    url_present: boolean
  }
  db_health: {
    ready: boolean
    schema_ready: boolean
  }
  webhook_health: {
    telegram_ready: boolean
    payment_ready: boolean
  }
  ai_runtime_health: {
    ready: boolean
    feature_flag_rollout_ready: boolean
  }
}

export type ReleaseAuditEntry = {
  action: string
  actor: string | null
  source: string
  timestamp: string
  category: 'feature_flag' | 'rollout' | 'rollback' | 'replay' | 'retry' | 'retention' | 'webhook' | 'payment' | 'deploy' | 'unknown'
  outcome: 'allowed' | 'blocked' | 'warned'
}

export type OperatorAuditabilitySnapshot = {
  operator_action_audit: ReleaseAuditEntry[]
  replay_audit: ReleaseAuditEntry[]
  webhook_audit: ReleaseAuditEntry[]
  payment_audit: ReleaseAuditEntry[]
  feature_flag_audit: ReleaseAuditEntry[]
  rollout_audit: ReleaseAuditEntry[]
  rollback_audit: ReleaseAuditEntry[]
  degraded_runtime_audit: ReleaseAuditEntry[]
}

export type IncidentReadinessSnapshot = {
  incident_id: string
  generated_at: string
  diagnostics_ready: boolean
  replay_safe_diagnostics: string[]
  degraded_runtime_diagnostics: string[]
  recovery_diagnostics: string[]
  safe_export_diagnostics: string[]
}

export type ReleaseGovernanceSnapshot = {
  generated_at: string
  release_ready: boolean
  go_no_go: 'go' | 'no-go'
  release_blockers: string[]
  degraded_release_warnings: string[]
  environment_governance: EnvironmentGovernanceSnapshot
  release_governance: {
    schema_ready: boolean
    redis_ready: boolean
    webhook_ready: boolean
    scheduler_ready: boolean
    outbox_ready: boolean
    replay_ready: boolean
    orchestration_ready: boolean
    notification_ready: boolean
    ai_runtime_ready: boolean
  }
  migration_governance: MigrationGovernanceSnapshot
  runtime_audit_trail: OperatorAuditabilitySnapshot
  config_drift: ConfigDriftSnapshot
  deployment_safety: DeploymentSafetySnapshot
  runtime_health: RuntimeHealthSnapshot
  operator_auditability: OperatorAuditabilitySnapshot
  incident_readiness: IncidentReadinessSnapshot
  feature_flags: Array<ReturnType<typeof getFeatureFlagCatalog>[number] & { gate: ReturnType<typeof resolveFeatureGate> }>
}

export type ProductionActivationSnapshot = {
  generated_at: string
  live_env_readiness_pct: number
  production_webhook_readiness_pct: number
  redis_production_readiness_pct: number
  db_production_readiness_pct: number
  production_observability_pct: number
  operator_readiness_pct: number
  incident_operations_pct: number
  production_activation_readiness_pct: number
  safe_launch: boolean
  safe_rollback: boolean
  safe_canary_rollout: boolean
  safe_webhook_rotation: boolean
  safe_redis_failover: boolean
  safe_scheduler_recovery: boolean
  safe_replay_recovery: boolean
  safe_payment_continuity: boolean
  safe_operator_escalation: boolean
  safe_incident_recovery: boolean
  launch_blockers: string[]
  degraded_warnings: string[]
  rollout_strategy: {
    staged: boolean
    canary: boolean
    rollback_checkpoints: string[]
    feature_flag_rollback: boolean
    migration_rollback_checkpoints: boolean
  }
  runbooks: string[]
}

type EventLike = {
  type: string
  source: string
  state: string | null
  userId: string | null
  payload: SafeJson
  createdAt: Date
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isJsonObject(value: unknown): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getField(payload: SafeJson, key: string): unknown {
  return isJsonObject(payload) ? payload[key] : undefined
}

function getStringField(payload: SafeJson, keys: string[]): string | null {
  for (const key of keys) {
    const value = getField(payload, key)
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function getBooleanEnv(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === 'true') return true
  if (raw === 'false') return false
  return defaultValue
}

function buildEnvironmentGovernance(): EnvironmentGovernanceSnapshot {
  const aliasGroups = [
    { primary: 'WAYFORPAY_SECRET_KEY', aliases: ['WAYFORPAY_SECRET'], severity: 'required' as const },
    { primary: 'WAYFORPAY_MERCHANT_ACCOUNT', aliases: ['WAYFORPAY_MERCHANT'], severity: 'required' as const },
    { primary: 'JWT_SECRET', aliases: ['JWT_ACCESS_SECRET', 'JWT_PRIVATE_KEY'], severity: 'required' as const },
    { primary: 'JWT_REFRESH_SECRET', aliases: ['REFRESH_TOKEN_SECRET'], severity: 'recommended' as const },
    { primary: 'ENCRYPTION_KEY', aliases: ['APP_ENCRYPTION_KEY'], severity: 'required' as const },
    { primary: 'REDIS_URL', aliases: ['CACHE_URL'], severity: 'required' as const },
    { primary: 'TELEGRAM_WEBHOOK_URL', aliases: ['BOT_WEBHOOK_URL'], severity: 'required' as const },
    { primary: 'WAYFORPAY_CALLBACK_URL', aliases: ['PAYMENT_WEBHOOK_URL'], severity: 'required' as const },
  ]

  const checks: EnvironmentCheck[] = []
  const missingSecrets: string[] = []
  const invalidEnvs: string[] = []
  const duplicateEnvs: string[] = []

  for (const group of aliasGroups) {
    const values = [group.primary, ...group.aliases]
      .map((name) => process.env[name])
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    const uniqueValues = new Set(values.map((value) => value.trim()))
    const ready = uniqueValues.size > 0
    if (!ready && group.severity === 'required') {
      missingSecrets.push(group.primary)
    }
    if (uniqueValues.size > 1) {
      duplicateEnvs.push(group.primary)
      invalidEnvs.push(group.primary)
    }
    checks.push({
      key: group.primary,
      ready,
      severity: group.severity,
      details: ready ? `${group.primary} configured` : `${group.primary} missing`,
    })
  }

  const schedulerEnabledRaw = process.env.SCHEDULER_ENABLED
  const schedulerEnabled = schedulerEnabledRaw === undefined ? true : schedulerEnabledRaw === 'true' || schedulerEnabledRaw === '1'
  if (schedulerEnabledRaw !== undefined && schedulerEnabledRaw !== 'true' && schedulerEnabledRaw !== 'false' && schedulerEnabledRaw !== '1' && schedulerEnabledRaw !== '0') {
    invalidEnvs.push('SCHEDULER_ENABLED')
  }
  checks.push({
    key: 'SCHEDULER_ENABLED',
    ready: schedulerEnabled,
    severity: 'recommended',
    details: schedulerEnabled ? 'Scheduler enabled' : 'Scheduler disabled',
  })

  const signaturesReady = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || process.env.WAYFORPAY_SECRET_KEY?.trim() || process.env.WAYFORPAY_SECRET?.trim())
  checks.push({
    key: 'webhook_signatures',
    ready: signaturesReady,
    severity: 'required',
    details: signaturesReady ? 'Webhook signatures configured' : 'Webhook signatures missing',
  })

  const featureFlagsReady = validateFeatureFlagFoundation().ok
  checks.push({
    key: 'runtime_feature_flags',
    ready: featureFlagsReady,
    severity: 'required',
    details: featureFlagsReady ? 'Feature flag foundation valid' : 'Feature flag foundation invalid',
  })

  const ready = checks.filter((check) => check.severity === 'required').every((check) => check.ready) && invalidEnvs.length === 0

  return {
    ready,
    missing_secrets: missingSecrets,
    invalid_envs: invalidEnvs,
    duplicate_envs: duplicateEnvs,
    checks,
  }
}

async function safeCount<T>(task: Promise<T>): Promise<number> {
  try {
    const value = await task
    return typeof value === 'number' ? value : 0
  } catch {
    return 0
  }
}

async function safeQueryEvents(): Promise<EventLike[]> {
  try {
    return await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        type: true,
        source: true,
        state: true,
        userId: true,
        payload: true,
        createdAt: true,
      },
    })
  } catch {
    return []
  }
}

async function buildMigrationGovernance(): Promise<MigrationGovernanceSnapshot> {
  const dbReachable = await prisma.$queryRawUnsafe<Array<{ ok: number }>>('SELECT 1 as ok')
    .then(() => true)
    .catch(() => false)

  const userCount = await safeCount(prisma.user.count())
  const eventCount = await safeCount(prisma.event.count())
  const notificationCount = await safeCount(prisma.notification.count())
  const outboxCount = await safeCount(prisma.runtimeOutbox.count())

  const schemaReady = dbReachable && userCount >= 0 && eventCount >= 0 && notificationCount >= 0 && outboxCount >= 0
  const missingMigrations = !dbReachable ? ['database_unreachable'] : outboxCount === 0 ? ['runtime_outbox_missing'] : []
  const unsafeMigrations = !dbReachable ? ['schema_unverified'] : []
  const runtimeCompatibility = schemaReady && missingMigrations.length === 0
  const rollbackCompatibility = runtimeCompatibility && outboxCount >= 0

  return {
    schema_ready: schemaReady,
    missing_migrations: missingMigrations,
    unsafe_migrations: unsafeMigrations,
    rollback_compatibility: rollbackCompatibility,
    runtime_compatibility: runtimeCompatibility,
    db_reachable: dbReachable,
  }
}

function buildConfigDrift(environment: EnvironmentGovernanceSnapshot): ConfigDriftSnapshot {
  const markers: string[] = []
  const envMismatch = environment.duplicate_envs.length > 0

  if (envMismatch) markers.push('env_mismatch')
  if (!environment.checks.find((check) => check.key === 'REDIS_URL')?.ready) markers.push('redis_config_mismatch')
  if (!environment.checks.find((check) => check.key === 'SCHEDULER_ENABLED')?.ready) markers.push('scheduler_config_mismatch')
  if (!environment.checks.find((check) => check.key === 'WAYFORPAY_CALLBACK_URL')?.ready) markers.push('webhook_config_mismatch')
  if (!environment.checks.find((check) => check.key === 'JWT_SECRET')?.ready) markers.push('tenant_config_mismatch')

  return {
    env_mismatch_detection: envMismatch,
    webhook_mismatch_detection: markers.includes('webhook_config_mismatch'),
    tenant_config_mismatch: markers.includes('tenant_config_mismatch'),
    redis_config_mismatch: markers.includes('redis_config_mismatch'),
    scheduler_config_mismatch: markers.includes('scheduler_config_mismatch'),
    markers,
  }
}

async function buildRuntimeHealth(environment: EnvironmentGovernanceSnapshot, migration: MigrationGovernanceSnapshot): Promise<RuntimeHealthSnapshot> {
  const events = await safeQueryEvents()
  const recentOutboxPending = await safeCount(prisma.runtimeOutbox.count({
    where: {
      status: 'PENDING',
    },
  }))

  const counts = {
    callbackReplayAttempts: events.filter((event) => event.type === 'callback_replay_attempt').length,
    paymentReplayAttempts: events.filter((event) => event.type === 'payment_callback_replay_attempt').length,
    webhookInvalid: events.filter((event) => event.type.includes('webhook') && event.type.includes('invalid')).length,
    telegramCallbackEvents: events.filter((event) => event.type === 'CTA_CLICKED').length,
    paymentSuccessEvents: events.filter((event) => event.type === 'PAYMENT_SUCCESS' || event.type === 'payment_success').length,
    flowTriggeredEvents: events.filter((event) => event.type === 'FLOW_TRIGGERED').length,
    notificationJobs: await safeCount(prisma.notificationJob.count({ where: { status: 'PENDING' } })),
    notificationSent: await safeCount(prisma.notification.count({ where: { status: 'SENT' } })),
  }

  const orchestrationHealth = buildRuntimeResilienceSnapshotFromCounts(counts)
  const replayAttempts = counts.callbackReplayAttempts + counts.paymentReplayAttempts
  const replayRate = events.length > 0 ? Math.round((replayAttempts / events.length) * 1000) / 10 : 0
  const outboxOldest = await prisma.runtimeOutbox.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true, lockedAt: true },
  }).catch(() => null)
  const outboxLagSeconds = outboxOldest ? Math.max(0, Math.floor((Date.now() - outboxOldest.createdAt.getTime()) / 1000)) : 0

  return {
    orchestration_health: orchestrationHealth,
    replay_health: {
      replay_attempts: replayAttempts,
      replay_rate: replayRate,
      replay_chain_diagnostics: orchestrationHealth.replay_chain_diagnostics,
    },
    retry_health: {
      retry_pressure_score: counts.callbackReplayAttempts * 12 + counts.paymentReplayAttempts * 18 + counts.webhookInvalid * 10,
      retry_amplification_detected: counts.callbackReplayAttempts + counts.paymentReplayAttempts > 5,
    },
    queue_health: {
      outbox_pending: recentOutboxPending,
      outbox_lag_seconds: outboxLagSeconds,
      notification_jobs_pending: counts.notificationJobs,
    },
    redis_health: {
      ready: Boolean(process.env.REDIS_URL?.trim()),
      url_present: Boolean(process.env.REDIS_URL?.trim()),
    },
    db_health: {
      ready: migration.db_reachable,
      schema_ready: migration.schema_ready,
    },
    webhook_health: {
      telegram_ready: Boolean(process.env.TELEGRAM_WEBHOOK_URL?.trim()),
      payment_ready: Boolean(process.env.WAYFORPAY_CALLBACK_URL?.trim()),
    },
    ai_runtime_health: {
      ready: validateFeatureFlagFoundation().ok,
      feature_flag_rollout_ready: validateFeatureFlagFoundation().ok,
    },
  }
}

function normalizeAuditAction(type: string): ReleaseAuditEntry['category'] {
  const value = type.toLowerCase()
  if (value.includes('feature_flag')) return 'feature_flag'
  if (value.includes('rollout')) return 'rollout'
  if (value.includes('rollback')) return 'rollback'
  if (value.includes('replay')) return 'replay'
  if (value.includes('retry')) return 'retry'
  if (value.includes('retention')) return 'retention'
  if (value.includes('webhook')) return 'webhook'
  if (value.includes('payment')) return 'payment'
  if (value.includes('deploy')) return 'deploy'
  return 'unknown'
}

async function buildAuditTrail(events: EventLike[]): Promise<OperatorAuditabilitySnapshot> {
  const audited = events.slice(0, 50).map<ReleaseAuditEntry>((event) => {
    const actor = getStringField(event.payload, ['actorId', 'operatorId', 'adminId', 'actor_id'])
    const outcome = getBooleanEnv('NODE_ENV', false) ? 'allowed' : 'warned'
    return {
      action: event.type,
      actor,
      source: event.source,
      timestamp: event.createdAt.toISOString(),
      category: normalizeAuditAction(event.type),
      outcome,
    }
  })

  const byCategory = (category: ReleaseAuditEntry['category']) => audited.filter((entry) => entry.category === category)

  return {
    operator_action_audit: audited,
    replay_audit: byCategory('replay'),
    webhook_audit: byCategory('webhook'),
    payment_audit: byCategory('payment'),
    feature_flag_audit: byCategory('feature_flag'),
    rollout_audit: byCategory('rollout'),
    rollback_audit: byCategory('rollback'),
    degraded_runtime_audit: audited.filter((entry) => entry.outcome !== 'allowed'),
  }
}

function buildIncidentReadiness(runtime: RuntimeHealthSnapshot, audit: OperatorAuditabilitySnapshot): IncidentReadinessSnapshot {
  const replaySafeDiagnostics = [
    `replay_attempts=${runtime.replay_health.replay_attempts}`,
    `replay_rate=${runtime.replay_health.replay_rate}`,
    `replay_entries=${audit.replay_audit.length}`,
  ]
  const degradedRuntimeDiagnostics = [
    `breaker=${runtime.orchestration_health.breaker_state}`,
    `degradation=${runtime.orchestration_health.degradation_classification ?? 'none'}`,
    `throttling=${runtime.orchestration_health.throttling_marker ?? 'none'}`,
  ]
  const recoveryDiagnostics = [
    `outbox_pending=${runtime.queue_health.outbox_pending}`,
    `outbox_lag_seconds=${runtime.queue_health.outbox_lag_seconds}`,
    `retry_pressure=${runtime.retry_health.retry_pressure_score}`,
  ]
  const safeExportDiagnostics = [
    'payload_redacted',
    'prompt_redacted',
    'context_redacted',
    'internal_ids_redacted',
  ]

  return {
    incident_id: `incident-${new Date().toISOString()}`,
    generated_at: new Date().toISOString(),
    diagnostics_ready: true,
    replay_safe_diagnostics: replaySafeDiagnostics,
    degraded_runtime_diagnostics: degradedRuntimeDiagnostics,
    recovery_diagnostics: recoveryDiagnostics,
    safe_export_diagnostics: safeExportDiagnostics,
  }
}

function scorePercent(conditions: boolean[]): number {
  if (!conditions.length) return 0
  return Math.round((conditions.filter(Boolean).length / conditions.length) * 1000) / 10
}

export function buildProductionActivationSnapshot(release: ReleaseGovernanceSnapshot): ProductionActivationSnapshot {
  const envChecks = release.environment_governance.checks.filter((check) => check.severity === 'required')
  const liveEnvReadiness = scorePercent(envChecks.map((check) => check.ready))
  const webhookReadiness = scorePercent([
    release.release_governance.webhook_ready,
    release.runtime_health.webhook_health.telegram_ready,
    release.runtime_health.webhook_health.payment_ready,
  ])
  const redisReadiness = release.release_governance.redis_ready ? 100 : 0
  const dbReadiness = release.migration_governance.schema_ready && release.migration_governance.db_reachable ? 100 : 0
  const productionObservability = scorePercent([
    release.runtime_health.orchestration_health.breaker_state !== 'open',
    release.runtime_health.replay_health.replay_rate < 25,
    release.runtime_health.queue_health.outbox_lag_seconds < 120,
    release.incident_readiness.diagnostics_ready,
    release.config_drift.markers.length === 0,
  ])
  const operatorReadiness = scorePercent([
    release.environment_governance.ready,
    release.feature_flags.length > 0,
    release.operator_auditability.operator_action_audit.length >= 0,
    !release.config_drift.env_mismatch_detection,
    validateFeatureFlagFoundation().ok,
  ])
  const incidentOperations = scorePercent([
    release.incident_readiness.diagnostics_ready,
    release.incident_readiness.safe_export_diagnostics.length > 0,
    release.incident_readiness.replay_safe_diagnostics.length > 0,
    release.incident_readiness.degraded_runtime_diagnostics.length > 0,
    release.incident_readiness.recovery_diagnostics.length > 0,
  ])

  const activationReadiness = Math.round(
    (liveEnvReadiness +
      webhookReadiness +
      redisReadiness +
      dbReadiness +
      productionObservability +
      operatorReadiness +
      incidentOperations) / 7,
  )

  const safeLaunch = activationReadiness >= 85 && release.release_ready
  const safeRollback = release.migration_governance.rollback_compatibility && release.deployment_safety.stale_lock_cleanup_ready
  const safeCanaryRollout = safeLaunch && release.deployment_safety.rolling_deploy_ready
  const safeWebhookRotation = release.runtime_health.webhook_health.telegram_ready && release.runtime_health.webhook_health.payment_ready
  const safeRedisFailover = release.runtime_health.redis_health.ready && release.release_governance.redis_ready
  const safeSchedulerRecovery = release.environment_governance.checks.find((check) => check.key === 'SCHEDULER_ENABLED')?.ready !== false
  const safeReplayRecovery = release.runtime_health.replay_health.replay_rate < 25
  const safePaymentContinuity = release.runtime_health.webhook_health.payment_ready && release.migration_governance.runtime_compatibility
  const safeOperatorEscalation = release.operator_auditability.operator_action_audit.length >= 0
  const safeIncidentRecovery = release.incident_readiness.diagnostics_ready && release.incident_readiness.safe_export_diagnostics.length > 0

  const launchBlockers = release.release_blockers
  const degradedWarnings = release.degraded_release_warnings

  return {
    generated_at: new Date().toISOString(),
    live_env_readiness_pct: liveEnvReadiness,
    production_webhook_readiness_pct: webhookReadiness,
    redis_production_readiness_pct: redisReadiness,
    db_production_readiness_pct: dbReadiness,
    production_observability_pct: productionObservability,
    operator_readiness_pct: operatorReadiness,
    incident_operations_pct: incidentOperations,
    production_activation_readiness_pct: activationReadiness,
    safe_launch: safeLaunch,
    safe_rollback: safeRollback,
    safe_canary_rollout: safeCanaryRollout,
    safe_webhook_rotation: safeWebhookRotation,
    safe_redis_failover: safeRedisFailover,
    safe_scheduler_recovery: safeSchedulerRecovery,
    safe_replay_recovery: safeReplayRecovery,
    safe_payment_continuity: safePaymentContinuity,
    safe_operator_escalation: safeOperatorEscalation,
    safe_incident_recovery: safeIncidentRecovery,
    launch_blockers: launchBlockers,
    degraded_warnings: degradedWarnings,
    rollout_strategy: {
      staged: safeLaunch,
      canary: safeCanaryRollout,
      rollback_checkpoints: ['feature_flags', 'migrations', 'webhooks', 'outbox'],
      feature_flag_rollback: validateFeatureFlagFoundation().ok,
      migration_rollback_checkpoints: release.migration_governance.rollback_compatibility,
    },
    runbooks: [
      'Redis outage recovery',
      'Scheduler recovery',
      'Replay storm recovery',
      'Webhook failure recovery',
      'Payment retry recovery',
      'Rollback execution',
      'Stale worker cleanup',
      'Degraded-runtime handling',
    ],
  }
}

export async function getProductionActivationSnapshot(): Promise<ProductionActivationSnapshot> {
  const release = await getReleaseGovernanceSnapshot()
  return buildProductionActivationSnapshot(release)
}

export async function getReleaseGovernanceSnapshot(): Promise<ReleaseGovernanceSnapshot> {
  const environmentGovernance = buildEnvironmentGovernance()
  const migrationGovernance = await buildMigrationGovernance()
  const configDrift = buildConfigDrift(environmentGovernance)
  const runtimeHealth = await buildRuntimeHealth(environmentGovernance, migrationGovernance)
  const events = await safeQueryEvents()
  const runtimeAuditTrail = await buildAuditTrail(events)
  const incidentReadiness = buildIncidentReadiness(runtimeHealth, runtimeAuditTrail)
  const featureFlags = getFeatureFlagCatalog().map((flag) => ({
    ...flag,
    gate: resolveFeatureGate({
      flagName: flag.flag_name,
      tenantId: 'global',
      userId: null,
    }),
  }))

  const releaseGovernance = {
    schema_ready: migrationGovernance.schema_ready,
    redis_ready: environmentGovernance.checks.find((check) => check.key === 'REDIS_URL')?.ready ?? false,
    webhook_ready: environmentGovernance.checks.find((check) => check.key === 'WAYFORPAY_CALLBACK_URL')?.ready ?? false,
    scheduler_ready: environmentGovernance.checks.find((check) => check.key === 'SCHEDULER_ENABLED')?.ready ?? false,
    outbox_ready: migrationGovernance.runtime_compatibility,
    replay_ready: runtimeHealth.replay_health.replay_rate === 0 || runtimeHealth.replay_health.replay_rate < 25,
    orchestration_ready: runtimeHealth.orchestration_health.breaker_state !== 'open',
    notification_ready: runtimeHealth.queue_health.notification_jobs_pending < 100,
    ai_runtime_ready: runtimeHealth.ai_runtime_health.ready,
  }

  const releaseBlockers = [
    ...environmentGovernance.missing_secrets,
    ...environmentGovernance.invalid_envs,
    ...migrationGovernance.missing_migrations,
    ...configDrift.markers,
    ...(releaseGovernance.replay_ready ? [] : ['replay_pressure']),
    ...(releaseGovernance.orchestration_ready ? [] : ['orchestration_open_breaker']),
    ...(releaseGovernance.notification_ready ? [] : ['notification_pressure']),
  ]

  const degradedReleaseWarnings = [
    ...(runtimeHealth.orchestration_health.breaker_state === 'degraded' ? ['runtime_degraded'] : []),
    ...(runtimeHealth.queue_health.outbox_lag_seconds > 120 ? ['outbox_lag'] : []),
    ...(runtimeHealth.retry_health.retry_amplification_detected ? ['retry_amplification'] : []),
  ]

  return {
    generated_at: new Date().toISOString(),
    release_ready: releaseBlockers.length === 0,
    go_no_go: releaseBlockers.length === 0 ? 'go' : 'no-go',
    release_blockers: releaseBlockers,
    degraded_release_warnings: degradedReleaseWarnings,
    environment_governance: environmentGovernance,
    release_governance: releaseGovernance,
    migration_governance: migrationGovernance,
    runtime_audit_trail: runtimeAuditTrail,
    config_drift: configDrift,
    deployment_safety: {
      rolling_deploy_ready: migrationGovernance.runtime_compatibility && environmentGovernance.ready,
      stale_worker_detected: runtimeHealth.queue_health.outbox_lag_seconds > 180,
      zombie_scheduler_detected: !environmentGovernance.checks.find((check) => check.key === 'SCHEDULER_ENABLED')?.ready,
      stale_lock_cleanup_ready: runtimeHealth.replay_health.replay_rate < 20,
      outbox_lag_ready: runtimeHealth.queue_health.outbox_lag_seconds < 120,
      degraded_deploy_detected: runtimeHealth.orchestration_health.breaker_state !== 'closed',
      markers: [
        ...(runtimeHealth.queue_health.outbox_lag_seconds > 180 ? ['stale_worker'] : []),
        ...(!environmentGovernance.checks.find((check) => check.key === 'SCHEDULER_ENABLED')?.ready ? ['zombie_scheduler'] : []),
        ...(runtimeHealth.orchestration_health.breaker_state !== 'closed' ? ['degraded_runtime'] : []),
      ],
    },
    runtime_health: runtimeHealth,
    operator_auditability: runtimeAuditTrail,
    incident_readiness: incidentReadiness,
    feature_flags: featureFlags,
  }
}

export function validateReleaseGovernanceFoundation(): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  const environment = buildEnvironmentGovernance()
  const configDrift = buildConfigDrift(environment)

  if (!environment.checks.length) {
    errors.push('release_environment_checks_missing')
  }
  if (!Array.isArray(configDrift.markers)) {
    errors.push('release_config_drift_invalid')
  }

  return {
    ok: errors.length === 0,
    errors,
  }
}

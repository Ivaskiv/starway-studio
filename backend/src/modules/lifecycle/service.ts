import type { PlatformProductId } from '@starway/shared/platform.registry'

import type { UserLifecycleSnapshot } from '../flow-control/types.js'
import type { TelegramAccessSource, TelegramMentorMode } from '@/content/telegram.product-context.js'
import { cacheSet } from '../../lib/cache/index.js'
import { stableHash } from '../../services/aiGuard.service.js'

export type CentralLifecycleState =
  | 'guest'
  | 'onboarding'
  | 'trial'
  | 'active'
  | 'paused'
  | 'expired'
  | 'gifted'
  | 'bonus'
  | 'completed'
  | 'winback'
  | 'inactive'

export type CentralLifecycleRoomState = 'active' | 'trial' | 'paused' | 'onboarding-started' | 'inactive'
export type CentralLifecycleActivationState =
  | 'inactive'
  | 'trial'
  | 'active'
  | 'paused'
  | 'gifted'
  | 'bonus'
  | 'manual'
  | 'affiliate'
  | 'restore'
  | 'upsell'
  | 'onboarding-started'

export type CentralLifecycleCta =
  | 'start'
  | 'continue'
  | 'restore'
  | 'upgrade'
  | 'buy'
  | 'open'
  | 'resume'
  | 'activateTrial'
  | 'continueLesson'
  | 'openRoom'

export type CentralLifecycleSnapshot = {
  state: CentralLifecycleState
  roomState: CentralLifecycleRoomState
  activationState: CentralLifecycleActivationState
  subscriptionState: 'inactive' | 'trial' | 'active' | 'paused' | 'expired'
  onboardingState: 'not_started' | 'started' | 'completed'
  retentionState: 'none' | 'warm' | 'watch' | 'restore' | 'winback'
  mentorState: {
    mode: TelegramMentorMode
    eligible: boolean
  }
  reminderState: {
    eligible: boolean
    reason: string | null
  }
  progressionState: {
    currentLesson: string | null
    completedLessons: number
    streak: number
    lastActivityAt: Date | null
  }
  accessSource: TelegramAccessSource
  ctaState: CentralLifecycleCta
  productId: PlatformProductId | null
  debug: {
    hasSubscription: boolean
    hasTrial: boolean
    hasExpiredAccess: boolean
    hasOnboarding: boolean
    hasCompleted: boolean
  }
}

type LifecycleStateInput = {
  userLifecycle: UserLifecycleSnapshot
  productId?: PlatformProductId | null
  accessSource?: TelegramAccessSource | null
  mentorMode?: TelegramMentorMode | null
  progress?: {
    currentLesson: string | null
    completedLessons: number
    streak: number
    lastActivityAt: Date | null
  } | null
  onboardingStarted?: boolean
  onboardingCompleted?: boolean
  explicitWaitlist?: boolean
  rolloutEnabled?: boolean
}

const LIFECYCLE_CACHE_TTL_SECONDS = 5
const lifecycleSnapshotCache = new Map<string, { at: number; snapshot: CentralLifecycleSnapshot }>()

function trimLifecycleCache(limit = 500) {
  if (lifecycleSnapshotCache.size <= limit) return

  const overflow = lifecycleSnapshotCache.size - limit
  const keys = lifecycleSnapshotCache.keys()
  for (let index = 0; index < overflow; index += 1) {
    const nextKey = keys.next().value
    if (!nextKey) break
    lifecycleSnapshotCache.delete(nextKey)
  }
}

function getLifecycleCacheKey(input: LifecycleStateInput): string {
  return stableHash(input)
}

function normalizeAccessSource(
  lifecycle: UserLifecycleSnapshot,
  accessSource: TelegramAccessSource | null | undefined,
): TelegramAccessSource {
  if (accessSource) {
    return accessSource
  }

  if (lifecycle.state === 'trial') return 'trial'
  if (lifecycle.state === 'paid') return 'payment'
  if (lifecycle.state === 'expired') return 'restore'
  return 'unknown'
}

function resolveLifecycleState(input: LifecycleStateInput, accessSource: TelegramAccessSource): CentralLifecycleState {
  const lifecycle = input.userLifecycle

  if (accessSource === 'gifted') return 'gifted'
  if (accessSource === 'bonus') return 'bonus'

  if (lifecycle.state === 'trial') return 'trial'
  if (lifecycle.state === 'paid') return 'active'
  if (lifecycle.state === 'expired') return accessSource === 'restore' ? 'winback' : 'expired'

  const hasOnboarding = Boolean(
    input.onboardingCompleted ||
    input.onboardingStarted ||
    lifecycle.state === 'onboarding' ||
    lifecycle.state === 'lead_magnet' ||
    lifecycle.hasLeadMagnetFlow ||
    lifecycle.hasCompletedLeadMagnet ||
    lifecycle.currentStep !== 'LINK_TELEGRAM',
  )

  if (input.onboardingCompleted || lifecycle.hasCompletedLeadMagnet) return 'completed'
  if (hasOnboarding) return 'onboarding'

  if (accessSource === 'restore') return 'winback'

  if (input.explicitWaitlist || input.rolloutEnabled === false) {
    return 'guest'
  }

  return lifecycle.state === 'guest' ? 'guest' : 'inactive'
}

function resolveRoomState(state: CentralLifecycleState): CentralLifecycleRoomState {
  switch (state) {
    case 'trial':
      return 'trial'
    case 'active':
    case 'gifted':
    case 'bonus':
      return 'active'
    case 'paused':
    case 'expired':
    case 'winback':
      return 'paused'
    case 'onboarding':
    case 'completed':
    case 'guest':
    case 'inactive':
    default:
      return 'onboarding-started'
  }
}

function resolveSubscriptionState(state: CentralLifecycleState): CentralLifecycleSnapshot['subscriptionState'] {
  switch (state) {
    case 'trial':
      return 'trial'
    case 'active':
    case 'gifted':
    case 'bonus':
      return 'active'
    case 'paused':
    case 'expired':
    case 'winback':
      return 'paused'
    case 'onboarding':
    case 'completed':
    case 'guest':
    case 'inactive':
    default:
      return 'inactive'
  }
}

function resolveActivationState(state: CentralLifecycleState, accessSource: TelegramAccessSource): CentralLifecycleActivationState {
  if (accessSource === 'gifted') return 'gifted'
  if (accessSource === 'bonus') return 'bonus'
  if (accessSource === 'manual') return 'manual'
  if (accessSource === 'affiliate') return 'affiliate'
  if (accessSource === 'upsell') return 'upsell'
  if (accessSource === 'restore') return 'restore'

  switch (state) {
    case 'trial':
      return 'trial'
    case 'active':
      return 'active'
    case 'paused':
      return 'paused'
    case 'expired':
    case 'winback':
      return 'restore'
    case 'onboarding':
    case 'completed':
      return 'onboarding-started'
    case 'guest':
    case 'inactive':
    default:
      return 'inactive'
  }
}

function resolveCtaState(snapshot: CentralLifecycleSnapshot): CentralLifecycleCta {
  switch (snapshot.state) {
    case 'active':
    case 'trial':
      return snapshot.progressionState.currentLesson ? 'continueLesson' : 'continue'
    case 'gifted':
    case 'bonus':
      return 'openRoom'
    case 'paused':
    case 'expired':
    case 'winback':
      return 'restore'
    case 'onboarding':
      return 'activateTrial'
    case 'completed':
      return 'open'
    case 'guest':
    case 'inactive':
    default:
      return 'buy'
  }
}

function resolveMentorState(state: CentralLifecycleState, mentorMode: TelegramMentorMode | null | undefined): CentralLifecycleSnapshot['mentorState'] {
  if (mentorMode) {
    return {
      mode: mentorMode,
      eligible: mentorMode !== 'silent',
    }
  }

  switch (state) {
    case 'active':
      return { mode: 'medium', eligible: true }
    case 'trial':
    case 'onboarding':
      return { mode: 'soft', eligible: true }
    case 'gifted':
    case 'bonus':
      return { mode: 'soft', eligible: true }
    case 'paused':
    case 'expired':
    case 'winback':
      return { mode: 'soft', eligible: true }
    case 'completed':
      return { mode: 'medium', eligible: true }
    case 'guest':
    case 'inactive':
    default:
      return { mode: 'silent', eligible: false }
  }
}

function resolveReminderState(state: CentralLifecycleState, mentor: CentralLifecycleSnapshot['mentorState']): CentralLifecycleSnapshot['reminderState'] {
  switch (state) {
    case 'active':
    case 'trial':
    case 'onboarding':
      return {
        eligible: mentor.eligible && mentor.mode !== 'silent',
        reason: null,
      }
    case 'gifted':
    case 'bonus':
      return {
        eligible: false,
        reason: 'gifted_or_bonus_access',
      }
    case 'completed':
      return {
        eligible: false,
        reason: 'completed',
      }
    case 'paused':
    case 'expired':
    case 'winback':
      return {
        eligible: false,
        reason: 'not_active',
      }
    case 'guest':
    case 'inactive':
    default:
      return {
        eligible: false,
        reason: 'no_access',
      }
  }
}

function resolveRetentionState(state: CentralLifecycleState): CentralLifecycleSnapshot['retentionState'] {
  switch (state) {
    case 'active':
      return 'warm'
    case 'trial':
      return 'watch'
    case 'paused':
    case 'expired':
      return 'restore'
    case 'winback':
      return 'restore'
    default:
      return 'none'
  }
}

export function resolveCentralLifecycleSnapshot(input: LifecycleStateInput): CentralLifecycleSnapshot {
  const startedAt = Date.now()
  const cacheKey = getLifecycleCacheKey(input)
  const cached = lifecycleSnapshotCache.get(cacheKey)
  if (cached && Date.now() - cached.at < LIFECYCLE_CACHE_TTL_SECONDS * 1000) {
    return cached.snapshot
  }

  const accessSource = normalizeAccessSource(input.userLifecycle, input.accessSource)
  const state = resolveLifecycleState(input, accessSource)
  const progressionState = input.progress ?? {
    currentLesson: null,
    completedLessons: 0,
    streak: 0,
    lastActivityAt: null,
  }
  const roomState = resolveRoomState(state)
  const snapshot: CentralLifecycleSnapshot = {
    state,
    roomState,
    activationState: resolveActivationState(state, accessSource),
    subscriptionState: resolveSubscriptionState(state),
    onboardingState: state === 'onboarding' ? 'started' : state === 'completed' ? 'completed' : state === 'guest' || state === 'inactive' ? 'not_started' : 'completed',
    retentionState: resolveRetentionState(state),
    mentorState: resolveMentorState(state, input.mentorMode),
    reminderState: { eligible: false, reason: null },
    progressionState,
    accessSource,
    ctaState: 'buy',
    productId: input.productId ?? null,
    debug: {
      hasSubscription: input.userLifecycle.subscriptionActive,
      hasTrial: input.userLifecycle.state === 'trial',
      hasExpiredAccess: input.userLifecycle.hasExpiredAccess,
      hasOnboarding: state === 'onboarding',
      hasCompleted: state === 'completed',
    },
  }

  snapshot.reminderState = resolveReminderState(snapshot.state, snapshot.mentorState)
  snapshot.ctaState = resolveCtaState(snapshot)

  lifecycleSnapshotCache.set(cacheKey, { at: Date.now(), snapshot })
  trimLifecycleCache()
  void cacheSet(`lifecycle:${cacheKey}`, snapshot, LIFECYCLE_CACHE_TTL_SECONDS).catch(() => undefined)

  const durationMs = Date.now() - startedAt
  if (durationMs > 25) {
    console.info('[LIFECYCLE][slow_resolve]', {
      durationMs,
      state: snapshot.state,
      accessSource: snapshot.accessSource,
      roomState: snapshot.roomState,
    })
  }

  return snapshot
}

export function logLifecycleSnapshot(label: string, snapshot: CentralLifecycleSnapshot, extra?: Record<string, unknown>) {
  console.info('[LIFECYCLE]', {
    label,
    state: snapshot.state,
    roomState: snapshot.roomState,
    subscriptionState: snapshot.subscriptionState,
    onboardingState: snapshot.onboardingState,
    activationState: snapshot.activationState,
    accessSource: snapshot.accessSource,
    ctaState: snapshot.ctaState,
    reminderEligible: snapshot.reminderState.eligible,
    mentorMode: snapshot.mentorState.mode,
    ...extra,
  })
}

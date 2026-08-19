import { getAllAbilities } from '../auth/access/abilities.js'
import { getTrialStatus } from '../trial/service.js'
import type { AccessControlState, AccessItem, UserAccessResult } from './types.js'
import { buildProductAccessItems, deriveLeadStep, getAccessUserSnapshot, resolveEffectiveRole, resolveOnboardingStage, shouldLogTelegramOptionalSnapshot } from './snapshot.service.js'
import { hasActiveAbsystemAiEntitlement } from './trial.service.js'

export async function getAccessControlState(userId: string): Promise<AccessControlState> {
  const user = await getAccessUserSnapshot(userId)
  if (!user) {
    throw new Error('User not found')
  }

  const now = new Date()
  const trial = await getTrialStatus(userId)
  const isSuperAdmin = user.role === 'SUPERADMIN'
  const subscription = user.subscription
  const leadEnrollment = user.fivePointsEnrollment
  const isPaidActive =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)
  const isSubscriptionTrialActive =
    !isPaidActive &&
    subscription?.status === 'TRIAL' &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt > now
  const hasAbsystemAiEntitlement = hasActiveAbsystemAiEntitlement(user, now)
  const isUserTrialActive = trial.isActive
  const hasSubscription =
    isSuperAdmin ||
    isPaidActive ||
    isSubscriptionTrialActive ||
    isUserTrialActive ||
    hasAbsystemAiEntitlement
  const hasLeadMagnet = Boolean(
    leadEnrollment?.completedAt ||
    ((leadEnrollment?.progress as { completed?: unknown } | null | undefined)?.completed === true),
  )
  const currentFlow: AccessControlState['currentFlow'] = hasSubscription
    ? 'mentor'
    : leadEnrollment && !hasLeadMagnet
      ? 'lead-magnet'
      : null
  const currentStep = currentFlow === 'lead-magnet'
    ? deriveLeadStep(leadEnrollment?.progress)
    : 0
  const onboardingStage = resolveOnboardingStage(user.onboardingStage, user.currentStep)
  const accessLevel: AccessControlState['accessLevel'] = hasSubscription
    ? 'CLIENT'
    : currentFlow === 'lead-magnet' || hasLeadMagnet || onboardingStage === 'lead_magnet'
      ? 'LEAD'
      : 'GUEST'
  const email = user.email ?? null
  const telegramId = user.telegramChatId ?? user.telegramUserId ?? user.telegramLinkChatId ?? null
  const hasTelegramLinked = Boolean(telegramId)
  const hasRequiredContacts = isSuperAdmin || Boolean(
    email &&
    !email.startsWith('telegram-guest-'),
  )

  if (!hasTelegramLinked && hasSubscription && process.env.NODE_ENV !== 'production') {
    const telegramOptionalSnapshot = {
      userId: user.id,
      email,
      telegramEnabled: user.telegramEnabled,
      telegramUserId: user.telegramUserId,
      telegramChatId: user.telegramChatId,
      telegramLinkChatId: user.telegramLinkChatId,
      hasSubscription,
      currentFlow,
      accessLevel,
    }

    if (shouldLogTelegramOptionalSnapshot(user.id, telegramOptionalSnapshot)) {
      console.info('[access/state] TELEGRAM_OPTIONAL snapshot', telegramOptionalSnapshot)
    }
  }

  return {
    accessLevel,
    currentFlow,
    currentStep,
    hasLeadMagnet,
    hasSubscription,
    telegramId,
    email,
    hasRequiredContacts,
    hasTelegramLinked,
    telegramEnabled: user.telegramEnabled,
  }
}

export async function getUserAccess(userId: string, _precomputedAccessControl?: AccessControlState): Promise<UserAccessResult> {
  const user = await getAccessUserSnapshot(userId)
  if (!user) throw new Error('User not found')

  const now          = new Date()
  const trialStatus = await getTrialStatus(userId)
  const subscription = user.subscription
  const items: AccessItem[] = []
  const isSuperAdmin = user.role === 'SUPERADMIN'
  const effectiveRole = resolveEffectiveRole({
    role: user.role,
    productAccesses: user.productAccesses,
  })
  const accessControl = _precomputedAccessControl ?? await getAccessControlState(userId)
  const canUseClientFeatures = accessControl.hasSubscription

  // ── SUPERADMIN ─────────────────────────────────────────────────────────────
  if (user.role === 'SUPERADMIN' || isSuperAdmin) {
    return {
      role:      'SUPERADMIN',
      plan:      'paid',
      trialEnd:  null,
      items:     [
        { key: 'mentor.core', source: 'admin', expiresAt: null },
        { key: 'products.manage', source: 'admin', expiresAt: null },
        { key: 'admin.clients.view', source: 'admin', expiresAt: null },
        { key: 'admin.revenue.view', source: 'admin', expiresAt: null },
        { key: 'admin.roles.manage', source: 'admin', expiresAt: null },
        { key: 'funnels.manage', source: 'admin', expiresAt: null },
      ],
      abilities: getAllAbilities(true),
    }
  }

  // ── EXPERT / ADMIN ────────────────────────────────────────────────────────
  if (user.role === 'EXPERT' || user.role === 'ADMIN') {
    const abilities = getAllAbilities(false)
    abilities['mentor.core'] = true
    abilities['products.manage'] = true
    abilities['admin.clients.view'] = true
    abilities['funnels.manage'] = true

    if (user.role === 'ADMIN') {
      abilities['admin.revenue.view'] = true
      abilities['admin.roles.manage'] = true
    }

    return {
      role: user.role,
      plan: 'paid',
      trialEnd: null,
      items: [
        { key: 'mentor.core', source: 'admin', expiresAt: null },
        { key: 'products.manage', source: 'admin', expiresAt: null },
        { key: 'admin.clients.view', source: 'admin', expiresAt: null },
        { key: 'funnels.manage', source: 'admin', expiresAt: null },
        ...(user.role === 'ADMIN'
          ? [
              { key: 'admin.revenue.view' as const, source: 'admin' as const, expiresAt: null },
              { key: 'admin.roles.manage' as const, source: 'admin' as const, expiresAt: null },
            ]
          : []),
      ],
      abilities,
    }
  }

  if (user.productAccesses.length > 0) {
    items.push(...buildProductAccessItems(user.productAccesses))
  }

  // ── PAID ───────────────────────────────────────────────────────────────────
  const isPaidActive =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)

  if (isPaidActive && canUseClientFeatures) {
    const expiresAt = subscription!.currentPeriodEnd ?? null
    items.push(
      { key: 'mentor.core',       source: 'purchase', expiresAt },
      { key: 'mentor.daily',      source: 'purchase', expiresAt },
      { key: 'mentor.decisions',  source: 'purchase', expiresAt },
      { key: 'mentor.wheel',      source: 'purchase', expiresAt },
      { key: 'mentor.vision',     source: 'purchase', expiresAt },
      { key: 'mentor.goals',      source: 'purchase', expiresAt },
      { key: 'mentor.actions',    source: 'purchase', expiresAt },
      { key: 'mentor.zoom',       source: 'purchase', expiresAt },
      { key: 'ai.basic',          source: 'purchase', expiresAt },
      { key: 'ai.deep',           source: 'purchase', expiresAt },
      { key: 'ai.pdf',            source: 'purchase', expiresAt },
      { key: 'ai.export',         source: 'purchase', expiresAt },
      { key: 'products.manage',   source: 'purchase', expiresAt },
    )
  }

  // ── TRIAL ──────────────────────────────────────────────────────────────────
  const isTrialActive =
    !isPaidActive &&
    (
      (
        subscription?.status === 'TRIAL' &&
        !!subscription.trialEndsAt &&
        subscription.trialEndsAt > now
      ) ||
      trialStatus.isActive
    )

  if (isTrialActive && canUseClientFeatures) {
    const expiresAt = trialStatus.endsAt
    const trialDay = trialStatus.currentDay
    const wheelAllowed = trialDay === 1
    items.push(
      { key: 'mentor.daily',   source: 'trial', expiresAt },
      { key: 'progress.view',  source: 'trial', expiresAt },
      ...(wheelAllowed
        ? [
            { key: 'mentor.wheel', source: 'trial', expiresAt } as AccessItem,
            { key: 'wheel.view',   source: 'trial', expiresAt } as AccessItem,
          ]
        : []),
    )
  }

  // ── FREE ───────────────────────────────────────────────────────────────────
  items.push(
    { key: 'dashboard.view',  source: 'free', expiresAt: null },
    { key: 'profile.view',    source: 'free', expiresAt: null },
    { key: 'settings.manage', source: 'free', expiresAt: null },
  )
// --- mentorship access ---
const isMentorshipActive =
  user.mentorship?.status === 'ACTIVE' &&
  (!user.mentorship.endsAt || user.mentorship.endsAt > now)

if (isMentorshipActive) {
  const expiresAt = user.mentorship!.endsAt ?? null

  items.push(
    { key: 'mentor.mentorship', source: 'purchase', expiresAt },
    { key: 'mentor.zoom', source: 'purchase', expiresAt },
  )
}
  // ── ABILITIES ──────────────────────────────────────────────────────────────
  const abilities = getAllAbilities(false)
  for (const item of items) {
    abilities[item.key] = true
  }

  abilities.dashboard      = abilities['dashboard.view']  === true
  abilities.profile        = abilities['profile.view']    === true
  abilities.wheel          = abilities['wheel.view']      === true
  abilities.progress       = abilities['progress.view']   === true
  abilities.settings       = abilities['settings.manage'] === true
  abilities.products       = abilities['products.manage'] === true
  abilities.mentor         = abilities['mentor.core']     === true
  abilities.vision         = abilities['mentor.vision']   === true
  abilities.goal           = abilities['mentor.goals']    === true
  abilities.actions        = abilities['mentor.actions']  === true
  abilities['ai-generator']= abilities['ai.basic']        === true

  const plan: 'paid' | 'trial' | 'free' =
    isPaidActive ? 'paid' : isTrialActive ? 'trial' : 'free'

  return {
    role:     effectiveRole,
    plan,
    trialEnd: trialStatus.endsAt,
    items,
    abilities,
  }
}

export function canAccessFeature(result: UserAccessResult, feature: string): boolean {
  return (result.abilities as Record<string, boolean>)[feature] === true
}

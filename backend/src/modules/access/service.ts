// backend/src/modules/access/access.service.ts
import { prisma } from '../../db/client.js'
import { getAllAbilities } from '../../modules/auth/abilities.js'
import { getTrialStatus } from '../trial/service.js'
import { ensureOwnerExpertIdForUser } from '../experts/ownership.service.js'
import {
  PRODUCT_ACCESS_PRODUCTS,
  PRODUCT_ACCESS_ROLES,
  type AccessControlState,
  type AccessItem,
  type ProductAccessAssignment,
  type ProductAccessProduct,
  type ProductAccessRole,
  type UserAccessResult,
  type UserSystemState,
} from './types.js'

type AccessUserSnapshot = {
  id: string
  email: string | null
  role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
  onboardingStage: string | null
  currentStep: string | null
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  telegramEnabled: boolean
  telegramUserId: string | null
  telegramChatId: string | null
  telegramLinkChatId: string | null
  telegramLinkActive: boolean
  fivePointsEnrollment: {
    progress: unknown
    completedAt: Date | null
    createdAt: Date
  } | null
  subscription: {
    status: string
    trialEndsAt: Date | null
    currentPeriodEnd: Date | null
    createdAt: Date
  } | null
  mentorship: {
    status: string
    endsAt: Date | null
  } | null
  productAccesses: ProductAccessAssignment[]
}

function resolveOnboardingStage(
  onboardingStage: string | null | undefined,
  currentStep: string | null | undefined,
): string | null {
  const step = String(currentStep ?? '').trim()
  if (step === 'lead_magnet') return 'lead_magnet'
  const stage = String(onboardingStage ?? '').trim()
  return stage || null
}

const telegramOptionalSnapshotByUser = new Map<string, string>()

function shouldLogTelegramOptionalSnapshot(userId: string, snapshot: Record<string, unknown>) {
  const nextSnapshot = JSON.stringify(snapshot)
  if (telegramOptionalSnapshotByUser.get(userId) === nextSnapshot) {
    return false
  }

  telegramOptionalSnapshotByUser.set(userId, nextSnapshot)
  if (telegramOptionalSnapshotByUser.size > 500) {
    const oldestKey = telegramOptionalSnapshotByUser.keys().next().value
    if (oldestKey) telegramOptionalSnapshotByUser.delete(oldestKey)
  }
  return true
}

function isProductAccessTableMissing(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string; meta?: { table?: string } }
  if (candidate.code !== 'P2021' && candidate.code !== 'P2022') return false
  const message = String(candidate.message ?? '').toLowerCase()
  const table = String(candidate.meta?.table ?? '').toLowerCase()
  return table.includes('product_access') || message.includes('product_access')
}

function isProductAccessProduct(value: string): value is ProductAccessProduct {
  return (PRODUCT_ACCESS_PRODUCTS as readonly string[]).includes(value)
}

function isProductAccessRole(value: string): value is ProductAccessRole {
  return (PRODUCT_ACCESS_ROLES as readonly string[]).includes(value)
}

function resolveEffectiveRole(input: {
  role: AccessUserSnapshot['role']
  productAccesses: ProductAccessAssignment[]
}): 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN' {
  if (input.role === 'SUPERADMIN') return 'SUPERADMIN'
  if (input.role === 'ADMIN') return 'ADMIN'
  if (input.role === 'EXPERT') return 'EXPERT'
  if (input.productAccesses.some((item) => item.role === 'ADMIN')) return 'ADMIN'
  if (input.productAccesses.some((item) => item.role === 'EXPERT')) return 'EXPERT'
  return 'USER'
}

function shouldPromoteUserRole(currentRole: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN', targetRole: ProductAccessRole) {
  if (currentRole === 'SUPERADMIN') return false
  if (currentRole === 'ADMIN') return false
  if (targetRole === 'ADMIN') return true
  if (targetRole === 'EXPERT') return currentRole === 'USER'
  return false
}

function toUserRole(targetRole: ProductAccessRole): 'EXPERT' | 'ADMIN' {
  return targetRole === 'ADMIN' ? 'ADMIN' : 'EXPERT'
}

function buildProductAccessItems(assignments: ProductAccessAssignment[]): AccessItem[] {
  const items: AccessItem[] = []

  for (const assignment of assignments) {
    if (assignment.product === 'AI_MENTOR') {
      items.push(
        { key: 'mentor.core', source: 'admin', expiresAt: null },
        { key: 'products.manage', source: 'admin', expiresAt: null },
        { key: 'admin.clients.view', source: 'admin', expiresAt: null },
        { key: 'funnels.manage', source: 'admin', expiresAt: null },
      )
    }

    if (assignment.product === 'AI_ASSISTANT') {
      items.push(
        { key: 'products.manage', source: 'admin', expiresAt: null },
        { key: 'mentor.core', source: 'admin', expiresAt: null },
      )
    }
  }

  return items
}


async function getAccessUserSnapshot(userId: string): Promise<AccessUserSnapshot | null> {
  const baseSelect = {
    id: true,
    email: true,
    role: true,
        currentStep: true,
    trialStartsAt: true,
    trialEndsAt: true,
    telegramEnabled: true,
    telegramUserId: true,
    telegramChatId: true,
    telegramLinks: {
      where: { chatId: { not: null } },
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        chatId: true,
        isActive: true,
      },
    },
    notificationPreference: {
      select: {
        telegramEnabled: true,
      },
    },

    fivePointsEnrollment: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        progress: true,
        completedAt: true,
        createdAt: true,
      },
    },

    subscriptions: {
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
        createdAt: true,
      },
    },

    mentorships: {
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        status: true,
        endsAt: true,
      },
    },
  }

  let user: any = null

  try {
    user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...baseSelect,
        productAccesses: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            userId: true,
            product: true,
            role: true,
            createdAt: true,
          },
        },
      } as any,
    })
  } catch (error) {
    if (!isProductAccessTableMissing(error)) throw error

    user = await prisma.user.findUnique({
      where: { id: userId },
      select: baseSelect as any,
    })
  }

  if (!user) return null

  const sub = user.subscriptions[0] ?? null
  const leadEnrollment = user.fivePointsEnrollment[0] ?? null
  const mentorship = user.mentorships[0] ?? null

  return {
    id: user.id,
    email: user.email,
      role: user.role as 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN',
    onboardingStage: user.onboardingStage ?? null,
    currentStep: user.currentStep ?? null,
    trialStartsAt: user.trialStartsAt ?? null,
    trialEndsAt: user.trialEndsAt ?? null,
    telegramEnabled: user.notificationPreference?.telegramEnabled ?? user.telegramEnabled ?? true,
    telegramUserId: user.telegramUserId ?? null,
    telegramChatId: user.telegramChatId ?? null,
    telegramLinkChatId: user.telegramLinks[0]?.chatId ?? null,
    telegramLinkActive: user.telegramLinks[0]?.isActive ?? false,
    fivePointsEnrollment: leadEnrollment
      ? {
          progress: leadEnrollment.progress,
          completedAt: leadEnrollment.completedAt,
          createdAt: leadEnrollment.createdAt,
        }
      : null,

    subscription: sub
      ? {
          status: sub.status,
          trialEndsAt: sub.trialEndsAt,
          currentPeriodEnd: sub.currentPeriodEnd,
          createdAt: sub.createdAt,
        }
      : null,

    mentorship: mentorship
      ? {
          status: mentorship.status,
          endsAt: mentorship.endsAt ?? null,
        }
      : null,
    productAccesses: (user.productAccesses ?? []).flatMap((access: {
      id: string
      userId: string
      product: string
      role: string
      createdAt: Date
    }) => {
      if (!isProductAccessProduct(access.product) || !isProductAccessRole(access.role)) {
        return []
      }

      return [{
        id: access.id,
        userId: access.userId,
        product: access.product,
        role: access.role,
        createdAt: access.createdAt,
      }]
    }),
  }
}

function deriveLeadStep(progress: unknown): number {
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
    return 0
  }

  const raw = progress as {
    completedLessons?: unknown
    steps?: unknown
  }

  if (typeof raw.completedLessons === 'number' && Number.isFinite(raw.completedLessons)) {
    return raw.completedLessons
  }

  if (Array.isArray(raw.steps)) {
    return raw.steps.filter(step => {
      if (!step || typeof step !== 'object' || Array.isArray(step)) {
        return false
      }

      return (step as { completed?: unknown }).completed === true
    }).length
  }

  return 0
}

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
  const isUserTrialActive = trial.isActive
  const hasSubscription = isSuperAdmin || isPaidActive || isSubscriptionTrialActive || isUserTrialActive
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

export async function getUserProductAccesses(userId: string): Promise<ProductAccessAssignment[]> {
  const rows = await prisma.productAccess.findMany({
    where: { userId },
    orderBy: [{ product: 'asc' }, { createdAt: 'desc' }],
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      return []
    }

    throw error
  })

  return rows.flatMap((row) => {
    if (!isProductAccessProduct(row.product) || !isProductAccessRole(row.role)) {
      return []
    }

    return [{
      id: row.id,
      userId: row.userId,
      product: row.product,
      role: row.role,
      createdAt: row.createdAt,
    }]
  })
}

export async function grantProductAccess(input: {
  userId: string
  product: ProductAccessProduct
  role: ProductAccessRole
}): Promise<ProductAccessAssignment> {
  const currentUser = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { role: true },
  })

  const assignment = await prisma.productAccess.upsert({
    where: {
      userId_product: {
        userId: input.userId,
        product: input.product,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      userId: input.userId,
      product: input.product,
      role: input.role,
    },
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      throw new Error('product_access_table_missing')
    }

    throw error
  })

  if (currentUser && shouldPromoteUserRole(currentUser.role as 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN', input.role)) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        role: toUserRole(input.role),
      },
    })
  }

  if (input.role === 'EXPERT' || input.role === 'ADMIN') {
    await ensureOwnerExpertIdForUser(input.userId).catch(() => null)
  }

  if (input.product === 'AI_MENTOR') {
    await prisma.mentorConfig.upsert({
      where: { userId: input.userId },
      update: {},
      create: { userId: input.userId },
    }).catch(() => null)
  }

  return {
    id: assignment.id,
    userId: assignment.userId,
    product: input.product,
    role: input.role,
    createdAt: assignment.createdAt,
  }
}

export async function revokeProductAccess(input: {
  userId: string
  product: ProductAccessProduct
}): Promise<void> {
  await prisma.productAccess.delete({
    where: {
      userId_product: {
        userId: input.userId,
        product: input.product,
      },
    },
  }).catch((error: unknown) => {
    if (isProductAccessTableMissing(error)) {
      throw new Error('product_access_table_missing')
    }

    throw error
  })
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

const PRODUCT_TEMPLATES: UserSystemState['products']['templates'] = [
  {
    id:                'wheel-basic',
    name:              'Колесо балансу',
    result:            'Зафіксований дисбаланс і фокус сфера',
    modules:           ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    finalStateExample: 'Слабка сфера визначена, місячна динаміка доступна',
    cta:               'TRY_7_DAYS',
  },
  {
    id:                'ai-mentor-basic',
    name:              'ABsystem',
    result:            'Структурований цикл станів і звітів',
    modules:           ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    finalStateExample: 'Щоденний цикл, дзеркала, місячний звіт',
    cta:               'CREATE',
  },
]

export async function getUserSystemState(userId: string): Promise<UserSystemState> {
  const accessControl = await getAccessControlState(userId)
  const access      = await getUserAccess(userId, accessControl)
  const trialStatus = await getTrialStatus(userId)
  const now         = new Date()
  const isSuperAdmin = String(access.role).toUpperCase() === 'SUPERADMIN'

  // fix6: prisma.product / prisma.enrollment — звертаємось через реальні моделі схеми
  const ownedRaw = await prisma.product
    .findMany({
      where:   isSuperAdmin ? undefined : { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, name: true },
    })
    .catch((err: any) => {
      if (err?.code === 'P2021' || err?.code === 'P2022') return []
      throw err
    })

  const subscribedRaw = await prisma.enrollment
    .findMany({
      where:   isSuperAdmin ? undefined : { userId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { enrolledAt: 'desc' },
    })
    .catch((err: any) => {
      if (err?.code === 'P2021' || err?.code === 'P2022') return []
      throw err
    })

  const latestSubscription = await prisma.subscription
    .findFirst({
      where:   isSuperAdmin ? undefined : { userId },
      orderBy: { createdAt: 'desc' },
      select:  { startsAt: true, createdAt: true },
    })
    .catch((err: any) => {
      if (err?.code === 'P2021' || err?.code === 'P2022') return null
      throw err
    })

  const subscribed = subscribedRaw.map((row) => {
    const trialActive = !!row.trialEnd && new Date(row.trialEnd) > now
    const paidActive  = row.purchased === true
    return {
      id:        row.product.id,
      name:      row.product.name,
      status:    paidActive ? 'paid' : trialActive ? 'trial' : 'locked',
      expiresAt: row.trialEnd ?? null,
    } as UserSystemState['products']['subscribed'][number]
  })

  const trialEnd = access.trialEnd

  const modules: UserSystemState['aiModules'] = [
    'WHEEL_OF_BALANCE',
    'AI_MENTOR',
    'AI_FUNNEL',
    'AI_GENERATOR',
  ].map((moduleId) => {
    const paid        = access.plan === 'paid' || isSuperAdmin
    const trial       = access.plan === 'trial' && !isSuperAdmin
    const accessLevel = paid ? 'PAID' : trial ? 'TRIAL' : 'NONE'
    const isLocked    = accessLevel === 'NONE'
    const lockReason  = isLocked
      ? trialEnd && trialEnd <= now ? 'TRIAL_EXPIRED' : 'NO_SUBSCRIPTION'
      : null
    return { moduleId, accessLevel, isLocked, lockReason }
  })

  const showMyProductsSection = ownedRaw.length > 0 || isSuperAdmin

  return {
    accessControl,
    products: {
      owned: ownedRaw.map((p) => ({
        id:     p.id,
        name:   p.name,
        type:   null,
        status: access.plan === 'paid' ? 'paid' : access.plan === 'trial' ? 'trial' : 'locked',
      })),
      subscribed,
      templates: PRODUCT_TEMPLATES.map((tpl) => ({
        ...tpl,
        cta: access.plan === 'paid' || isSuperAdmin ? 'CREATE' : 'TRY_7_DAYS',
      })),
    },
    aiModules: modules,
    permissions: {
      role:               isSuperAdmin ? 'SUPERADMIN' : access.role === 'ADMIN' ? 'ADMIN' : access.role === 'EXPERT' ? 'EXPERT' : 'USER',
      canCreateProducts:  isSuperAdmin || access.abilities['products.manage'] === true,
      canBypassTrial:     isSuperAdmin,
      canSeeAdminTools:   isSuperAdmin || access.role === 'EXPERT' || access.role === 'ADMIN',
    },
    trial: {
      isActive: trialStatus.isActive,
      daysLeft: trialStatus.daysLeft,
      endsAt:   trialEnd,
    },
    subscription: {
      isActive:  access.plan === 'paid',
      status:    access.plan === 'paid' ? 'ACTIVE' : access.plan === 'trial' ? 'TRIAL' : null,
      expiresAt: trialEnd,
      currentPeriodStart: latestSubscription?.startsAt ?? latestSubscription?.createdAt ?? null,
    },
    mentorship: {
  isActive: access.items.some(i => i.key === 'mentor.mentorship'),
},
    ui: {
      showMyProductsSection,
      showCreateProductCta: !showMyProductsSection,
      showTemplatesSection:  true,
      showAdminPanel:        isSuperAdmin || access.role === 'EXPERT' || access.role === 'ADMIN',
    },
    meta: {
      version:   1,
      updatedAt: new Date().toISOString(),
    },
  }
}

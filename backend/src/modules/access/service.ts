// backend/src/modules/access/access.service.ts
import { prisma } from '../../db/client.js'
import { getAllAbilities } from '../../modules/auth/abilities.js'
import { isSuperAdminEmail } from '../../modules/auth/superadmin.js'
import type { AccessItem, UserAccessResult, UserSystemState } from './types.js'

type AccessUserSnapshot = {
  id: string
  email: string | null
  role: 'USER' | 'EXPERT' | 'SUPERADMIN'
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
}


async function getAccessUserSnapshot(userId: string): Promise<AccessUserSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,

      subscriptions: {
        orderBy: { createdAt: 'desc' },
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
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          endsAt: true,
        },
      },
    },
  })

  if (!user) return null

  const sub = user.subscriptions[0] ?? null
  const mentorship = user.mentorships[0] ?? null

  return {
    id: user.id,
    email: user.email,
    role: user.role as 'USER' | 'EXPERT' | 'SUPERADMIN',

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
  }
}

export async function getUserAccess(userId: string): Promise<UserAccessResult> {
  const user = await getAccessUserSnapshot(userId)
  if (!user) throw new Error('User not found')

  const now          = new Date()
  const subscription = user.subscription
  const items: AccessItem[] = []
  const isSuperAdmin = isSuperAdminEmail(user.email ?? '')

  // ── SUPERADMIN ─────────────────────────────────────────────────────────────
  if (user.role === 'SUPERADMIN' || isSuperAdmin) {
    return {
      role:      'SUPERADMIN',
      plan:      'paid',
      trialEnd:  null,
      items:     [{ key: 'mentor.core', source: 'admin', expiresAt: null }],
      abilities: getAllAbilities(true),
    }
  }

  // ── PAID ───────────────────────────────────────────────────────────────────
  const isPaidActive =
    subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)

  if (isPaidActive) {
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
    subscription?.status === 'TRIAL' &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt > now

  if (isTrialActive) {
    const expiresAt = subscription!.trialEndsAt
    const trialDay = subscription?.createdAt
      ? Math.floor((now.getTime() - subscription.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null
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
    role:     user.role,
    plan,
    trialEnd: subscription?.trialEndsAt ?? null,
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
    name:              'AI Ментор',
    result:            'Структурований цикл станів і звітів',
    modules:           ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    finalStateExample: 'Щоденний цикл, дзеркала, місячний звіт',
    cta:               'CREATE',
  },
]

export async function getUserSystemState(userId: string): Promise<UserSystemState> {
  const access      = await getUserAccess(userId)
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
  const trialDaysLeft =
    trialEnd && trialEnd > now
      ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0

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
      role:               isSuperAdmin ? 'SUPERADMIN' : 'USER',
      canCreateProducts:  isSuperAdmin || access.abilities['products.manage'] === true,
      canBypassTrial:     isSuperAdmin,
      canSeeAdminTools:   isSuperAdmin,
    },
    trial: {
      isActive: access.plan === 'trial',
      daysLeft: trialDaysLeft,
      endsAt:   trialEnd,
    },
    subscription: {
      isActive:  access.plan === 'paid',
      status:    access.plan === 'paid' ? 'ACTIVE' : access.plan === 'trial' ? 'TRIAL' : null,
      expiresAt: trialEnd,
    },
    mentorship: {
  isActive: access.items.some(i => i.key === 'mentor.mentorship'),
},
    ui: {
      showMyProductsSection,
      showCreateProductCta: !showMyProductsSection,
      showTemplatesSection:  true,
      showAdminPanel:        isSuperAdmin,
    },
    meta: {
      version:   1,
      updatedAt: new Date().toISOString(),
    },
  }
}
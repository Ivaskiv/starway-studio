import { prisma } from '../../db/client.js'
import { getTrialStatus } from '../trial/service.js'
import { getUserAccessState } from '../subscriptions/payments/focus-access.js'
import type { UserSystemState } from './types.js'
import { getAccessControlState, getUserAccess } from './control.service.js'
import { getAccessUserSnapshot } from './snapshot.service.js'
import { hasActiveAbsystemAiEntitlement } from './trial.service.js'

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
  const zoomAccess = await getUserAccessState(userId)
  const user = await getAccessUserSnapshot(userId)
  if (!user) {
    throw new Error('User not found')
  }
  const hasAbsystemAiEntitlement = hasActiveAbsystemAiEntitlement(user, new Date())
  console.log('[ZOOM_ACCESS_DEBUG]', {
    userId,
    zoomAccess,
    hasAbsystemAiEntitlement,
    absystemGrantSource: user.absystemGrantSource,
  })
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
    zoomAccess: {
      state: zoomAccess.state,
      isActive: zoomAccess.isActive,
      hasFocus: zoomAccess.hasFocus,
      expiresAt: zoomAccess.expiresAt,
    },
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

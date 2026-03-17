import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import type { Response } from 'express'
import { prisma } from '../../db/client.js'
import { isSuperAdminEmail, isSuperAdminRequest } from '../../modules/auth/superadmin.js'
import { findUserById, toSafeUser } from '../../modules/auth/auth.service.js'

// ✅ НОВИЙ: endpoint для отримання abilities
export async function getMyAccess(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const user = await findUserById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const safeUser = toSafeUser(user)

  // Конвертуємо масив abilities в об'єкт
  const abilitiesMap: Record<string, boolean> = {}
  safeUser.abilities.forEach((ability) => {
    abilitiesMap[ability] = true
  })

  return res.json({
    abilities: abilitiesMap,
    plan: safeUser.access.plan,
    role: safeUser.role,
    trialEnd: safeUser.access.trialEnd,
  })
}

// ✅ НОВИЙ: повний системний стан користувача
export async function getMySystemState(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      role: true,
    },
  })

  const [subscriptions, enrollments] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 1,
    }),
    prisma.enrollment.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            kind: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
  ])

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const now = new Date()
  const subscription = subscriptions[0] || null
  const isSuperAdmin = user.email ? isSuperAdminEmail(user.email) : false
  const isAdmin = user.role === 'SUPERADMIN' || isSuperAdmin

  const isTrialActive = subscription?.status === 'TRIAL' &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt > now

  const trialDaysLeft = isTrialActive && subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  const isSubscriptionActive = subscription?.status === 'ACTIVE' &&
    (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > now)

  const ownedProducts = enrollments.map((e) => ({
    id: e.product.id,
    name: e.product.name,
    type: e.product.kind ?? null,
    status: e.purchased ? 'paid' : e.trialEnd && e.trialEnd > now ? 'trial' : 'expired',
  }))

  const subscribedProducts = enrollments
    .filter((e) => e.purchased || (e.trialEnd && e.trialEnd > now))
    .map((e) => ({
      id: e.product.id,
      name: e.product.name,
      status: (e.purchased ? 'paid' : 'trial') as 'trial' | 'paid' | 'locked',
      expiresAt: e.expiresAt?.toISOString() || null,
    }))

  const templates = [
    {
      id: 'wheel-basic',
      name: 'Колесо Балансу',
      result: 'Візуалізація 8 сфер життя',
      modules: ['balance', 'vision'],
      finalStateExample: 'Детальний звіт по балансу',
      cta: 'TRY_7_DAYS' as const,
    },
  ]

  const aiModules = [
    {
      moduleId: 'ai-mentor',
      accessLevel: (isSubscriptionActive || isAdmin ? 'PAID' : isTrialActive ? 'TRIAL' : 'NONE') as 'TRIAL' | 'PAID' | 'NONE',
      isLocked: !isSubscriptionActive && !isTrialActive && !isAdmin,
      lockReason: (!isSubscriptionActive && !isTrialActive && !isAdmin
        ? (subscription?.trialEndsAt && subscription.trialEndsAt < now ? 'TRIAL_EXPIRED' : 'NO_SUBSCRIPTION')
        : null) as 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null,
    },
  ]

  const permissions = {
    role: (isAdmin ? 'SUPERADMIN' : 'USER') as 'USER' | 'SUPERADMIN',
    canCreateProducts: isAdmin,
    canBypassTrial: isAdmin,
    canSeeAdminTools: isAdmin,
  }

  const ui = {
    showMyProductsSection: ownedProducts.length > 0,
    showCreateProductCta: isAdmin || isSubscriptionActive,
    showTemplatesSection: true,
    showAdminPanel: isAdmin,
  }

  return res.json({
    products: {
      owned: ownedProducts,
      subscribed: subscribedProducts,
      templates,
    },
    aiModules,
    permissions,
    trial: {
      isActive: isTrialActive,
      daysLeft: trialDaysLeft,
      endsAt: subscription?.trialEndsAt?.toISOString() || null,
    },
    subscription: {
      isActive: isSubscriptionActive,
      status: subscription?.status || null,
      expiresAt: subscription?.currentPeriodEnd?.toISOString() || null,
    },
    ui,
    meta: {
      version: 1,
      updatedAt: new Date().toISOString(),
    },
  })
}

export async function getAdminClients(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const isAdmin = req.user.role === 'SUPERADMIN' || isSuperAdminRequest(req)
  if (!isAdmin) {
    return res.status(403).json({ error: 'forbidden' })
  }

  const clients = await prisma.user.findMany({
    where: { role: 'USER' },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ clients })
}

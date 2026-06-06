import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import type { Response } from 'express'
import { isSuperAdminRequest } from '../../modules/auth/superadmin.js'
import { findUserById } from '../../modules/auth/auth.service.js'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { prisma } from '../../db/client.js'
import { ensureOwnerExpertIdForUser, reassignLifecycleUsersToExpert } from '../experts/ownership.service.js'
import {
  grantProductAccess,
  revokeProductAccess,
  getAccessControlState,
  getUserAccess,
  getUserProductAccesses,
  getUserSystemState,
} from './service.js'
import {
  PRODUCT_ACCESS_PRODUCTS,
  PRODUCT_ACCESS_ROLES,
  type ProductAccessProduct,
  type ProductAccessRole,
} from './types.js'
import { sendAccessGrantedNotification } from '../telegram-mentor/flows/access.flow.js'

function isAllowedProduct(value: string): value is ProductAccessProduct {
  return (PRODUCT_ACCESS_PRODUCTS as readonly string[]).includes(value)
}

function isAllowedRole(value: string): value is ProductAccessRole {
  return (PRODUCT_ACCESS_ROLES as readonly string[]).includes(value)
}

function ensureSuperAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (!req.user) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }

  if (!isSuperAdminRequest(req)) {
    res.status(403).json({ error: 'superadmin_only' })
    return false
  }

  return true
}

// ✅ НОВИЙ: endpoint для отримання abilities
export async function getMyAccess(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const user = await findUserById(req.user.id)
  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const state = await resolveUserState(req.user.id).catch(() => null)
  const accessControl = await getAccessControlState(req.user.id)
  const access = await getUserAccess(req.user.id)

  await trackEvent({
    userId: req.user.id,
    type: 'web_access_viewed',
    source: 'web',
    state,
    payload: {
      plan: access.plan,
      role: access.role,
    },
  })

  return res.json({
    abilities: access.abilities,
    items: access.items,
    plan: access.plan,
    role: access.role,
    trialEnd: access.trialEnd,
    accessLevel: accessControl.accessLevel,
    currentFlow: accessControl.currentFlow,
  })
}

// ✅ НОВИЙ: повний системний стан користувача
export async function getMySystemState(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const state = await resolveUserState(req.user.id).catch(() => null)
  const systemState = await getUserSystemState(req.user.id)
  await trackEvent({
    userId: req.user.id,
    type: 'web_system_state_viewed',
    source: 'web',
    state,
    payload: {
      trialActive: systemState.trial.isActive,
      subscriptionActive: systemState.subscription.isActive,
      ownedProducts: systemState.products.owned.length,
      subscribedProducts: systemState.products.subscribed.length,
      currentFlow: systemState.accessControl.currentFlow,
      accessLevel: systemState.accessControl.accessLevel,
    },
  })

  return res.json(systemState)
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
            firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  await trackEvent({
    userId: req.user.id,
    type: 'web_admin_clients_viewed',
    source: 'web',
    state: 'admin',
    payload: {
      count: clients.length,
    },
  })

  return res.json({ clients })
}

export async function grantUserProductAccess(req: AuthenticatedRequest, res: Response) {
  if (!ensureSuperAdmin(req, res)) return

  const { userId, product, role } = req.body as {
    userId?: string
    product?: string
    role?: string
  }

  if (!userId || !product || !role) {
    return res.status(400).json({ error: 'userId_product_role_required' })
  }

  if (!isAllowedProduct(product)) {
    return res.status(400).json({ error: 'invalid_product' })
  }

  if (!isAllowedRole(role)) {
    return res.status(400).json({ error: 'invalid_role' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      expertId: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  let assignment
  try {
    assignment = await grantProductAccess({ userId, product, role })
  } catch (error) {
    if (error instanceof Error && error.message === 'product_access_table_missing') {
      return res.status(503).json({ error: 'product_access_unavailable', message: 'Apply the latest database migration to enable product access.' })
    }

    throw error
  }
  const state = await resolveUserState(req.user!.id).catch(() => null)
  let migration: {
    reassignedUsers: number
    updatedSubscriptions: number
    updatedPaymentLogs: number
    updatedPurchaseHistory: number
    sourceExpertId: string | null
  } | null = null

  if (product === 'AI_MENTOR' && role === 'EXPERT' && req.user?.id) {
    const targetExpertId = user.expertId ?? await ensureOwnerExpertIdForUser(user.id).catch(() => null)
    if (targetExpertId) {
      migration = await reassignLifecycleUsersToExpert({
        sourceUserId: req.user.id,
        targetExpertId,
        excludeUserId: user.id,
      }).catch(() => null)
    }
  }

  await trackEvent({
    userId: req.user!.id,
    type: 'admin_product_access_granted',
    source: 'web',
    state,
    payload: {
      targetUserId: userId,
      product,
      role,
      reassignedUsers: migration?.reassignedUsers ?? 0,
    },
  })

  const notification = await sendAccessGrantedNotification({
    user: {
      id: user.id,
      firstName: user.firstName ?? null,
      email: user.email,
      telegramChatId: user.telegramChatId ?? null,
      telegramUserId: user.telegramUserId ?? null,
      telegramLinks: user.telegramLinks,
    },
    product,
    role,
  }).catch(() => ({
    channel: 'telegram' as const,
    delivered: false,
    recipient: {
      email: user.email,
      chatId: user.telegramLinks[0]?.chatId ?? user.telegramChatId ?? user.telegramUserId ?? null,
    },
    product,
    role,
    text: '',
    cta: {
      label: '🌐 Відкрити Starway',
      type: 'url' as const,
      url: (process.env.FRONTEND_URL?.trim() || 'http://localhost:5173').replace(/\/$/, '') + '/miniapp?startapp=admin',
    },
  }))

  return res.json({
    ok: true,
    assignment,
    migration,
    notified: notification.delivered,
    notification,
  })
}

export async function revokeUserProductAccess(req: AuthenticatedRequest, res: Response) {
  if (!ensureSuperAdmin(req, res)) return

  const { userId, product } = req.body as {
    userId?: string
    product?: string
  }

  if (!userId || !product) {
    return res.status(400).json({ error: 'userId_product_required' })
  }

  if (!isAllowedProduct(product)) {
    return res.status(400).json({ error: 'invalid_product' })
  }

  try {
    await revokeProductAccess({ userId, product })
  } catch (error) {
    if (error instanceof Error && error.message === 'product_access_table_missing') {
      return res.status(503).json({ error: 'product_access_unavailable', message: 'Apply the latest database migration to enable product access.' })
    }
    const code = (error as { code?: string } | null)?.code
    if (code !== 'P2025') throw error
  }

  const state = await resolveUserState(req.user!.id).catch(() => null)
  await trackEvent({
    userId: req.user!.id,
    type: 'admin_product_access_revoked',
    source: 'web',
    state,
    payload: {
      targetUserId: userId,
      product,
    },
  })

  return res.json({ ok: true })
}

export async function getUserProductAccess(req: AuthenticatedRequest, res: Response) {
  if (!ensureSuperAdmin(req, res)) return

  const userId = req.params.userId
  if (!userId) {
    return res.status(400).json({ error: 'userId_required' })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      telegramUserName: true,
      telegramChatId: true,
      telegramUserId: true,
      telegramLinkedAt: true,
      telegramLinks: {
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        select: {
          id: true,
          chatId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  })

  if (!user) {
    return res.status(404).json({ error: 'user_not_found' })
  }

  const accesses = await getUserProductAccesses(userId).catch((error: unknown) => {
    if (error instanceof Error && error.message === 'product_access_table_missing') {
      return null
    }
    throw error
  })

  if (accesses === null) {
    return res.status(503).json({ error: 'product_access_unavailable', message: 'Apply the latest database migration to enable product access.' })
  }

  return res.json({
    user,
    accesses,
  })
}

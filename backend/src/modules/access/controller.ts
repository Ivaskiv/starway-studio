import type { AuthenticatedRequest } from '../../types/globalTypes.js'
import type { Response } from 'express'
import { isSuperAdminEmail, isSuperAdminRequest } from '../../modules/auth/superadmin.js'
import { findUserById, toSafeUser } from '../../modules/auth/auth.service.js'
import { trackEvent } from '../events/service.js'
import { resolveUserState } from '../telegram-mentor/handlers/start.js'
import { prisma } from '../../db/client.js'
import { getAccessControlState, getUserSystemState } from './service.js'

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
  const state = await resolveUserState(req.user.id).catch(() => null)
  const accessControl = await getAccessControlState(req.user.id)

  // Конвертуємо масив abilities в об'єкт
  const abilitiesMap: Record<string, boolean> = {}
  safeUser.abilities.forEach((ability) => {
    abilitiesMap[ability] = true
  })

  await trackEvent({
    userId: req.user.id,
    type: 'web_access_viewed',
    source: 'web',
    state,
    payload: {
      plan: safeUser.access.plan ?? null,
      role: safeUser.role,
    },
  })

  return res.json({
    abilities: abilitiesMap,
    plan: safeUser.access.plan,
    role: safeUser.role,
    trialEnd: safeUser.access.trialEnd,
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
      name: true,
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

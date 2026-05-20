import type { NextFunction, Response } from 'express'

import { prisma } from '../db/client.js'
import type { AiBehaviorProfile } from '../modules/ai-assistant/promptCompiler.js'
import type { AuthenticatedRequest } from '../types/globalTypes.js'

export interface SalesAssistantRequest extends AuthenticatedRequest {
  aiProfile?: AiBehaviorProfile | null
  aiWorkspaceId?: string | null
}

export async function requireSalesAssistantAccess(
  req: SalesAssistantRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.user?.id
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  const isAdmin =
    user?.role === 'SUPERADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'EXPERT'

  const ws = await prisma.userAiWorkspace.findUnique({
    where: { userId },
    include: { activeProfile: true },
  })

  if (ws) {
    if (!isAdmin && !ws.isActive) {
      res.status(403).json({ message: 'Активуй доступ у кабінеті STARWAY.' })
      return
    }
    if (!isAdmin && ws.usedTokensThisMonth >= ws.maxTokensPerMonth) {
      res.status(429).json({ message: 'Щомісячний ліміт вичерпано. Спробуй наступного місяця.' })
      return
    }
    req.aiProfile = ws.activeProfile
    req.aiWorkspaceId = ws.id
    next()
    return
  }

  if (isAdmin) {
    const profile = await prisma.aiBehaviorProfile.findFirst({
      where: { key: 'STARWAY_OGOLENA_PRAVDA' },
    })
    req.aiProfile = profile ?? null
    req.aiWorkspaceId = null
    next()
    return
  }

  res.status(403).json({
    message: 'AI Workspace не ініціалізовано. Зверніться до адміністратора.',
  })
}

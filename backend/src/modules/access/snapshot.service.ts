import { prisma } from '../../db/client.js'
import { PRODUCT_ACCESS_PRODUCTS, PRODUCT_ACCESS_ROLES, type AccessItem, type ProductAccessAssignment, type ProductAccessProduct, type ProductAccessRole } from './types.js'

export type AccessUserSnapshot = {
  id: string
  email: string | null
  role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'
  onboardingStage: string | null
  currentStep: string | null
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  absystemAiActive: boolean
  absystemTrialExpiresAt: Date | null
  absystemGrantSource: 'post_zoom' | 'timeout' | 'direct_purchase' | 'manual' | null
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

export function resolveOnboardingStage(
  onboardingStage: string | null | undefined,
  currentStep: string | null | undefined,
): string | null {
  const step = String(currentStep ?? '').trim()
  if (step === 'lead_magnet') return 'lead_magnet'
  const stage = String(onboardingStage ?? '').trim()
  return stage || null
}

const telegramOptionalSnapshotByUser = new Map<string, string>()

export function shouldLogTelegramOptionalSnapshot(userId: string, snapshot: Record<string, unknown>) {
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

export function isProductAccessTableMissing(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: string; message?: string; meta?: { table?: string } }
  if (candidate.code !== 'P2021' && candidate.code !== 'P2022') return false
  const message = String(candidate.message ?? '').toLowerCase()
  const table = String(candidate.meta?.table ?? '').toLowerCase()
  return table.includes('product_access') || message.includes('product_access')
}

export function isProductAccessProduct(value: string): value is ProductAccessProduct {
  return (PRODUCT_ACCESS_PRODUCTS as readonly string[]).includes(value)
}

export function isProductAccessRole(value: string): value is ProductAccessRole {
  return (PRODUCT_ACCESS_ROLES as readonly string[]).includes(value)
}

export function resolveEffectiveRole(input: {
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

export function shouldPromoteUserRole(currentRole: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN', targetRole: ProductAccessRole) {
  if (currentRole === 'SUPERADMIN') return false
  if (currentRole === 'ADMIN') return false
  if (targetRole === 'ADMIN') return true
  if (targetRole === 'EXPERT') return currentRole === 'USER'
  return false
}

export function toUserRole(targetRole: ProductAccessRole): 'EXPERT' | 'ADMIN' {
  return targetRole === 'ADMIN' ? 'ADMIN' : 'EXPERT'
}

export function buildProductAccessItems(assignments: ProductAccessAssignment[]): AccessItem[] {
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

export async function getAccessUserSnapshot(userId: string): Promise<AccessUserSnapshot | null> {
  const baseSelect = {
    id: true,
    email: true,
    role: true,
        currentStep: true,
    trialStartsAt: true,
    trialEndsAt: true,
    absystemAiActive: true,
    absystemTrialExpiresAt: true,
    absystemGrantSource: true,
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
    absystemAiActive: user.absystemAiActive ?? false,
    absystemTrialExpiresAt: user.absystemTrialExpiresAt ?? null,
    absystemGrantSource: user.absystemGrantSource ?? null,
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

export function deriveLeadStep(progress: unknown): number {
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

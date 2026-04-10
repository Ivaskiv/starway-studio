import { prisma } from '../../db/client.js'
import { Role } from '@starway/db/prisma-client'

type ViewerRole = 'SUPERADMIN' | 'ADMIN' | 'EXPERT' | 'USER' | 'MENTOR' | 'PRODUCT_OWNER'

function normalizeEmail(email: string | null | undefined): string | null {
  const value = String(email ?? '').trim().toLowerCase()
  return value || null
}

function buildDisplayName(input: {
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}) {
  const combined = [input.firstName, input.lastName].filter(Boolean).join(' ').trim()
  if (combined) return combined
  if (input.name?.trim()) return input.name.trim()
  if (input.email?.trim()) return input.email.trim()
  return 'Expert'
}

export async function ensureOwnerExpertIdForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      expertId: true,
    },
  })

  if (!user) return null
  if (user.expertId) return user.expertId
  if (user.role !== Role.EXPERT && user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
    return null
  }

  const normalizedEmail = normalizeEmail(user.email) ?? `expert-${user.id}@starway.app`
  const existing = await prisma.expert.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  })

  const expertId = existing?.id ?? (
    await prisma.expert.create({
      data: {
        email: normalizedEmail,
        displayName: buildDisplayName(user),
        timezone: 'UTC',
        isActive: true,
      },
      select: { id: true },
    })
  ).id

  await prisma.user.update({
    where: { id: user.id },
    data: { expertId },
  }).catch(() => null)

  return expertId
}

export async function assignUserToExpert(userId: string, expertId: string | null | undefined): Promise<void> {
  if (!expertId) return

  const existingExpert = await prisma.expert.findUnique({
    where: { id: expertId },
    select: { id: true },
  })

  if (!existingExpert?.id) return

  await prisma.user.update({
    where: { id: userId },
    data: { expertId },
  }).catch(() => null)
}

export async function resolveDefaultMentorOwnerExpertId(): Promise<string | null> {
  const owners = await prisma.productAccess.findMany({
    where: {
      product: 'AI_MENTOR',
      role: { in: ['EXPERT', 'ADMIN'] },
    },
    select: { userId: true },
  }).catch(() => [])

  const uniqueUserIds = [...new Set(owners.map((row) => row.userId).filter(Boolean))]
  if (uniqueUserIds.length !== 1) return null

  return ensureOwnerExpertIdForUser(uniqueUserIds[0])
}

export async function reassignLifecycleUsersToExpert(input: {
  sourceUserId: string
  targetExpertId: string
  excludeUserId?: string | null
}) {
  const sourceExpertId = await ensureOwnerExpertIdForUser(input.sourceUserId)

  const candidates = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: Role.USER,
      ...(input.excludeUserId ? { id: { not: input.excludeUserId } } : {}),
      AND: [
        {
          OR: [
            { onboardingStage: 'lead_magnet' },
            { funnelLeads: { some: {} } },
            { trialStartsAt: { not: null } },
            { subscriptions: { some: {} } },
            { userMentors: { some: {} } },
            { dailyEntries: { some: {} } },
            { wheelAssessments: { some: {} } },
            { streaks: { some: {} } },
          ],
        },
        sourceExpertId
          ? {
              OR: [
                { expertId: null },
                { expertId: sourceExpertId },
              ],
            }
          : { expertId: null },
      ],
    },
    select: { id: true },
  })

  const candidateIds = candidates.map((row) => row.id)
  if (!candidateIds.length) {
    return {
      reassignedUsers: 0,
      updatedSubscriptions: 0,
      updatedPaymentLogs: 0,
      updatedPurchaseHistory: 0,
      sourceExpertId,
    }
  }

  const subscriptionWhere = {
    userId: { in: candidateIds },
    ...(sourceExpertId
      ? {
          OR: [
            { expertId: null },
            { expertId: sourceExpertId },
          ],
        }
      : { expertId: null }),
  }

  const paymentLogWhere = sourceExpertId
    ? {
        userId: { in: candidateIds },
        expertId: sourceExpertId,
      }
    : {
        userId: { in: [] as string[] },
      }

  const purchaseHistoryWhere = {
    userId: { in: candidateIds },
    ...(sourceExpertId
      ? {
          OR: [
            { expertId: null },
            { expertId: sourceExpertId },
          ],
        }
      : { expertId: null }),
  }

  const [usersResult, subscriptionsResult, paymentLogsResult, purchaseHistoryResult] = await prisma.$transaction([
    prisma.user.updateMany({
      where: { id: { in: candidateIds } },
      data: { expertId: input.targetExpertId },
    }),
    prisma.subscription.updateMany({
      where: subscriptionWhere,
      data: { expertId: input.targetExpertId },
    }),
    prisma.paymentLog.updateMany({
      where: paymentLogWhere,
      data: { expertId: input.targetExpertId },
    }),
    prisma.purchaseHistory.updateMany({
      where: purchaseHistoryWhere,
      data: { expertId: input.targetExpertId },
    }),
  ])

  return {
    reassignedUsers: usersResult.count,
    updatedSubscriptions: subscriptionsResult.count,
    updatedPaymentLogs: paymentLogsResult.count,
    updatedPurchaseHistory: purchaseHistoryResult.count,
    sourceExpertId,
  }
}

export async function resolveViewerScopedExpertId(input: {
  userId: string
  role: ViewerRole
  expertId?: string | null
}) {
  if (input.role === 'SUPERADMIN') return null
  if (input.expertId) return input.expertId
  if (input.role === 'EXPERT' || input.role === 'ADMIN') {
    return ensureOwnerExpertIdForUser(input.userId)
  }
  return null
}

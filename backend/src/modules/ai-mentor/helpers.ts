import { prisma } from '../../db/client.js'
import type { UserAIMentor } from '@starway/db/prisma-client'

const SYSTEM_EXPERT_EMAIL = process.env.SYSTEM_EXPERT_EMAIL ?? 'system@starway.ai'

async function findFallbackExpertId(): Promise<string | null> {
  let expert = await prisma.expert.findFirst({
    where: { deletedAt: null, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (expert?.id) return expert.id

  expert = await prisma.expert.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (expert?.id) return expert.id

  const existingSystem = await prisma.expert.findUnique({
    where: { email: SYSTEM_EXPERT_EMAIL },
    select: { id: true },
  })
  if (existingSystem?.id) return existingSystem.id

  const created = await prisma.expert.create({
    data: {
      email: SYSTEM_EXPERT_EMAIL,
      displayName: 'Starway System',
    },
    select: { id: true },
  })

  return created.id
}

export async function ensureUserExpertId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { expertId: true } })
  let expertId = user?.expertId ?? null

  if (!expertId) {
    expertId = await findFallbackExpertId()
    if (expertId) {
      await prisma.user.update({
        where: { id: userId },
        data: { expertId },
      }).catch((error) => {
        console.error('[AIMentor] Failed to persist fallback expertId', { userId, expertId, error })
      })
    }
  }

  if (!expertId) throw new Error('User missing expertId')
  return expertId
}

export async function ensureMentor(userId: string): Promise<UserAIMentor> {
  const existing = await prisma.userAIMentor.findFirst({ where: { userId } })
  if (existing) return existing

  const expertId = await ensureUserExpertId(userId)

  let mentor = await prisma.aIMentor.findFirst({
    where: { expertId },
    orderBy: { createdAt: 'desc' },
  })
  if (!mentor) {
    mentor = await prisma.aIMentor.create({
      data: {
        expertId,
        slug: `mentor-${userId}`,
        name: 'ABsystem',
        generatorConfig: {},
        runtimeConfig: {},
      },
    })
  }

  return prisma.userAIMentor.create({
    data: {
      userId,
      aiMentorId: mentor.id,
      currentStep: 'ENTRY',
      context: {},
      state: {},
      meta: {},
    },
  })
}

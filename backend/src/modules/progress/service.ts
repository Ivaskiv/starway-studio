// backend/src/modules/progress/service.ts

import { prisma }                           from '../../db/client.js'
import { StageStatus }                      from '@prisma/client'
import type { StageType as PrismaStageType } from '@prisma/client'
import type { ProgressUpdate, UserProgress } from './types.js'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type UserStageType = PrismaStageType

interface StageInput {
  userId:     string
  stageId:    string
  stageIndex?: number
  stageType:  UserStageType
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function notFound(): never {
  const err = new Error('user_not_found')
  ;(err as any).code = 'P2025'
  throw err
}

function toProgressDTO(p: {
  userId: string; totalPoints: number
  completedBlocks: number; level: number; updatedAt: Date
}): UserProgress {
  return {
    userId:          p.userId,
    totalPoints:     p.totalPoints,
    completedBlocks: p.completedBlocks,
    level:           p.level,
    updatedAt:       p.updatedAt,
  }
}

async function assertUserExists(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!u) notFound()
}

// ─────────────────────────────────────────────
// USER PROGRESS (points / level)
// ─────────────────────────────────────────────

export async function getProgress(userId: string): Promise<UserProgress> {
  await assertUserExists(userId)

  const progress = await prisma.userProgress.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  })

  return toProgressDTO(progress)
}

export async function updateProgress(
  userId: string,
  data:   ProgressUpdate,
): Promise<UserProgress> {
  await assertUserExists(userId)

  const progress = await prisma.userProgress.upsert({
    where:  { userId },
    create: { userId, ...data },
    update: data,
  })

  return toProgressDTO(progress)
}

export async function incrementPoints(userId: string, points: number): Promise<UserProgress> {
  const current  = await getProgress(userId)
  const newPoints = current.totalPoints + points
  const newLevel  = Math.floor(newPoints / 1000) + 1

  return updateProgress(userId, { totalPoints: newPoints, level: newLevel })
}

// ─────────────────────────────────────────────
// STAGE PROGRESS (funnel / video / mini-course)
// ─────────────────────────────────────────────

export async function updateUserStage({ userId, stageId, stageIndex = 0, stageType }: StageInput) {
  const now    = new Date()
  const base   = { status: StageStatus.IN_PROGRESS, stageIndex, updatedAt: now }

  switch (stageType) {
    case 'FUNNEL':
      return prisma.userFunnelStageProgress.upsert({
        where:  { userId_funnelStageId: { userId, funnelStageId: stageId } },
        create: { userId, funnelStageId: stageId,     ...base, startedAt: now },
        update: base,
      })
    case 'VIDEO':
      return prisma.userVideoStageProgress.upsert({
        where:  { userId_videoStageId: { userId, videoStageId: stageId } },
        create: { userId, videoStageId: stageId,      ...base, startedAt: now },
        update: base,
      })
    case 'MINI_COURSE':
      return prisma.userMiniCourseStageProgress.upsert({
        where:  { userId_miniCourseStageId: { userId, miniCourseStageId: stageId } },
        create: { userId, miniCourseStageId: stageId, ...base, startedAt: now },
        update: base,
      })
  }
}

export async function getUserStage(userId: string, stageType: UserStageType) {
  const orderBy = { updatedAt: 'desc' as const }

  switch (stageType) {
    case 'FUNNEL':
      return prisma.userFunnelStageProgress.findFirst({ where: { userId }, orderBy })
    case 'VIDEO':
      return prisma.userVideoStageProgress.findFirst({ where: { userId }, orderBy })
    case 'MINI_COURSE':
      return prisma.userMiniCourseStageProgress.findFirst({ where: { userId }, orderBy })
  }
}

export async function markStageComplete({ userId, stageId, stageIndex = 0, stageType }: StageInput) {
  const now    = new Date()
  const base   = { status: StageStatus.COMPLETED, completedAt: now, updatedAt: now }
  const create = { stageIndex, startedAt: now, ...base }

  switch (stageType) {
    case 'FUNNEL':
      return prisma.userFunnelStageProgress.upsert({
        where:  { userId_funnelStageId: { userId, funnelStageId: stageId } },
        create: { userId, funnelStageId: stageId,     ...create },
        update: base,
      })
    case 'VIDEO':
      return prisma.userVideoStageProgress.upsert({
        where:  { userId_videoStageId: { userId, videoStageId: stageId } },
        create: { userId, videoStageId: stageId,      ...create },
        update: base,
      })
    case 'MINI_COURSE':
      return prisma.userMiniCourseStageProgress.upsert({
        where:  { userId_miniCourseStageId: { userId, miniCourseStageId: stageId } },
        create: { userId, miniCourseStageId: stageId, ...create },
        update: base,
      })
  }
}
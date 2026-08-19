import { StageStatus,User } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { resolveOrCreateUser } from '../../user/resolveOrCreateUser.js'
import { UserAutoCreationDisabledError,UserCreationSource } from '../../user/userCreation.service.js'

// fix etap2: payload for first-login handling via web/telegram flows
export interface FirstLoginPayload {
  email: string
  expertId?: string
  telegramUserId?: string
  telegramChatId?: string
  telegramUserName?: string
  initialFunnelSlug?: string
  initialVideoSlug?: string
  initialMiniCourseSlug?: string
  requestId?: string
}

// fix etap2: seed every stage progress for the user to give AI/mini-app deterministic state
export async function handleFirstLogin(payload: FirstLoginPayload): Promise<User> {
  const now = new Date()
  const resolved = await resolveOrCreateUser(
    {
      email: payload.email,
      telegramId: payload.telegramUserId ?? undefined,
      chatId: payload.telegramChatId ?? undefined,
      telegramUserName: payload.telegramUserName ?? undefined,
    },
    {
      source: UserCreationSource.FIRST_LOGIN,
      requestId: payload.requestId ?? null,
      expertId: payload.expertId ?? null,
      role: 'USER',
      createData: {
        lastLoginAt: now,
      },
    },
  ).catch((error) => {
    if (error instanceof UserAutoCreationDisabledError) {
      throw new Error('AUTO_USER_CREATION_DISABLED')
    }
    throw error
  })

  const user = await prisma.user.update({
    where: { id: resolved.user.id },
    data: {
      lastLoginAt: now,
    },
  })

  await prisma.userProgress.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      totalPoints: 0,
      completedBlocks: 0,
      level: 1,
    },
    update: {
      updatedAt: now,
    },
  })

  await ensureFunnelStageProgress(user.id, payload.initialFunnelSlug, now)
  await ensureVideoStageProgress(user.id, payload.initialVideoSlug, now)
  await ensureMiniCourseStageProgress(user.id, payload.initialMiniCourseSlug, now)

  await prisma.streak.upsert({
    where: { userId_ruleKey: { userId: user.id, ruleKey: 'daily_checkin' } },
    create: {
      userId: user.id,
      expertId: user.expertId ?? '',
      startAt: now,
      lastAt: now,
      current: 1,
      longest: 1,
      totalDays: 1,
      ruleKey: 'daily_checkin',
      ruleVer: 1,
    },
    update: {
      lastAt: now,
      current: { increment: 1 },
      totalDays: { increment: 1 },
      updatedAt: now,
    },
  })

  return user
}

// helpers
async function ensureFunnelStageProgress(userId: string, slug: string | undefined, now: Date) {
  if (!slug) return
  const stage = await prisma.funnelStage.findFirst({
    where: { funnel: { slug } },
    orderBy: { id: 'asc' },
  })
  if (!stage) return
  await prisma.userFunnelStageProgress.upsert({
    where: { userId_funnelStageId: { userId, funnelStageId: stage.id } },
    create: {
      userId,
      funnelStageId: stage.id,
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
    update: {
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
  })
}

async function ensureVideoStageProgress(userId: string, slug: string | undefined, now: Date) {
  if (!slug) return
  const stage = await prisma.videoStage.findFirst({
    where: { videoModule: { slug } },
    orderBy: { order: 'asc' },
  })
  if (!stage) return
  await prisma.userVideoStageProgress.upsert({
    where: { userId_videoStageId: { userId, videoStageId: stage.id } },
    create: {
      userId,
      videoStageId: stage.id,
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
    update: {
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
  })
}

async function ensureMiniCourseStageProgress(userId: string, slug: string | undefined, now: Date) {
  if (!slug) return
  const stage = await prisma.miniCourseStage.findFirst({
    where: { miniCourse: { slug } },
    orderBy: { order: 'asc' },
  })
  if (!stage) return
  await prisma.userMiniCourseStageProgress.upsert({
    where: { userId_miniCourseStageId: { userId, miniCourseStageId: stage.id } },
    create: {
      userId,
      miniCourseStageId: stage.id,
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
    update: {
      status: StageStatus.IN_PROGRESS,
      startedAt: now,
    },
  })
}

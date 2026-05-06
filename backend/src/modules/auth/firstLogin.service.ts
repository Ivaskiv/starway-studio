import { prisma } from '../../db/client.js'
import { Prisma, StageStatus, User } from '@starway/db/prisma-client'

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
}

function isMissingStructureError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')
  )
}

async function createUserCompat(payload: FirstLoginPayload, now: Date) {
  try {
    return await prisma.user.create({
      data: {
        email: payload.email,
        expertId: payload.expertId,
        role: 'USER',
        lastLoginAt: now,
        telegramUserId: payload.telegramUserId ?? null,
        telegramChatId: payload.telegramChatId ?? null,
        telegramUserName: payload.telegramUserName ?? null,
      },
    })
  } catch (error) {
    if (!isMissingStructureError(error)) throw error

    const id = crypto.randomUUID()
    const rows = await prisma.$queryRawUnsafe<User[]>(
      `
        INSERT INTO "User" (
          "id",
          "email",
          "expertId",
          "role",
          "lastLoginAt",
          "telegramUserId",
          "telegramChatId",
          "telegramUserName",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, CAST($4 AS "Role"), $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `,
      id,
      payload.email,
      payload.expertId ?? null,
      'USER',
      now,
      payload.telegramUserId ?? null,
      payload.telegramChatId ?? null,
      payload.telegramUserName ?? null,
    )

    const created = rows[0]
    if (!created) throw error
    return created
  }
}

// fix etap2: seed every stage progress for the user to give AI/mini-app deterministic state
export async function handleFirstLogin(payload: FirstLoginPayload): Promise<User> {
  const now = new Date()
  const existing = await prisma.user.findUnique({
    where: { email: payload.email },
    select: {
      id: true,
      telegramUserId: true,
      telegramChatId: true,
      telegramUserName: true,
      expertId: true,
    },
  })

  const telegramData =
    payload.telegramUserId || payload.telegramChatId || payload.telegramUserName
      ? {
          telegramUserId: payload.telegramUserId ?? existing?.telegramUserId ?? null,
          telegramChatId: payload.telegramChatId ?? existing?.telegramChatId ?? null,
          telegramUserName: payload.telegramUserName ?? existing?.telegramUserName ?? null,
        }
      : undefined

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          lastLoginAt: now,
          telegramUserId: telegramData?.telegramUserId ?? undefined,
          telegramChatId: telegramData?.telegramChatId ?? undefined,
          telegramUserName: telegramData?.telegramUserName ?? undefined,
        },
      })
    : await createUserCompat({
        ...payload,
        telegramUserId: telegramData?.telegramUserId,
        telegramChatId: telegramData?.telegramChatId,
        telegramUserName: telegramData?.telegramUserName,
      }, now)

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

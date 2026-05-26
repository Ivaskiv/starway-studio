import { Prisma, Role, UserState, UserStep } from '@starway/db/prisma-client'
import { prisma } from '../../db/client.js'

type Tx = Prisma.TransactionClient

type MergeReason = 'email_attach' | 'telegram_identity'

type MergeCandidate = {
  id: string
  email: string
  role: Role
  firstName: string | null
  lastName: string | null
  passwordHash: string | null
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  telegramLinkedAt: Date | null
  currentState: UserState
  currentStep: UserStep
  onboardingStartedAt: Date | null
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  settings: Prisma.JsonValue | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

function isGuestEmail(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false
  return email.startsWith('telegram-guest-') || /^telegram-\d+@starway\.local$/i.test(email)
}

function isRecordObject(value: Prisma.JsonValue | null | undefined): value is Prisma.JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function mergeJsonValues(
  source: Prisma.JsonValue | null | undefined,
  target: Prisma.JsonValue | null | undefined,
): Prisma.JsonValue | undefined {
  if (isRecordObject(source) && isRecordObject(target)) {
    return { ...source, ...target } as Prisma.JsonValue
  }

  if (target != null) return target
  if (source != null) return source
  return undefined
}

function toJsonInput(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (typeof value === 'undefined') return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

function toNullableJsonInput(
  value: Prisma.JsonValue | null | undefined,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (typeof value === 'undefined') return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

function chooseRole(targetRole: Role, sourceRole: Role): Role {
  const order: Role[] = [
    Role.USER,
    Role.MENTOR,
    Role.EXPERT,
    Role.PRODUCT_OWNER,
    Role.ADMIN,
    Role.SUPERADMIN,
  ]

  return order.indexOf(sourceRole) > order.indexOf(targetRole) ? sourceRole : targetRole
}

function maxDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

function minDate(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null
  if (!b) return a
  return a < b ? a : b
}

function buildArchivedEmail(userId: string): string {
  return `merged+${userId}@starway.local`
}

async function getMergeCandidate(tx: Tx, userId: string): Promise<MergeCandidate> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
            firstName: true,
      lastName: true,
      passwordHash: true,
      telegramUserId: true,
      telegramUserName: true,
      telegramChatId: true,
      telegramLinkedAt: true,
      currentState: true,
      currentStep: true,
            onboardingStartedAt: true,
      trialStartsAt: true,
      trialEndsAt: true,
            settings: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!user) {
    throw new Error('USER_NOT_FOUND')
  }

  return user
}

async function findUserByEmailTx(tx: Tx, email: string): Promise<{ id: string; email: string | null } | null> {
  return tx.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  })
}

async function mergeDailyEntries(tx: Tx, sourceUserId: string, targetUserId: string) {
  const entries = await tx.dailyEntry.findMany({ where: { userId: sourceUserId } })

  for (const entry of entries) {
    const existing = await tx.dailyEntry.findUnique({
      where: { userId_date: { userId: targetUserId, date: entry.date } },
      select: { id: true, content: true, updatedAt: true },
    })

    if (!existing) {
      await tx.dailyEntry.update({
        where: { id: entry.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.dailyEntry.update({
      where: { id: existing.id },
      data: {
        content: toJsonInput(mergeJsonValues(entry.content, existing.content)),
      },
    })

    await tx.dailyEntry.delete({ where: { id: entry.id } })
  }
}

async function mergeDailyCycleLogs(tx: Tx, sourceUserId: string, targetUserId: string) {
  const logs = await tx.dailyCycleLog.findMany({ where: { userId: sourceUserId } })

  for (const log of logs) {
    const existing = await tx.dailyCycleLog.findUnique({
      where: { userId_date: { userId: targetUserId, date: log.date } },
      select: { id: true, aiSummary: true, dayFact: true },
    })

    if (!existing) {
      await tx.dailyCycleLog.update({
        where: { id: log.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.dailyCycleLog.update({
      where: { id: existing.id },
      data: {
        aiSummary: existing.aiSummary ?? log.aiSummary,
        dayFact: existing.dayFact ?? log.dayFact,
      },
    })

    await tx.dailyCycleLog.delete({ where: { id: log.id } })
  }
}

async function mergeTrialMirrors(tx: Tx, sourceUserId: string, targetUserId: string) {
  const items = await tx.trialMirror.findMany({ where: { userId: sourceUserId } })

  for (const item of items) {
    const existing = await tx.trialMirror.findUnique({
      where: { userId_day: { userId: targetUserId, day: item.day } },
      select: { id: true, updatedAt: true },
    })

    if (!existing) {
      await tx.trialMirror.update({
        where: { id: item.id },
        data: { userId: targetUserId },
      })
      continue
    }

    if (item.updatedAt > existing.updatedAt) {
      await tx.trialMirror.update({
        where: { id: existing.id },
        data: {
          analysis: item.analysis,
          entries: item.entries,
        },
      })
    }

    await tx.trialMirror.delete({ where: { id: item.id } })
  }
}

async function mergeStreaks(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.streak.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.streak.findUnique({
      where: { userId_ruleKey: { userId: targetUserId, ruleKey: row.ruleKey } },
      select: { id: true, current: true, longest: true, totalDays: true, lastAt: true, startAt: true },
    })

    if (!existing) {
      await tx.streak.update({
        where: { id: row.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.streak.update({
      where: { id: existing.id },
      data: {
        current: Math.max(existing.current, row.current),
        longest: Math.max(existing.longest, row.longest),
        totalDays: Math.max(existing.totalDays, row.totalDays),
        lastAt: maxDate(existing.lastAt, row.lastAt) ?? existing.lastAt,
        startAt: minDate(existing.startAt, row.startAt) ?? existing.startAt,
      },
    })

    await tx.streak.delete({ where: { id: row.id } })
  }
}

async function mergeVisionStatements(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.visionStatement.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function mergeWheelAssessments(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.wheelAssessment.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function mergeUserBalanceEntries(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.userBalanceEntry.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function mergeGoalsSets(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.goalsSet.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function mergeSimpleByUserId(
  tx: Tx,
  model:
    | 'refreshToken'
    | 'subscription'
    | 'paymentLog'
    | 'purchaseHistory'
    | 'aiRecommendation'
    | 'ctaInteraction'
    | 'reminder'
    | 'microTask'
    | 'microSupportItem'
    | 'notification'
    | 'report'
    | 'zoomSessionAttendee'
    | 'telegramLink'
    | 'deepLinkToken'
    | 'assistantSession'
    | 'assistantMemory'
    | 'generationLog'
    | 'affiliateLink'
    | 'aiConversation'
    | 'contentItem'
    | 'funnelLead'
    | 'event',
  sourceUserId: string,
  targetUserId: string,
) {
  const delegate = tx[model] as unknown as {
    updateMany: (args: { where: { userId: string }; data: { userId: string } }) => Promise<unknown>
  }

  await delegate.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

async function mergeUserProgress(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.userProgress.findUnique({ where: { userId: sourceUserId } }),
    tx.userProgress.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.userProgress.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.userProgress.update({
    where: { userId: targetUserId },
    data: {
      totalPoints: target.totalPoints + source.totalPoints,
      completedBlocks: target.completedBlocks + source.completedBlocks,
      level: Math.max(target.level, source.level),
    },
  })

  await tx.userProgress.delete({ where: { userId: sourceUserId } })
}

async function mergeCycleStreakMetric(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.cycleStreakMetric.findUnique({ where: { userId: sourceUserId } }),
    tx.cycleStreakMetric.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.cycleStreakMetric.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.cycleStreakMetric.update({
    where: { userId: targetUserId },
    data: {
      daysStable: Math.max(target.daysStable, source.daysStable),
      drainsCount: target.drainsCount + source.drainsCount,
      recoveryAfterDrain: Math.max(target.recoveryAfterDrain, source.recoveryAfterDrain),
    },
  })

  await tx.cycleStreakMetric.delete({ where: { userId: sourceUserId } })
}

async function mergeGamificationProfile(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.gamificationProfile.findUnique({ where: { userId: sourceUserId } }),
    tx.gamificationProfile.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.gamificationProfile.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.gamificationProfile.update({
    where: { userId: targetUserId },
    data: {
      bitMind: target.bitMind + source.bitMind,
      mindXP: target.mindXP + source.mindXP,
      neuroGems: target.neuroGems + source.neuroGems,
      level: Math.max(target.level, source.level),
    },
  })

  await tx.gamificationProfile.delete({ where: { userId: sourceUserId } })
}

async function mergeGenerationQuota(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.generationQuota.findUnique({ where: { userId: sourceUserId } }),
    tx.generationQuota.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.generationQuota.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.generationQuota.update({
    where: { userId: targetUserId },
    data: {
      periodStart: minDate(target.periodStart, source.periodStart) ?? target.periodStart,
      used: target.used + source.used,
      baseLimit: Math.max(target.baseLimit, source.baseLimit),
      purchased: target.purchased + source.purchased,
      totalTokensInput: target.totalTokensInput + source.totalTokensInput,
      totalTokensOutput: target.totalTokensOutput + source.totalTokensOutput,
      totalCostUsd: target.totalCostUsd + source.totalCostUsd,
    },
  })

  await tx.generationQuota.delete({ where: { userId: sourceUserId } })
}

async function mergeUserMentorConfig(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.userMentorConfig.findUnique({ where: { userId: sourceUserId } }),
    tx.userMentorConfig.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.userMentorConfig.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.userMentorConfig.update({
      where: { userId: targetUserId },
      data: {
      config: toJsonInput(mergeJsonValues(source.config, target.config) ?? target.config),
      },
    })

  await tx.userMentorConfig.delete({ where: { userId: sourceUserId } })
}

async function mergeMentorConfig(tx: Tx, sourceUserId: string, targetUserId: string) {
  const [source, target] = await Promise.all([
    tx.mentorConfig.findUnique({ where: { userId: sourceUserId } }),
    tx.mentorConfig.findUnique({ where: { userId: targetUserId } }),
  ])

  if (!source) return
  if (!target) {
    await tx.mentorConfig.update({
      where: { userId: sourceUserId },
      data: { userId: targetUserId },
    })
    return
  }

  await tx.mentorConfig.update({
      where: { userId: targetUserId },
      data: {
      config: toJsonInput(mergeJsonValues(source.config, target.config) ?? target.config),
      },
    })

  await tx.mentorConfig.delete({ where: { userId: sourceUserId } })
}

async function mergeEnrollmentLike(
  tx: Tx,
  model: 'enrollment' | 'productSubscription' | 'courseEnrollment',
  sourceUserId: string,
  targetUserId: string,
) {
  if (model === 'enrollment') {
    const rows = await tx.enrollment.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.enrollment.findUnique({
        where: { userId_productId: { userId: targetUserId, productId: row.productId } },
      })
      if (!existing) {
        await tx.enrollment.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.enrollment.update({
        where: { id: existing.id },
        data: {
          enrolledAt: minDate(existing.enrolledAt, row.enrolledAt) ?? existing.enrolledAt,
          purchased: existing.purchased || row.purchased,
          trialEnd: maxDate(existing.trialEnd, row.trialEnd),
          expiresAt: maxDate(existing.expiresAt, row.expiresAt),
          payRef: existing.payRef ?? row.payRef,
        },
      })
      await tx.enrollment.delete({ where: { id: row.id } })
    }
    return
  }

  if (model === 'productSubscription') {
    const rows = await tx.productSubscription.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.productSubscription.findUnique({
        where: { userId_productId: { userId: targetUserId, productId: row.productId } },
      })
      if (!existing) {
        await tx.productSubscription.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.productSubscription.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'active' ? existing.status : row.status,
          trialEndsAt: maxDate(existing.trialEndsAt, row.trialEndsAt),
          expiresAt: maxDate(existing.expiresAt, row.expiresAt),
          paidAt: maxDate(existing.paidAt, row.paidAt),
          amount: existing.amount ?? row.amount,
        },
      })
      await tx.productSubscription.delete({ where: { id: row.id } })
    }
    return
  }

  const rows = await tx.courseEnrollment.findMany({ where: { userId: sourceUserId } })
  for (const row of rows) {
    const existing = await tx.courseEnrollment.findUnique({
      where: { userId_courseId: { userId: targetUserId, courseId: row.courseId } },
    })
    if (!existing) {
      await tx.courseEnrollment.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.courseEnrollment.update({
      where: { id: existing.id },
      data: {
        completedAt: existing.completedAt ?? row.completedAt,
        createdAt: minDate(existing.createdAt, row.createdAt) ?? existing.createdAt,
      },
    })
    await tx.courseEnrollment.delete({ where: { id: row.id } })
  }
}

async function mergeFivePointsEnrollment(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.fivePointsEnrollment.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.fivePointsEnrollment.findFirst({
      where: { userId: targetUserId, moduleId: row.moduleId },
      orderBy: { updatedAt: 'desc' },
    })

    if (!existing) {
      await tx.fivePointsEnrollment.update({
        where: { id: row.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.fivePointsEnrollment.update({
      where: { id: existing.id },
      data: {
        progress: toJsonInput(mergeJsonValues(row.progress, existing.progress) ?? existing.progress),
        completedAt: existing.completedAt ?? row.completedAt,
        enrolledAt: minDate(existing.enrolledAt, row.enrolledAt) ?? existing.enrolledAt,
      },
    })

    await tx.fivePointsEnrollment.delete({ where: { id: row.id } })
  }
}

async function mergeStageProgress(
  tx: Tx,
  model: 'userFunnelStageProgress' | 'userVideoStageProgress' | 'userMiniCourseStageProgress',
  sourceUserId: string,
  targetUserId: string,
) {
  if (model === 'userFunnelStageProgress') {
    const rows = await tx.userFunnelStageProgress.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.userFunnelStageProgress.findUnique({
        where: { userId_funnelStageId: { userId: targetUserId, funnelStageId: row.funnelStageId } },
      })
      if (!existing) {
        await tx.userFunnelStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.userFunnelStageProgress.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'COMPLETED' ? existing.status : row.status,
          completedAt: existing.completedAt ?? row.completedAt,
          stageIndex: Math.max(existing.stageIndex, row.stageIndex),
        },
      })
      await tx.userFunnelStageProgress.delete({ where: { id: row.id } })
    }
    return
  }

  if (model === 'userVideoStageProgress') {
    const rows = await tx.userVideoStageProgress.findMany({ where: { userId: sourceUserId } })
    for (const row of rows) {
      const existing = await tx.userVideoStageProgress.findUnique({
        where: { userId_videoStageId: { userId: targetUserId, videoStageId: row.videoStageId } },
      })
      if (!existing) {
        await tx.userVideoStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
        continue
      }
      await tx.userVideoStageProgress.update({
        where: { id: existing.id },
        data: {
          status: existing.status === 'COMPLETED' ? existing.status : row.status,
          completedAt: existing.completedAt ?? row.completedAt,
          stageIndex: Math.max(existing.stageIndex, row.stageIndex),
        },
      })
      await tx.userVideoStageProgress.delete({ where: { id: row.id } })
    }
    return
  }

  const rows = await tx.userMiniCourseStageProgress.findMany({ where: { userId: sourceUserId } })
  for (const row of rows) {
    const existing = await tx.userMiniCourseStageProgress.findUnique({
      where: { userId_miniCourseStageId: { userId: targetUserId, miniCourseStageId: row.miniCourseStageId } },
    })
    if (!existing) {
      await tx.userMiniCourseStageProgress.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.userMiniCourseStageProgress.update({
      where: { id: existing.id },
      data: {
        status: existing.status === 'COMPLETED' ? existing.status : row.status,
        completedAt: existing.completedAt ?? row.completedAt,
        stageIndex: Math.max(existing.stageIndex, row.stageIndex),
      },
    })
    await tx.userMiniCourseStageProgress.delete({ where: { id: row.id } })
  }
}

async function mergeWeeklyReports(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.weeklyReport.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.weeklyReport.findUnique({
      where: { userId_weekStart: { userId: targetUserId, weekStart: row.weekStart } },
    })
    if (!existing) {
      await tx.weeklyReport.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.weeklyReport.update({
      where: { id: existing.id },
      data: {
        summaryText: existing.summaryText ?? row.summaryText,
        motivationText: existing.motivationText ?? row.motivationText,
        nextWeekFocus: existing.nextWeekFocus ?? row.nextWeekFocus,
        pdfUrl: existing.pdfUrl ?? row.pdfUrl,
        pdfSentAt: existing.pdfSentAt ?? row.pdfSentAt,
      },
    })
    await tx.weeklyReport.delete({ where: { id: row.id } })
  }
}

async function mergeMentorWeeklyProfiles(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.mentorWeeklyProfile.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.mentorWeeklyProfile.findUnique({
      where: { userId_weekStart: { userId: targetUserId, weekStart: row.weekStart } },
    })
    if (!existing) {
      await tx.mentorWeeklyProfile.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }
    await tx.mentorWeeklyProfile.update({
      where: { id: existing.id },
      data: {
        behaviorPattern: existing.behaviorPattern || row.behaviorPattern,
        engagementRhythm: existing.engagementRhythm || row.engagementRhythm,
        mainPainThisWeek: existing.mainPainThisWeek || row.mainPainThisWeek,
        emotionalTone: existing.emotionalTone || row.emotionalTone,
        retentionRisk: Math.max(existing.retentionRisk, row.retentionRisk),
        upsellReady: existing.upsellReady || row.upsellReady,
        recommendedOffer: existing.recommendedOffer || row.recommendedOffer,
        systemNotes: existing.systemNotes || row.systemNotes,
      },
    })
    await tx.mentorWeeklyProfile.delete({ where: { id: row.id } })
  }
}

async function mergeAimemory(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.aiMemory.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.aiMemory.findUnique({
      where: { userId_key: { userId: targetUserId, key: row.key } },
    })

    if (!existing) {
      await tx.aiMemory.update({ where: { id: row.id }, data: { userId: targetUserId } })
      continue
    }

    if (row.updatedAt > existing.updatedAt) {
      await tx.aiMemory.update({
        where: { id: existing.id },
        data: {
          value: row.value,
          source: row.source ?? existing.source,
          expiresAt: row.expiresAt ?? existing.expiresAt,
        },
      })
    }

    await tx.aiMemory.delete({ where: { id: row.id } })
  }
}

async function mergeUserAiMentors(
  tx: Tx,
  sourceUserId: string,
  targetUserId: string,
): Promise<{ idMap: Map<string, string>; duplicateSourceIdsToDelete: string[] }> {
  const idMap = new Map<string, string>()
  // FIX 2026-05-25 USER_DEDUP2: defer duplicate mentor deletion until mentor sessions are remapped.
  const duplicateSourceIdsToDelete: string[] = []
  const rows = await tx.userAiMentor.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.userAiMentor.findUnique({
      where: { userId_aiMentorId: { userId: targetUserId, aiMentorId: row.aiMentorId } },
    })

    if (!existing) {
      await tx.userAiMentor.update({
        where: { id: row.id },
        data: { userId: targetUserId },
      })
      idMap.set(row.id, row.id)
      continue
    }

    await tx.userAiMentor.update({
      where: { id: existing.id },
      data: {
        state: toNullableJsonInput(mergeJsonValues(row.state, existing.state)),
        meta: toNullableJsonInput(mergeJsonValues(row.meta, existing.meta)),
        context: toJsonInput(mergeJsonValues(row.context, existing.context) ?? existing.context),
        currentStep: existing.currentStep || row.currentStep,
        currentState: existing.currentState ?? row.currentState,
        behaviorPattern: existing.behaviorPattern ?? row.behaviorPattern,
        clarityLevel: existing.clarityLevel ?? row.clarityLevel,
        stage: existing.stage ?? row.stage,
        insight: existing.insight ?? row.insight,
        blocker: existing.blocker ?? row.blocker,
        realGoal: existing.realGoal ?? row.realGoal,
        recommendedFocus: existing.recommendedFocus ?? row.recommendedFocus,
        lastAnalyzedAt: maxDate(existing.lastAnalyzedAt, row.lastAnalyzedAt),
        lastInteractionAt: maxDate(existing.lastInteractionAt, row.lastInteractionAt) ?? existing.lastInteractionAt,
      },
    })

    idMap.set(row.id, existing.id)
    duplicateSourceIdsToDelete.push(row.id)
  }

  return { idMap, duplicateSourceIdsToDelete }
}

async function mergeUserMentorStates(tx: Tx, sourceUserId: string, targetUserId: string) {
  const rows = await tx.userMentorState.findMany({ where: { userId: sourceUserId } })

  for (const row of rows) {
    const existing = await tx.userMentorState.findUnique({
      where: {
        userId_aiMentorId: {
          userId: targetUserId,
          aiMentorId: row.aiMentorId,
        },
      },
    })

    if (!existing) {
      await tx.userMentorState.update({
        where: { id: row.id },
        data: { userId: targetUserId },
      })
      continue
    }

    await tx.userMentorState.update({
      where: { id: existing.id },
      data: {
        currentStep: existing.currentStep || row.currentStep,
        context: toJsonInput(mergeJsonValues(row.context, existing.context) ?? existing.context),
        lastInteractionAt: maxDate(existing.lastInteractionAt, row.lastInteractionAt) ?? existing.lastInteractionAt,
      },
    })

    await tx.userMentorState.delete({ where: { id: row.id } })
  }
}

async function mergeAimentorSession(
  tx: Tx,
  sourceUserId: string,
  targetUserId: string,
  mentorIdMap: Map<string, string>,
) {
  const source = await tx.aiMentorSession.findUnique({ where: { userId: sourceUserId } })
  if (!source) return

  const target = await tx.aiMentorSession.findUnique({ where: { userId: targetUserId } })
  const mappedUserMentorId = mentorIdMap.get(source.userMentorId) ?? source.userMentorId

  if (!target) {
    await tx.aiMentorSession.update({
      where: { userId: sourceUserId },
      data: {
        userId: targetUserId,
        userMentorId: mappedUserMentorId,
      },
    })
    return
  }

  await tx.aiMentorMessage.updateMany({
    where: { sessionId: source.id },
    data: { sessionId: target.id },
  })

  const shouldReplace = source.updatedAt > target.updatedAt
  if (shouldReplace) {
    await tx.aiMentorSession.update({
      where: { userId: targetUserId },
      data: {
        chatId: source.chatId || target.chatId,
        userMentorId: mappedUserMentorId,
        state: source.state || target.state,
        step: Math.max(target.step, source.step),
        data: toJsonInput(mergeJsonValues(source.data, target.data) ?? target.data),
        endedAt: target.endedAt ?? source.endedAt,
      },
    })
  }

  await tx.aiMentorSession.delete({ where: { userId: sourceUserId } })
}

function canAutoMerge(target: MergeCandidate, source: MergeCandidate): boolean {
  if (target.id === source.id) return false

  const guestInvolved = isGuestEmail(target.email) || isGuestEmail(source.email)
  if (!guestInvolved) return false

  const allowedRoles = new Set<Role>([Role.USER])
  if (allowedRoles.has(target.role) && allowedRoles.has(source.role)) {
    return true
  }

  // FIX 2025-05-25 C1: allow guest identity merge into established account roles.
  // Used when Telegram guest later provides email of an existing account.
  const privilegedRoles = new Set<Role>([Role.ADMIN, Role.SUPERADMIN])
  const targetIsGuest = isGuestEmail(target.email)
  const sourceIsGuest = isGuestEmail(source.email)
  if (targetIsGuest && privilegedRoles.has(source.role)) {
    return true
  }
  if (sourceIsGuest && privilegedRoles.has(target.role)) {
    return true
  }

  return false
}

async function mergeUsersTx(
  tx: Tx,
  params: {
    sourceUserId: string
    targetUserId: string
    normalizedEmail?: string
    reason: MergeReason
  },
): Promise<{ userId: string; merged: boolean }> {
  const { sourceUserId, targetUserId, normalizedEmail } = params

  if (sourceUserId === targetUserId) {
    if (normalizedEmail) {
      await tx.user.update({
        where: { id: targetUserId },
        data: { email: normalizedEmail },
      })
    }
    return { userId: targetUserId, merged: false }
  }

  const [source, target] = await Promise.all([
    getMergeCandidate(tx, sourceUserId),
    getMergeCandidate(tx, targetUserId),
  ])

  if (!canAutoMerge(target, source)) {
    throw new Error('IDENTITY_MERGE_CONFLICT')
  }

  const nextEmail = normalizedEmail
    ?? (!isGuestEmail(target.email) ? target.email : !isGuestEmail(source.email) ? source.email : target.email)

  await tx.user.update({
    where: { id: sourceUserId },
    data: {
      email: buildArchivedEmail(sourceUserId),
      telegramUserId: null,
      telegramUserName: null,
      telegramChatId: null,
      deletedAt: new Date(),
    },
  })

  const mergedRole = chooseRole(target.role, source.role)
  await tx.user.update({
    where: { id: targetUserId },
    data: {
      email: nextEmail,
      role: mergedRole,
      activeRole: mergedRole,
      firstName: target.firstName ?? source.firstName,
      lastName: target.lastName ?? source.lastName,
      passwordHash: target.passwordHash ?? source.passwordHash,
      telegramUserId: target.telegramUserId ?? source.telegramUserId,
      telegramUserName: target.telegramUserName ?? source.telegramUserName,
      telegramChatId: target.telegramChatId ?? source.telegramChatId,
      telegramLinkedAt: minDate(target.telegramLinkedAt, source.telegramLinkedAt),
      currentState: target.currentState ?? source.currentState,
      currentStep: target.currentStep ?? source.currentStep,
      onboardingStartedAt: minDate(target.onboardingStartedAt, source.onboardingStartedAt),
      trialStartsAt: minDate(target.trialStartsAt, source.trialStartsAt),
      trialEndsAt: maxDate(target.trialEndsAt, source.trialEndsAt),
      settings: toNullableJsonInput(mergeJsonValues(source.settings, target.settings)),
      lastLoginAt: maxDate(target.lastLoginAt, source.lastLoginAt),
    },
  })

  await mergeSimpleByUserId(tx, 'refreshToken', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'subscription', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'paymentLog', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'purchaseHistory', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'aiRecommendation', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'ctaInteraction', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'reminder', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'microTask', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'microSupportItem', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'notification', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'report', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'telegramLink', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'deepLinkToken', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'assistantSession', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'assistantMemory', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'generationLog', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'affiliateLink', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'aiConversation', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'contentItem', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'funnelLead', sourceUserId, targetUserId)
  await mergeSimpleByUserId(tx, 'event', sourceUserId, targetUserId)

  await mergeDailyEntries(tx, sourceUserId, targetUserId)
  await mergeDailyCycleLogs(tx, sourceUserId, targetUserId)
  await mergeTrialMirrors(tx, sourceUserId, targetUserId)
  await mergeStreaks(tx, sourceUserId, targetUserId)
  await mergeVisionStatements(tx, sourceUserId, targetUserId)
  await mergeWheelAssessments(tx, sourceUserId, targetUserId)
  await mergeUserBalanceEntries(tx, sourceUserId, targetUserId)
  await mergeGoalsSets(tx, sourceUserId, targetUserId)

  await mergeUserProgress(tx, sourceUserId, targetUserId)
  await mergeCycleStreakMetric(tx, sourceUserId, targetUserId)
  await mergeGamificationProfile(tx, sourceUserId, targetUserId)
  await mergeGenerationQuota(tx, sourceUserId, targetUserId)
  await mergeUserMentorConfig(tx, sourceUserId, targetUserId)
  await mergeMentorConfig(tx, sourceUserId, targetUserId)

  await mergeEnrollmentLike(tx, 'enrollment', sourceUserId, targetUserId)
  await mergeEnrollmentLike(tx, 'productSubscription', sourceUserId, targetUserId)
  await mergeEnrollmentLike(tx, 'courseEnrollment', sourceUserId, targetUserId)
  await mergeFivePointsEnrollment(tx, sourceUserId, targetUserId)

  await mergeStageProgress(tx, 'userFunnelStageProgress', sourceUserId, targetUserId)
  await mergeStageProgress(tx, 'userVideoStageProgress', sourceUserId, targetUserId)
  await mergeStageProgress(tx, 'userMiniCourseStageProgress', sourceUserId, targetUserId)

  await mergeWeeklyReports(tx, sourceUserId, targetUserId)
  await mergeMentorWeeklyProfiles(tx, sourceUserId, targetUserId)
  await mergeAimemory(tx, sourceUserId, targetUserId)

  const { idMap: mentorIdMap, duplicateSourceIdsToDelete } = await mergeUserAiMentors(tx, sourceUserId, targetUserId)
  await mergeUserMentorStates(tx, sourceUserId, targetUserId)
  await mergeAimentorSession(tx, sourceUserId, targetUserId, mentorIdMap)
  for (const sourceId of duplicateSourceIdsToDelete) {
    await tx.userAiMentor.delete({ where: { id: sourceId } })
  }

  await tx.user.delete({ where: { id: sourceUserId } })

  return { userId: targetUserId, merged: true }
}

export async function attachEmailToUser(
  userId: string,
  rawEmail: string,
): Promise<{ userId: string; merged: boolean }> {
  const email = normalizeEmail(rawEmail)
  if (!email || !email.includes('@')) {
    throw new Error('INVALID_EMAIL')
  }

  return prisma.$transaction(async tx => {
    const current = await getMergeCandidate(tx, userId)
    const existing = await findUserByEmailTx(tx, email)

    if (!existing || existing.id === userId) {
      await tx.user.update({
        where: { id: userId },
        data: { email },
      })
      return { userId, merged: false }
    }

    // FIX 2025-05-25 D1: preserve established email account id when merging with telegram guest.
    const preserveExistingIdentity = isGuestEmail(current.email) && !isGuestEmail(existing.email)
    return mergeUsersTx(tx, {
      sourceUserId: preserveExistingIdentity ? current.id : existing.id,
      targetUserId: preserveExistingIdentity ? existing.id : current.id,
      normalizedEmail: email,
      reason: 'email_attach',
    })
  })
}

export async function resolveOrCreateTelegramGuestUser(params: {
  linkedUserId: string | null
  telegramUserId: string
  telegramUserName: string | null
  chatId: string
  firstName: string
}): Promise<string> {
  if (params.linkedUserId) {
    return params.linkedUserId
  }

  return prisma.$transaction(async tx => {
    const linkedByChat = await tx.telegramLink.findFirst({
      where: {
        chatId: params.chatId,
        isActive: true,
      },
      select: { userId: true },
    })
    if (linkedByChat?.userId) {
      return linkedByChat.userId
    }

    const found = await tx.user.findFirst({
      where: {
        OR: [
          { telegramUserId: params.telegramUserId },
          { telegramChatId: params.chatId },
          ...(params.telegramUserName ? [{ telegramUserName: params.telegramUserName }] : []),
        ],
      },
      select: { id: true },
    })

    if (found?.id) {
      return found.id
    }

    const guestEmail = `telegram-guest-${params.telegramUserId}@starway.local`
    const existingGuest = await tx.user.findUnique({
      where: { email: guestEmail },
      select: { id: true },
    })

    if (found?.id && existingGuest?.id && found.id !== existingGuest.id) {
      const [foundCandidate, guestCandidate] = await Promise.all([
        getMergeCandidate(tx, found.id),
        getMergeCandidate(tx, existingGuest.id),
      ])

      if (canAutoMerge(foundCandidate, guestCandidate)) {
        const foundIsGuest = isGuestEmail(foundCandidate.email)
        const guestIsGuest = isGuestEmail(guestCandidate.email)
        const targetUserId = foundIsGuest && !guestIsGuest ? guestCandidate.id : foundCandidate.id
        const sourceUserId = targetUserId === foundCandidate.id ? guestCandidate.id : foundCandidate.id
        const merged = await mergeUsersTx(tx, {
          sourceUserId,
          targetUserId,
          reason: 'telegram_identity',
        })
        console.info('[USER_DEDUP]', {
          telegramUserId: params.telegramUserId,
          chatId: params.chatId,
          foundUserId: found.id,
          guestUserId: existingGuest.id,
          reconciledUserId: merged.userId,
          merged: true,
          source: 'resolve_or_create_reconciled',
        })
        return merged.userId
      }
    }

    if (existingGuest?.id) {
      return existingGuest.id
    }

    const created = await tx.user.create({
      data: {
        email: guestEmail,
        firstName: params.firstName,
        telegramUserId: params.telegramUserId,
        telegramUserName: params.telegramUserName,
        telegramChatId: params.chatId,
        telegramLinkedAt: new Date(),
        // activeRole mirrors role for new users — user can switch later
        role: 'USER',
        activeRole: 'USER',
      },
      select: { id: true },
    })

    return created.id
  })
}

export async function reconcileTelegramIdentityUsers(params: {
  linkedUserId: string
  identityUserId: string
  reason?: 'link_identity_mismatch' | 'start_reconcile'
}): Promise<{ userId: string; merged: boolean }> {
  const { linkedUserId, identityUserId } = params
  if (!linkedUserId || !identityUserId || linkedUserId === identityUserId) {
    return { userId: linkedUserId || identityUserId, merged: false }
  }

  try {
    return await prisma.$transaction(async tx => {
      const linked = await getMergeCandidate(tx, linkedUserId)
      const identity = await getMergeCandidate(tx, identityUserId)

      if (!canAutoMerge(linked, identity)) {
        return { userId: linkedUserId, merged: false }
      }

      // Keep non-guest/established profile as target whenever possible.
      const linkedIsGuest = isGuestEmail(linked.email)
      const identityIsGuest = isGuestEmail(identity.email)
      const targetUserId = linkedIsGuest && !identityIsGuest ? identity.id : linked.id
      const sourceUserId = targetUserId === linked.id ? identity.id : linked.id

      return mergeUsersTx(tx, {
        sourceUserId,
        targetUserId,
        reason: 'telegram_identity',
      })
    })
  } catch (error) {
    console.warn('[USER_DEDUP] reconcile_failed', {
      linkedUserId,
      identityUserId,
      reason: params.reason ?? 'link_identity_mismatch',
      error: error instanceof Error ? error.message : String(error),
    })
    return { userId: linkedUserId, merged: false }
  }
}

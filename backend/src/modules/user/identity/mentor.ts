import type {
  Tx,
} from './types.js'
import {
  maxDate,
  mergeJsonValues,
  toJsonInput,
  toNullableJsonInput,
} from './values.js'

export async function mergeWeeklyReports(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeMentorWeeklyProfiles(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeAimemory(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeUserAiMentors(
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

export async function mergeUserMentorStates(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeAimentorSession(
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

import type {
  Tx,
} from './types.js'
import {
  maxDate,
  mergeJsonValues,
  minDate,
  toJsonInput,
} from './values.js'

export async function mergeDailyEntries(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeDailyCycleLogs(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeTrialMirrors(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeStreaks(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeVisionStatements(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.visionStatement.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

export async function mergeWheelAssessments(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.wheelAssessment.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

export async function mergeUserBalanceEntries(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.userBalanceEntry.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

export async function mergeGoalsSets(tx: Tx, sourceUserId: string, targetUserId: string) {
  await tx.goalsSet.updateMany({
    where: { userId: sourceUserId },
    data: { userId: targetUserId },
  })
}

export async function mergeSimpleByUserId(
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

import type {
  Tx,
} from './types.js'
import {
  maxDate,
  mergeJsonValues,
  minDate,
  toJsonInput,
} from './values.js'

export async function mergeUserProgress(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeCycleStreakMetric(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeGamificationProfile(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeGenerationQuota(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeUserMentorConfig(tx: Tx, sourceUserId: string, targetUserId: string) {
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

export async function mergeMentorConfig(tx: Tx, sourceUserId: string, targetUserId: string) {
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

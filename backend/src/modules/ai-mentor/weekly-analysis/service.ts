import { SubscriptionStatus } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { logger } from '../../../utils/logger.js'
import { storeWeeklySocialProofArtifacts } from '../../admin/content-research/service.js'
import { suggestNextProduct } from '../../assistant/service.js'
import type { WeeklyAnalysisResult } from './types.js'
import { collectWeeklyData } from './data.js'
import {
  applyPausedReportFraming,
  buildFallbackUserReport,
  generateUserReport,
} from './report.js'
import {
  buildFallbackMentorProfile,
  generateMentorProfile,
} from './profile.js'
import { saveResults } from './persistence.js'

export { collectWeeklyData } from './data.js'

export async function runWeeklyAnalysis(
  userId: string,
): Promise<WeeklyAnalysisResult | null> {

  const weekEnd   = new Date()
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 7)

  try {
    logger.info(`[WeeklyAnalysis] start userId=${userId}`)

    const rawData      = await collectWeeklyData(userId, weekStart, weekEnd)

    const shouldUseFallback = rawData.dailyCycles.length < 2 && rawData.mentorMessages.length < 2
    let userReport = buildFallbackUserReport(rawData)

    if (!shouldUseFallback) {
      try {
        userReport = await generateUserReport(rawData)
      } catch (error) {
        logger.warn(`[WeeklyAnalysis] user report AI failed, using fallback userId=${userId}`, error)
      }
    }

    userReport = applyPausedReportFraming(rawData, userReport)

    let profile = buildFallbackMentorProfile(rawData, userReport)

    if (!shouldUseFallback) {
      try {
        profile = await generateMentorProfile(rawData, userReport)
      } catch (error) {
        logger.warn(`[WeeklyAnalysis] mentor profile AI failed, using fallback userId=${userId}`, error)
      }
    }

    const suggestion = await suggestNextProduct(userId).catch((error) => {
      logger.warn(`[WeeklyAnalysis] next product suggestion failed, using fallback userId=${userId}`, error)
      return null
    })

    const offerMap: Record<string, string> = {
      '5points': '🧭 Знайти свої точки опори',
      'trial': '✨ Спробувати 7 днів',
      'subscription': '🚀 Отримати повний доступ',
      'mentorship': '💬 Записатись на наставництво',
    }

    const upsellMap: Record<string, string> = {
      '5points': '5points',
      'trial': 'trial',
      'subscription': 'subscription',
      'mentorship': 'mentorship',
    }

    if (suggestion) {
      profile.recommendedOffer = offerMap[suggestion] ?? profile.recommendedOffer
      profile.upsellProduct = upsellMap[suggestion] ?? profile.upsellProduct
      profile.upsellReady = true
    }

    const result: WeeklyAnalysisResult = {
      userReport,
      mentorProfile: profile,
      metrics: {
        sessions: rawData.sessionCount,
        reflections: rawData.reflectionCount,
        tasksDone: rawData.microTasks.filter(task => task.completed).length,
        tasksTotal: rawData.microTasks.length,
        wheels: rawData.wheelCheckins,
      },
    }

    await saveResults(result)
    await storeWeeklySocialProofArtifacts({
      userId: result.userReport.userId,
      weekStart: result.userReport.weekStart,
      weekEnd: result.userReport.weekEnd,
      userReport: {
        summaryText: result.userReport.summaryText,
        topInsights: result.userReport.topInsights,
        nextWeekFocus: result.userReport.nextWeekFocus,
        nextWeekTasks: result.userReport.nextWeekTasks,
        completionRate: result.userReport.completionRate,
        streakDays: result.userReport.streakDays,
        growthAreas: result.userReport.growthAreas,
        struggleAreas: result.userReport.struggleAreas,
      },
      mentorProfile: {
        behaviorPattern: result.mentorProfile.behaviorPattern,
        mainPainThisWeek: result.mentorProfile.mainPainThisWeek,
        emotionalTone: result.mentorProfile.emotionalTone,
        retentionRisk: result.mentorProfile.retentionRisk,
        retentionFactors: result.mentorProfile.retentionFactors,
        churnSignals: result.mentorProfile.churnSignals,
        upsellReady: result.mentorProfile.upsellReady,
        upsellProduct: result.mentorProfile.upsellProduct,
        upsellTiming: result.mentorProfile.upsellTiming,
        upsellReasoning: result.mentorProfile.upsellReasoning,
        recommendedOffer: result.mentorProfile.recommendedOffer,
        systemNotes: result.mentorProfile.systemNotes,
      },
      zoomTranscripts: rawData.zoomTranscripts,
    })

    logger.info(`[WeeklyAnalysis] done userId=${userId} retention=${profile.retentionRisk}`)
    return result

  } catch (err) {
    logger.error(`[WeeklyAnalysis] error userId=${userId}`, err)
    return null
  }
}

export async function runWeeklyAnalysisForAll(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: {
      subscriptions: {
        some: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      },
    },
    select: { id: true },
  })

  logger.info(`[WeeklyAnalysis] processing ${activeUsers.length} users`)

  // По черзі щоб не спалити rate limit OpenAI
  for (const user of activeUsers) {
    await runWeeklyAnalysis(user.id)
    await new Promise(r => setTimeout(r, 1500))  // 1.5s між запитами
  }

  logger.info('[WeeklyAnalysis] all done')
}

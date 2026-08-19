import { prisma } from '../../../db/client.js'
import { invalidateWeeklyReportCache } from '../../../lib/db/weeklyReportCache.js'
import { logger } from '../../../utils/logger.js'
import type { WeeklyAnalysisResult } from './types.js'

export async function resolveWeeklyReportProductId(userId: string): Promise<string | null> {
  const latestSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      productId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  })

  if (latestSubscription?.productId) {
    return latestSubscription.productId
  }

  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { userId },
    orderBy: { enrolledAt: 'desc' },
    select: { productId: true },
  })

  if (latestEnrollment?.productId) {
    return latestEnrollment.productId
  }

  const mentorProduct = await prisma.product.findFirst({
    where: {
      OR: [
        { code: { contains: 'mentor', mode: 'insensitive' } },
        { name: { contains: 'mentor', mode: 'insensitive' } },
        { name: { contains: 'ментор', mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (mentorProduct?.id) {
    return mentorProduct.id
  }

  const fallbackProduct = await prisma.product.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  return fallbackProduct?.id ?? 'AI_MENTOR'
}

export async function saveResults(result: WeeklyAnalysisResult): Promise<void> {
  const productId = await resolveWeeklyReportProductId(result.userReport.userId)
  if (!productId) {
    logger.warn(`[WeeklyAnalysis] no product found for weekly report userId=${result.userReport.userId}`)
    return
  }

  const profileData = {
    userId:            result.mentorProfile.userId,
    weekStart:         result.mentorProfile.weekStart,
    behaviorPattern:   result.mentorProfile.behaviorPattern,
    engagementRhythm:  result.mentorProfile.engagementRhythm,
    mainPainThisWeek:  result.mentorProfile.mainPainThisWeek,
    emotionalTone:     result.mentorProfile.emotionalTone,
    retentionRisk:     result.mentorProfile.retentionRisk,
    retentionFactors:  result.mentorProfile.retentionFactors,
    churnSignals:      result.mentorProfile.churnSignals,
    upsellReady:       result.mentorProfile.upsellReady,
    upsellProduct:     result.mentorProfile.upsellProduct,
    upsellTiming:      result.mentorProfile.upsellTiming,
    upsellReasoning:   result.mentorProfile.upsellReasoning,
    offerShownAt:      result.mentorProfile.offerShownAt ?? null,
    nextMessageTone:   result.mentorProfile.nextMessageTone,
    triggerForContact: result.mentorProfile.triggerForContact,
    recommendedOffer:  result.mentorProfile.recommendedOffer,
    systemNotes:       result.mentorProfile.systemNotes,
  }

  const existing = await prisma.mentorWeeklyProfile.findFirst({
    where: {
      userId:    profileData.userId,
      weekStart: profileData.weekStart,
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.mentorWeeklyProfile.update({
      where: { id: existing.id },
      data:  profileData,
    })
  } else {
    await prisma.mentorWeeklyProfile.create({ data: profileData })
  }

  const reportData = {
    productId,
    userId: result.userReport.userId,
    weekStart: result.userReport.weekStart,
    weekEnd: result.userReport.weekEnd,
    overallScore: result.userReport.overallScore,
    completionRate: result.userReport.completionRate,
    streakDays: result.userReport.streakDays,
    topInsights: result.userReport.topInsights,
    growthAreas: result.userReport.growthAreas,
    struggleAreas: result.userReport.struggleAreas,
    wheelDelta: result.userReport.wheelDelta,
    summaryText: result.userReport.summaryText,
    motivationText: result.userReport.motivationText,
    nextWeekFocus: result.userReport.nextWeekFocus,
    nextWeekTasks: result.userReport.nextWeekTasks,
    metrics: {
      sessions: result.metrics.sessions,
      reflections: result.metrics.reflections,
      tasksDone: result.metrics.tasksDone,
      tasksTotal: result.metrics.tasksTotal,
      wheels: result.metrics.wheels,
      streakDays: result.userReport.streakDays,
      partialTasks: result.userReport.partialTaskCount ?? 0,
      averageTaskProgress: result.userReport.averageTaskProgress ?? null,
      slowProgressTaskCount: result.userReport.slowProgressTaskCount ?? 0,
    },
    analysis: {
      behaviorPattern: result.mentorProfile.behaviorPattern,
      engagementRhythm: result.mentorProfile.engagementRhythm,
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
      microTaskProgress: {
        partialTaskCount: result.userReport.partialTaskCount ?? 0,
        averageTaskProgress: result.userReport.averageTaskProgress ?? null,
        slowProgressTaskCount: result.userReport.slowProgressTaskCount ?? 0,
      },
    },
    heroVariants: [],
    adTexts: {
      facebook: '',
      instagram_caption: '',
      tiktok_hook: '',
      stories: '',
      reels_script: '',
    },
  }

  const existingWeeklyReport = await prisma.weeklyReport.findFirst({
    where: {
      userId: result.userReport.userId,
      weekStart: result.userReport.weekStart,
    },
    select: { id: true },
  })

  if (existingWeeklyReport) {
    await prisma.weeklyReport.update({
      where: { id: existingWeeklyReport.id },
      data: reportData,
    })
    await invalidateWeeklyReportCache(result.userReport.userId, result.userReport.weekStart, existingWeeklyReport.id)
  } else {
    const createdWeeklyReport = await prisma.weeklyReport.create({ data: reportData })
    await invalidateWeeklyReportCache(result.userReport.userId, result.userReport.weekStart, createdWeeklyReport.id)
  }
}

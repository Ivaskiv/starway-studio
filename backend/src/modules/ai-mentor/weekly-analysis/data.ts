import {
  Prisma,
  SubscriptionStatus,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { extractProgressPercent } from '../../microTask/service.js'
import { parseZoomPostReport } from '../../zoom/reports/zoomPostReport.types.js'
import type { WeeklyRawData } from './types.js'
import {
  extractAnswers,
  normalizeZoomTranscript,
} from './helpers.js'

export async function collectWeeklyData(
  userId: string,
  weekStart: Date,
  weekEnd:   Date,
): Promise<WeeklyRawData> {

  const [
    user,
    dailyEntries,
    goalsSet,
    wheelEntries,
    prevWheelEntries,
    wheelCheckins,
    microTasks,
    messages,
    sessionCount,
    streak,
    subscription,
    zoomTranscripts,
  ] = await Promise.all([

    prisma.user.findUnique({
      where: { id: userId },
      select: {
        trialStartsAt: true,
        trialEndsAt: true,
      },
    }),

    prisma.dailyEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: 'asc' },
    }),

    prisma.goalsSet.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { lt: weekStart } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.count({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),

    prisma.microTask.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),

    prisma.aiMentorMessage.findMany({
      where: {
        session: {
          userMentor: { userId },
        },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { createdAt: 'asc' },
      take: 40,   // обмежуємо щоб не перевантажити контекст
    }),

    prisma.aiMentorSession.count({
      where: {
        userMentor: { userId },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
    }),

    prisma.streak.findFirst({ where: { userId } }),

    prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.zoomSession.findMany({
      where: {
        scheduledAt: { gte: weekStart, lte: weekEnd },
        postSessionReport: {
          not: Prisma.JsonNull,
        },
      },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true,
        topic: true,
        scheduledAt: true,
        postSessionReport: true,
      },
    }),
  ])

  // Формуємо wheelScores з delta
  const currentSpheres = (wheelEntries?.scores as Record<string, number>) ?? {}
  const prevSpheres    = (prevWheelEntries?.scores as Record<string, number>) ?? {}

  const wheelScores = Object.entries(currentSpheres).map(([sphere, score]) => ({
    sphere,
    score,
    prev: prevSpheres[sphere],
  }))
  const primaryGoal = Array.isArray(goalsSet?.goals)
    ? (goalsSet.goals as Array<{ text?: unknown; isPrimary?: unknown }>).find(
      goal => Boolean(goal?.isPrimary && typeof goal.text === 'string' && goal.text.trim()),
    )
    : null
  const userGoal = primaryGoal?.text ? String(primaryGoal.text).trim() : null
  const morningReflections = dailyEntries
    .map(entry => [
      entry.state ? `Стан: ${entry.state}` : '',
      entry.dayFact ? `Факт: ${entry.dayFact}` : '',
      entry.drain ? `Дренаж: ${entry.drain}` : '',
    ].filter(Boolean).join(' · '))
    .filter(Boolean)
  const eveningReflections = dailyEntries
    .map(entry => [
      entry.dayFact ? `Підсумок: ${entry.dayFact}` : '',
      entry.drain ? `Що заважало: ${entry.drain}` : '',
    ].filter(Boolean).join(' · '))
    .filter(Boolean)

  const transcriptItems = zoomTranscripts
    .map((session) => {
      const report = parseZoomPostReport(session.postSessionReport)
      if (!report) return null

      const transcript = [
        session.topic ? `Topic: ${session.topic}` : '',
        report.summary ? `Summary: ${report.summary}` : '',
        ...(report.highlights ?? []).map((highlight) => `HIGHLIGHT: ${highlight}`),
        ...(report.quotes ?? []).map((quote) => `QUOTE: ${quote}`),
        report.transcript ? `Transcript: ${report.transcript}` : '',
      ].filter((line) => line.trim().length > 0).join('\n')

      if (!transcript.trim()) return null

      return normalizeZoomTranscript({
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        transcript,
        transcriptLength: transcript.length,
        fileId: typeof report.audioFileId === 'string' ? report.audioFileId : null,
        fileUniqueId: null,
        chatId: null,
        messageId: null,
        mediaType: null,
        fileName: null,
        mimeType: null,
        caption: null,
        observedAt: report.transcribedAt ?? null,
      })
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return {
    userId,
    weekStart,
    weekEnd,
    trialStartedAt: user?.trialStartsAt ?? null,
    trialEndsAt: user?.trialEndsAt ?? null,
    userGoal,
    accessState: subscription?.status === SubscriptionStatus.ACTIVE
      ? 'active'
      : user?.trialEndsAt && user.trialEndsAt > weekEnd
        ? 'trial'
        : 'paused',
    reflectionCount: dailyEntries.length,
    sessionCount,
    wheelCheckins,
    morningReflections,
    eveningReflections,

    dailyCycles: dailyEntries.map(entry => ({
      date:    entry.date,
      state:   entry.state as string,
      choices: extractAnswers(entry.content),
      drains:  entry.drain ? [entry.drain] : [],
      facts:   entry.dayFact ?? '',
    })),

    wheelScores,

    microTasks: microTasks.map(t => {
      const isOverdue = t.dueAt ? t.dueAt.getTime() < weekEnd.getTime() : false
      return {
        title:     t.title,
        completed: t.isCompleted,
        skipped:   !t.isCompleted && isOverdue,
        progressPercent: extractProgressPercent(t.aiContext),
        daysToComplete: t.daysToComplete,
      }
    }),

    mentorMessages: messages.map(m => ({
      role:    m.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: m.content,
      date:    m.createdAt,
    })),
    zoomTranscripts: transcriptItems,

    streakDays:       streak?.current ?? 0,
    subscriptionPlan: subscription?.planCode ?? 'trial',
  }
}

import { prisma } from '../../db/client.js'
import { generateWeeklyReport } from '../ai-mentor/services.js'
import { getWheelHistory, scoresFromMap } from '../wheel/service.js'

const DAY_MS = 24 * 60 * 60 * 1000

function startOfWindow(days: number) {
  return new Date(Date.now() - days * DAY_MS)
}

function averageWheelScore(entries: Awaited<ReturnType<typeof getWheelHistory>>) {
  const scores = entries.flatMap(entry => scoresFromMap(entry.scores).map(score => score.score))
  if (!scores.length) return null
  return Math.round((scores.reduce((total, score) => total + score, 0) / scores.length) * 10) / 10
}

async function getWindowMetrics(userId: string, days: number) {
  const from = startOfWindow(days)
  const [dailyEntries, microTasksDone, microTasksTotal, mentorSessions, wheels] = await Promise.all([
    prisma.dailyEntry.count({ where: { userId, createdAt: { gte: from } } }),
    prisma.microTask.count({ where: { userId, isCompleted: true, createdAt: { gte: from } } }),
    prisma.microTask.count({ where: { userId, createdAt: { gte: from } } }),
    prisma.aiMentorSession.count({ where: { userMentor: { userId }, createdAt: { gte: from } } }),
    getWheelHistory(userId, 30),
  ])

  const wheelsInWindow = wheels.filter(entry => entry.createdAt >= from)

  return {
    from,
    to: new Date(),
    days,
    dailyEntries,
    microTasksDone,
    microTasksTotal,
    mentorSessions,
    wheelEntries: wheelsInWindow.length,
    avgWheelScore: averageWheelScore(wheelsInWindow),
  }
}

export async function getPlatformWeeklyReport(userId: string) {
  const metrics = await getWindowMetrics(userId, 7)

  return {
    period: 'weekly' as const,
    metrics,
    summary: [
      `Щоденних циклів: ${metrics.dailyEntries}`,
      `Мікрозадач виконано: ${metrics.microTasksDone}/${metrics.microTasksTotal}`,
      `Середній бал колеса: ${metrics.avgWheelScore ?? 'ще немає даних'}`,
    ],
  }
}

export async function generatePlatformWeeklyReport(userId: string) {
  return generateWeeklyReport(userId)
}

export async function getPlatformMonthlyReport(userId: string) {
  const metrics = await getWindowMetrics(userId, 30)

  return {
    period: 'monthly' as const,
    metrics,
    summary: [
      `Активних записів за 30 днів: ${metrics.dailyEntries}`,
      `Мікрозадач виконано: ${metrics.microTasksDone}/${metrics.microTasksTotal}`,
      `AI-сесій: ${metrics.mentorSessions}`,
      `Колесо проходили разів: ${metrics.wheelEntries}`,
    ],
  }
}

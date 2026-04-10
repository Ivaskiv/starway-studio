import type { Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../db/client.js'
import { cacheDel, cacheGet, cacheSet } from '../cache/index.js'

function weekKey(value: Date) {
  return value.toISOString().split('T')[0] ?? ''
}

type LatestWeeklyReport = Prisma.WeeklyReportGetPayload<Record<string, never>> | null

type WeeklyReportListItem = Prisma.WeeklyReportGetPayload<{
  select: {
    id: true
    weekStart: true
    weekEnd: true
    overallScore: true
    completionRate: true
    streakDays: true
    nextWeekFocus: true
    pdfUrl: true
  }
}>

type WeeklyReportById = Prisma.WeeklyReportGetPayload<Record<string, never>> | null

export async function getCachedLatestWeeklyReport(userId: string): Promise<LatestWeeklyReport> {
  const key = `weekly-report:latest:${userId}`
  const cached = await cacheGet<LatestWeeklyReport>(key)
  if (cached !== null) return cached

  const report = await prisma.weeklyReport.findFirst({
    where: { userId },
    orderBy: { weekStart: 'desc' },
  })

  await cacheSet(key, report, 7 * 24 * 3600)
  return report
}

export async function getCachedWeeklyReports(userId: string): Promise<WeeklyReportListItem[]> {
  const key = `weekly-report:list:${userId}`
  const cached = await cacheGet<WeeklyReportListItem[]>(key)
  if (cached !== null) return cached

  const reports = await prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
    take: 12,
    select: {
      id: true,
      weekStart: true,
      weekEnd: true,
      overallScore: true,
      completionRate: true,
      streakDays: true,
      nextWeekFocus: true,
      pdfUrl: true,
    },
  })

  await cacheSet(key, reports, 7 * 24 * 3600)
  return reports
}

export async function getCachedWeeklyReportById(userId: string, reportId: string): Promise<WeeklyReportById> {
  const key = `weekly-report:item:${userId}:${reportId}`
  const cached = await cacheGet<WeeklyReportById>(key)
  if (cached !== null) return cached

  const report = await prisma.weeklyReport.findFirst({
    where: { id: reportId, userId },
  })

  await cacheSet(key, report, 7 * 24 * 3600)
  return report
}

export async function invalidateWeeklyReportCache(userId: string, weekStart?: Date, reportId?: string) {
  await cacheDel(`weekly-report:latest:${userId}`)
  await cacheDel(`weekly-report:list:${userId}`)
  if (reportId) {
    await cacheDel(`weekly-report:item:${userId}:${reportId}`)
  }
  if (weekStart) {
    await cacheDel(`weekly-report:${userId}:${weekKey(weekStart)}`)
  }
}

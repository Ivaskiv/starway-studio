import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { startOfKyivWeek } from '../../../modules/zoom/shared/zoom.time.utils.js'
import {
  buildExpertScopeWhere,
  coachPanelContent,
  formatKyivDateTime,
  replyOrEditPanelMessage,
  resolveCoachAccess,
} from './shared.js'

const PARTICIPANTS_ALL_CALLBACK = 'coach:participants'
export const PARTICIPANTS_UPCOMING_CALLBACK = 'coach:participants:upcoming'

type ParticipantUser = {
  id: string
  firstName: string | null
  lastName: string | null
  focusPaid: boolean
  createdAt: Date
  testResultType: string | null
}

function formatParticipantName(user: Pick<ParticipantUser, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Учасниця без імені'
}

function formatParticipantFocusStatus(focusPaid: boolean): string {
  return focusPaid ? 'активний' : 'неактивний'
}

function formatParticipantPoint(testResultType: string | null): string {
  const normalized = String(testResultType ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'STATE':
      return 'СТАН'
    case 'GOAL':
      return 'ЦІЛЬ'
    case 'CHOICE':
      return 'ВИБІР'
    case 'DECISION':
      return 'РІШЕННЯ'
    case 'ACTION':
      return 'ДІЯ'
    default:
      return 'ще не визначена'
  }
}

function formatParticipantZoomLine(summary: { total: number; nextDate: Date | null }): string {
  if (summary.total === 0) return 'Zoom: ще не записана'
  if (!summary.nextDate) return `Zoom: ${summary.total}`
  return `Zoom: ${summary.total} · ${formatKyivDateTime(summary.nextDate)}`
}

function formatParticipantRow(
  user: ParticipantUser,
  zoomSummary: { total: number; nextDate: Date | null },
): string {
  return [
    formatParticipantName(user),
    `ФОКУС: ${formatParticipantFocusStatus(user.focusPaid)}`,
    formatParticipantZoomLine(zoomSummary),
    `Остання точка: ${formatParticipantPoint(user.testResultType)}`,
  ].join('\n')
}

export async function handleCoachUsersCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const now = new Date()
  const normalized = payload.trim()
  const showUpcomingOnly = normalized === 'upcoming'
  const searchQuery = showUpcomingOnly
    ? ''
    : normalized.toLowerCase().startsWith('search ')
    ? normalized.slice(7).trim()
    : normalized
  const expertScopeWhere = buildExpertScopeWhere(coach)
  const weekStart = startOfKyivWeek()

  const [focusCount, newThisWeekCount, upcomingZoom] = await Promise.all([
    prisma.user.count({
      where: {
        deletedAt: null,
        ...expertScopeWhere,
        focusPaid: true,
      },
    }),
    prisma.user.count({
      where: {
        deletedAt: null,
        ...expertScopeWhere,
        createdAt: { gte: weekStart },
      },
    }),
    prisma.zoomSession.findFirst({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gt: now },
        ...expertScopeWhere,
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        _count: {
          select: {
            attendees: true,
          },
        },
        attendees: {
          select: {
            userId: true,
          },
        },
      },
    }),
  ])

  const upcomingUserIds = showUpcomingOnly
    ? upcomingZoom?.attendees.map((attendee) => attendee.userId) ?? []
    : []

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...expertScopeWhere,
      ...(showUpcomingOnly
        ? {
            id: {
              in: upcomingUserIds,
            },
          }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              { id: searchQuery },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { telegramUserId: searchQuery },
              { telegramChatId: searchQuery },
              { telegramUserName: { contains: searchQuery.replace(/^@/, ''), mode: 'insensitive' } },
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      focusPaid: true,
      createdAt: true,
      testResultType: true,
    },
  })

  const userIds = users.map((user) => user.id)
  const zoomAttendances = userIds.length === 0
    ? []
    : await prisma.zoomSessionAttendee.findMany({
        where: {
          userId: { in: userIds },
        },
        select: {
          userId: true,
          session: {
            select: {
              scheduledAt: true,
              status: true,
            },
          },
        },
      })

  const zoomSummaryByUserId = new Map<string, { total: number; nextDate: Date | null }>()
  for (const attendance of zoomAttendances) {
    const current = zoomSummaryByUserId.get(attendance.userId) ?? { total: 0, nextDate: null }
    const nextDate =
      attendance.session.status === 'SCHEDULED' && attendance.session.scheduledAt > now
        ? attendance.session.scheduledAt
        : null

    zoomSummaryByUserId.set(attendance.userId, {
      total: current.total + 1,
      nextDate:
        !current.nextDate || (nextDate && nextDate < current.nextDate)
          ? nextDate ?? current.nextDate
          : current.nextDate,
    })
  }

  const header = searchQuery
    ? `${coachPanelContent.users.searchHeader}: ${searchQuery}`
    : showUpcomingOnly
      ? coachPanelContent.users.upcomingHeader
    : coachPanelContent.users.listHeader

  const sections = [
    coachPanelContent.users.metrics.focus(focusCount),
    upcomingZoom
      ? coachPanelContent.users.metrics.upcoming(upcomingZoom._count.attendees)
      : null,
    coachPanelContent.users.metrics.newThisWeek(newThisWeekCount),
  ].filter(Boolean)

  const actionRows = [
    [{ text: coachPanelContent.users.actions.all, callback_data: PARTICIPANTS_ALL_CALLBACK }],
    ...(upcomingZoom
      ? [[{ text: coachPanelContent.users.actions.upcoming, callback_data: PARTICIPANTS_UPCOMING_CALLBACK }]]
      : []),
  ]

  if (users.length === 0) {
    await replyOrEditPanelMessage(ctx, [
      coachPanelContent.users.title,
      '',
      ...sections,
      '',
      header,
      '',
      coachPanelContent.users.empty,
    ].join('\n'), {
      reply_markup: {
        inline_keyboard: actionRows,
      },
    })
    return true
  }

  await replyOrEditPanelMessage(ctx, [
    coachPanelContent.users.title,
    '',
    ...sections,
    '',
    header,
    '',
    ...users.map((user) =>
      formatParticipantRow(user, zoomSummaryByUserId.get(user.id) ?? { total: 0, nextDate: null })
    ),
  ].join('\n\n'), {
    reply_markup: {
      inline_keyboard: actionRows,
    },
  })
  return true
}

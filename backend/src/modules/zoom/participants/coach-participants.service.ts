import { prisma } from '../../../db/client.js'
import { startOfKyivWeek } from '../shared/zoom.time.utils.js'

export type CoachParticipantsProjection = {
  summary: { activeFocusCount: number; newThisWeekCount: number }
  participants: Array<{ id: string; displayName: string; focusActive: boolean; zoomStatus: string; nextSessionAt: string | null; lastPoint: string | null }>
}

function formatParticipantPoint(value: string | null) {
  switch (String(value ?? '').trim().toUpperCase()) {
    case 'STATE': return 'СТАН'
    case 'GOAL': return 'ЦІЛЬ'
    case 'CHOICE': return 'ВИБІР'
    case 'DECISION': return 'РІШЕННЯ'
    case 'ACTION': return 'ДІЯ'
    default: return null
  }
}

export async function getCoachParticipants(expertId: string): Promise<CoachParticipantsProjection> {
  const weekStart = startOfKyivWeek()
  const users = await prisma.user.findMany({
    where: { deletedAt: null, expertId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, firstName: true, lastName: true, email: true, createdAt: true, testResultType: true,
      productSubscriptions: { where: { status: 'ACTIVE', product: { is: { code: { equals: 'focus', mode: 'insensitive' } } } }, select: { id: true } },
    },
  })
  const userIds = users.map((user) => user.id)
  const attendances = userIds.length ? await prisma.zoomSessionAttendee.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, session: { select: { scheduledAt: true, status: true } } },
  }) : []
  const now = new Date()
  const zoomByUser = new Map<string, { total: number; next: Date | null }>()
  for (const attendance of attendances) {
    const current = zoomByUser.get(attendance.userId) ?? { total: 0, next: null }
    const next = attendance.session.status === 'SCHEDULED' && attendance.session.scheduledAt > now ? attendance.session.scheduledAt : null
    zoomByUser.set(attendance.userId, { total: current.total + 1, next: !current.next || (next && next < current.next) ? next ?? current.next : current.next })
  }
  const participants = users.map((user) => {
    const zoom = zoomByUser.get(user.id) ?? { total: 0, next: null }
    return { id: user.id, displayName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.email || 'Учасниця без імені', focusActive: user.productSubscriptions.length > 0, zoomStatus: zoom.total === 0 ? 'ще не записана' : zoom.next ? `наступна сесія запланована` : `${zoom.total}`, nextSessionAt: zoom.next?.toISOString() ?? null, lastPoint: formatParticipantPoint(user.testResultType) }
  })
  return { summary: { activeFocusCount: participants.filter((participant) => participant.focusActive).length, newThisWeekCount: users.filter((user) => user.createdAt >= weekStart).length }, participants }
}

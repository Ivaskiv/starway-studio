import { Role,type Prisma } from '@starway/db/prisma-client'
import { prisma } from '../../../db/client.js'
import { resolveViewerScopedExpertId } from '../../experts/ownership.service.js'

type ViewerRole = 'SUPERADMIN' | 'ADMIN' | 'EXPERT'

type ViewerContext = {
  userId: string
  role: ViewerRole
  expertId?: string | null
}

type EventRecord = {
  userId: string | null
  type: string
  source: string
  state: string | null
  createdAt: Date
  payload: Prisma.JsonValue
}

export interface UserInsightItem {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
  telegramUserName: string | null
  source: string
  accessLabel: string
  activityLabel: string
  viewedSummary: string
  risk: 'low' | 'medium' | 'high'
  riskLabel: string
  nextAction: string
  streakDays: number
  actions7d: number
  activeDays7d: number
  estimatedMinutes7d: number
  botMessagesEnabled: boolean
  isLeadOnly: boolean
}

function isObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getStringField(payload: Prisma.JsonValue, key: string): string | null {
  if (!isObject(payload)) return null
  const value = payload[key]
  return typeof value === 'string' ? value : null
}

function normalizeSource(value?: string | null) {
  const source = String(value ?? '').trim().toLowerCase()
  if (!source) return 'Невідомо'
  if (source.includes('telegram')) return 'Telegram'
  if (source.includes('meta') || source.includes('facebook') || source.includes('fb')) return 'Meta Ads'
  if (source.includes('instagram') || source.includes('insta')) return 'Instagram'
  if (source.includes('email')) return 'Email'
  if (source.includes('sendpulse') || source.includes('pulse')) return 'SendPulse'
  if (source.includes('web') || source.includes('site')) return 'Сайт'
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function getEventArea(event: EventRecord): string {
  const type = event.type.toLowerCase()
  const productContext = getStringField(event.payload, 'productContext')?.toLowerCase()

  if (type.includes('wheel') || productContext === 'wheel') return 'Колесо балансу'
  if (
    type.includes('morning')
    || type.includes('evening')
    || type.includes('task')
    || type.includes('reflection')
    || type.includes('daily')
  ) return 'Щоденний цикл'
  if (type.includes('zoom')) return 'Zoom'
  if (type.includes('subscription') || type.includes('purchase') || type.includes('billing')) return 'Підписка'
  if (type.includes('lead') || (event.state ?? '').startsWith('lm_') || productContext === 'lead_magnet') return 'Лід-магніт'
  if (type.includes('ai') || type.includes('chat') || productContext === 'mentor') return 'AI асистент'
  if (type.includes('content') || type.includes('reels') || type.includes('publish')) return 'Контент'
  return 'Сайт / навігація'
}

function buildAccessLabel(input: {
  subscriptionStatus?: string | null
  subscriptionProduct?: string | null
  trialEndsAt?: Date | null
}) {
  const now = new Date()
  const status = String(input.subscriptionStatus ?? '').toLowerCase()
  if ((status === 'active' || status === 'trialing') && input.subscriptionProduct) {
    return input.subscriptionProduct
  }
  if (input.trialEndsAt && input.trialEndsAt > now) {
    return `Тріал до ${input.trialEndsAt.toLocaleDateString('uk-UA')}`
  }
  if (input.trialEndsAt && input.trialEndsAt <= now) {
    return 'Тріал завершено'
  }
  return 'Без активного доступу'
}

function buildActivitySummary(events: EventRecord[]) {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const recentEvents = events.filter((event) => event.createdAt >= sevenDaysAgo)
  const days = new Map<string, Date[]>()
  const areaCounts = new Map<string, number>()

  for (const event of recentEvents) {
    const key = event.createdAt.toISOString().slice(0, 10)
    const bucket = days.get(key) ?? []
    bucket.push(event.createdAt)
    days.set(key, bucket)
    const area = getEventArea(event)
    areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1)
  }

  let estimatedMinutes = 0
  for (const entries of days.values()) {
    const ordered = [...entries].sort((left, right) => left.getTime() - right.getTime())
    if (ordered.length <= 1) {
      estimatedMinutes += 3
      continue
    }
    const span = Math.round((ordered[ordered.length - 1].getTime() - ordered[0].getTime()) / 60000)
    estimatedMinutes += Math.max(4, Math.min(45, span))
  }

  const rankedAreas = [...areaCounts.entries()].sort((left, right) => right[1] - left[1])
  const topArea = rankedAreas[0]?.[0] ?? 'Немає активності'
  const topAreaCount = rankedAreas[0]?.[1] ?? 0

  return {
    actions7d: recentEvents.length,
    activeDays7d: days.size,
    estimatedMinutes7d: estimatedMinutes,
    viewedSummary: topAreaCount > 0 ? `${topArea} · ${topAreaCount} дій` : 'Ще немає руху',
    activityLabel: recentEvents.length > 0 ? `≈ ${estimatedMinutes} хв / 7 днів` : 'Без активності за 7 днів',
  }
}

function buildRisk(input: {
  lastSeenAt?: Date | null
  trialEndsAt?: Date | null
  subscriptionStatus?: string | null
  actions7d: number
  activeDays7d: number
}) {
  const now = new Date()
  const hoursSinceLastSeen = input.lastSeenAt ? (now.getTime() - input.lastSeenAt.getTime()) / 3600000 : Number.POSITIVE_INFINITY
  const status = String(input.subscriptionStatus ?? '').toLowerCase()

  if (status === 'active') {
    if (hoursSinceLastSeen > 96 || input.actions7d === 0) {
      return { risk: 'high' as const, riskLabel: 'Високий', nextAction: 'Повернути в ритм через Telegram' }
    }
    if (hoursSinceLastSeen > 48 || input.activeDays7d <= 1) {
      return { risk: 'medium' as const, riskLabel: 'Середній', nextAction: 'Мʼяке нагадування сьогодні' }
    }
    return { risk: 'low' as const, riskLabel: 'Низький', nextAction: 'Тримати темп і спостерігати' }
  }

  if (input.trialEndsAt) {
    const hoursToTrialEnd = (input.trialEndsAt.getTime() - now.getTime()) / 3600000
    if (hoursToTrialEnd <= 0) {
      return { risk: 'high' as const, riskLabel: 'Тріал завершено', nextAction: 'Запропонувати оплату / реактивацію' }
    }
    if (hoursToTrialEnd <= 24) {
      return { risk: 'high' as const, riskLabel: 'Фінальний день', nextAction: 'Персональний дожим до оплати' }
    }
  }

  if (hoursSinceLastSeen > 72 || input.actions7d <= 1) {
    return { risk: 'high' as const, riskLabel: 'Високий', nextAction: 'Особистий дотик коуча' }
  }
  if (hoursSinceLastSeen > 36 || input.activeDays7d <= 2) {
    return { risk: 'medium' as const, riskLabel: 'Середній', nextAction: 'Підсилити наступний крок' }
  }
  return { risk: 'low' as const, riskLabel: 'Низький', nextAction: 'Показати наступну ціль' }
}

export async function getUserInsights(viewer: ViewerContext, limit = 40): Promise<UserInsightItem[]> {
  const scopedExpertId =
    viewer.role === 'EXPERT' || viewer.role === 'ADMIN'
      ? await resolveViewerScopedExpertId({
          userId: viewer.userId,
          role: viewer.role,
          expertId: viewer.expertId ?? null,
        })
      : null

  const where =
    viewer.role === 'EXPERT' || viewer.role === 'ADMIN'
      ? { deletedAt: null, role: Role.USER, expertId: scopedExpertId ?? '__missing_expert__' }
      : { deletedAt: null }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      email: true,
            firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      telegramUserName: true,
      telegramLinkedAt: true,
      trialEndsAt: true,
      funnelLeads: {
        select: { source: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
      subscriptions: {
        select: {
          status: true,
          trialEndsAt: true,
          product: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      streaks: {
        select: { current: true, lastAt: true },
        orderBy: { lastAt: 'desc' },
        take: 1,
      },
      userMentors: {
        select: { lastInteractionAt: true },
        orderBy: { lastInteractionAt: 'desc' },
        take: 1,
      },
      notificationPreference: {
        select: {
          telegramEnabled: true,
        },
      },
    },
  })

  const userIds = users.map((user) => user.id)
  const periodStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const events = userIds.length
    ? await prisma.event.findMany({
        where: {
          userId: { in: userIds },
          createdAt: { gte: periodStart },
        },
        select: {
          userId: true,
          type: true,
          source: true,
          state: true,
          createdAt: true,
          payload: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const eventsByUser = new Map<string, EventRecord[]>()
  for (const event of events) {
    if (!event.userId) continue
    const bucket = eventsByUser.get(event.userId) ?? []
    bucket.push(event)
    eventsByUser.set(event.userId, bucket)
  }

  return users.map((user) => {
    const userEvents = eventsByUser.get(user.id) ?? []
    const latestEvent = userEvents[0]
    const subscription = user.subscriptions[0]
    const streak = user.streaks[0]
    const mentorState = user.userMentors[0]
    const activity = buildActivitySummary(userEvents)

    const lastSeenCandidates = [
      user.lastLoginAt,
      user.telegramLinkedAt,
      latestEvent?.createdAt ?? null,
      mentorState?.lastInteractionAt ?? null,
      streak?.lastAt ?? null,
    ].filter((value): value is Date => Boolean(value))
    const lastSeenAt = lastSeenCandidates.length
      ? new Date(Math.max(...lastSeenCandidates.map((value) => value.getTime())))
      : null

    const risk = buildRisk({
      lastSeenAt,
      trialEndsAt: subscription?.trialEndsAt ?? user.trialEndsAt ?? null,
      subscriptionStatus: subscription?.status ?? null,
      actions7d: activity.actions7d,
      activeDays7d: activity.activeDays7d,
    })

    return {
      id: user.id,
      email: user.email,
      name: user.firstName || user.firstName || user.telegramUserName || user.email,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      telegramUserName: user.telegramUserName,
      source: normalizeSource(user.funnelLeads[0]?.source ?? latestEvent?.source ?? null),
      accessLabel: buildAccessLabel({
        subscriptionStatus: subscription?.status ?? null,
        subscriptionProduct: subscription?.product?.name ?? null,
        trialEndsAt: subscription?.trialEndsAt ?? user.trialEndsAt ?? null,
      }),
      activityLabel: activity.activityLabel,
      viewedSummary: activity.viewedSummary,
      risk: risk.risk,
      riskLabel: risk.riskLabel,
      nextAction: risk.nextAction,
      streakDays: streak?.current ?? 0,
      actions7d: activity.actions7d,
      activeDays7d: activity.activeDays7d,
      estimatedMinutes7d: activity.estimatedMinutes7d,
      botMessagesEnabled: user.notificationPreference?.telegramEnabled ?? true,
      isLeadOnly: user.email.startsWith('telegram-guest-'),
    }
  })
}

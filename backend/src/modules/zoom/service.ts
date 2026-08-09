// backend/src/modules/zoom/service.ts
import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js'
import { FOCUS_PRODUCT_CODE } from '@/products/focus/config/focus.constants.js'
import {
  NotificationType,
  Prisma,
  SwapStatus,
  ZoomSessionType,
  ZoomSlotStatus,
  ZoomStatus,
  ZoomSwapStatus,
} from '@starway/db/prisma-client'
import { createHash } from 'node:crypto'
import type { Telegraf } from 'telegraf'
import { prisma } from '../../db/client.js'
import { getCachedLatestWeeklyReport } from '../../lib/db/weeklyReportCache.js'
import {
  bot,
  getBotLink,
  sendDedupedTelegramMessage,
  sendOpsTelegramMessage,
} from '../../lib/telegram.js'
import { NotificationEvent } from '../../services/notifications/NotificationEvent.js'
import { activateAbsystemTrialAfterFirstZoom } from '../access/service.js'
import {
  FOCUS_PRODUCT_CODES,
  getUserAccessState,
} from '../subscriptions/payments/focus.access.js'
import { buildShortWayForPayCheckoutUrl } from '../subscriptions/payments/wayforpay.checkout.js'
import { buildPaymentRequest } from '../subscriptions/payments/wayforpay.js'
import type {
  ZoomAttendeeWithUser,
  ZoomSession,
  ZoomSessionAttendee,
} from './types.js'
import { buildZoomCalendarUrl } from './urls.js'
import { parseZoomPostReport } from './zoomPostReport.types.js'

function isGroupPracticeRequest(requests: unknown): boolean {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object')
    return false
  return (requests as Record<string, unknown>).type === 'group_practice'
}

function getSafeName(firstName?: string | null): string {
  if (!firstName) return ''
  const trimmed = firstName
    .replace(/[<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
  if (!trimmed) return ''

  const lowered = trimmed.toLowerCase()
  const blocked = new Set([
    'undefined',
    'null',
    'user',
    'test',
    'admin',
    'bot',
    'учень',
    'coach',
  ])
  if (blocked.has(lowered)) return ''
  if (lowered.startsWith('telegram-guest')) return ''
  if (/^\d+$/.test(trimmed)) return ''
  if (trimmed.length < 2) return ''

  return trimmed
}

const KYIV_TIME_ZONE = 'Europe/Kyiv'
const CHANNEL_POST_SYNC_TTL_MS = 60_000
const WEEKLY_LIMIT = 3
const WEEKLY_PRIVATE_LIMIT_MESSAGE =
  'Цього тижня всі слоти зайняті. Запропонувати наступний тиждень?'

let channelPostSyncInFlight: Promise<void> | null = null
let lastChannelPostSyncSignature = ''
let lastChannelPostSyncAt = 0
let lastChannelPostContentHash = ''

function resolveZoomCalendarUrl(params?: {
  intent?: string | null
  sessionId?: string | null
}): string {
  return buildZoomCalendarUrl(params)
}

function canUseTelegramWebAppButton(url: string | null | undefined): boolean {
  return Boolean(
    url &&
    url.startsWith('https://') &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1')
  )
}

function getKyivNow(now = new Date()): Date {
  return new Date(now.toLocaleString('en-US', { timeZone: KYIV_TIME_ZONE }))
}

function startOfKyivWeek(now = new Date()): Date {
  const date = getKyivNow(now)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfKyivWeek(now = new Date()): Date {
  const date = startOfKyivWeek(now)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfKyivDay(now = new Date()): Date {
  const date = getKyivNow(now)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfRollingKyivWindow(now = new Date(), days = 14): Date {
  const date = startOfKyivDay(now)
  date.setDate(date.getDate() + days)
  return date
}

function getKyivDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function extractZoomLinkFromRequests(requests: unknown): string {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object')
    return ''
  const meta = requests as Record<string, unknown>
  return typeof meta.zoomLink === 'string' ? meta.zoomLink : ''
}

function resolveRequestedSessionType(requests: unknown): string | null {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object')
    return null
  const rawType = (requests as Record<string, unknown>).type
  return typeof rawType === 'string' ? rawType.trim().toLowerCase() : null
}

type TrialZoomSessionCandidate = {
  id: string
  scheduledAt: Date
  requests?: unknown
  type?: ZoomSessionType
}

export function selectTrialZoomEligibleSession<
  T extends TrialZoomSessionCandidate,
>(sessions: T[], trialEndsAt: Date | null): T | null {
  if (!trialEndsAt) return null

  const targetDateKey = getKyivDateKey(trialEndsAt)
  const matchingSessions = sessions
    .filter((session) => {
      const sessionType =
        resolveRequestedSessionType(session.requests) ??
        String(session.type ?? '')
          .trim()
          .toLowerCase()
      return (
        sessionType === 'group_practice' &&
        getKyivDateKey(session.scheduledAt) === targetDateKey
      )
    })
    .sort(
      (left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()
    )

  return matchingSessions[0] ?? null
}

async function countWeeklyPrivateSessions(
  expertId: string,
  anchorDate: Date
): Promise<number> {
  const weekStart = startOfKyivWeek(anchorDate)
  const weekEnd = endOfKyivWeek(anchorDate)

  return prisma.zoomSession.count({
    where: {
      expertId,
      type: ZoomSessionType.PRIVATE,
      status: { not: ZoomStatus.CANCELLED },
      scheduledAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  })
}

async function assertWeeklyPrivateLimit(
  expertId: string,
  anchorDate: Date
): Promise<void> {
  const weeklyCount = await countWeeklyPrivateSessions(expertId, anchorDate)
  if (weeklyCount >= WEEKLY_LIMIT) {
    throw new Error(WEEKLY_PRIVATE_LIMIT_MESSAGE)
  }
}

export async function isActiveFocusSubscriber(
  userId: string
): Promise<boolean> {
  const now = new Date()
  const subscription = await prisma.productSubscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      product: {
        code: FOCUS_PRODUCT_CODE,
      },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  })

  return Boolean(subscription)
}

export async function getCurrentWeekZoomOverview(args: {
  userId: string
  role: 'coach' | 'user'
  expertId?: string | null
  now?: Date
}): Promise<{
  week: { from: string; to: string; timezone: string }
  sessions: Array<{
    id: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    zoomLink: string
    attendeesCount: number
    questionPreviews: string[]
    questionsCount: number
    remainingQuestionsCount: number
    isMyBooking: boolean
    audioFileId: string | null
    hasAudio: boolean
  }>
  audios: Array<{
    sessionId: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    audioFileId: string
  }>
}> {
  const from = startOfKyivDay(args.now)
  const to = endOfRollingKyivWindow(args.now)
  const sessions = await getCalendarSessions({
    from,
    to,
    role: args.role,
    userId: args.userId,
    expertId: args.expertId ?? undefined,
  })
  const questionSummaries = await getQuestionSummariesBySessionId(
    sessions.map((session) => session.id)
  )

  const normalized = sessions.map((session) => {
    const meta =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount =
      (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)
    const questionSummary = questionSummaries.get(session.id)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string'
        ? meta.type
        : session.type) as ZoomSessionType,
      zoomLink,
      attendeesCount,
      questionPreviews: questionSummary?.questionPreviews ?? [],
      questionsCount: questionSummary?.questionsCount ?? 0,
      remainingQuestionsCount: questionSummary?.remainingQuestionsCount ?? 0,
      isMyBooking: Boolean((session as { isMyBooking?: boolean }).isMyBooking),
      audioFileId: report?.audioFileId ?? null,
      hasAudio: Boolean(report?.audioFileId),
    }
  })

  const audios = normalized
    .filter((session) => Boolean(session.audioFileId))
    .map((session) => ({
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
      topic: session.topic,
      status: session.status,
      type: session.type,
      audioFileId: String(session.audioFileId),
    }))

  return {
    week: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: KYIV_TIME_ZONE,
    },
    sessions: normalized.sort(
      (left, right) =>
        new Date(left.scheduledAt).getTime() -
        new Date(right.scheduledAt).getTime()
    ),
    audios,
  }
}

export async function getPublicCurrentWeekZoomOverview(
  now = new Date()
): Promise<{
  week: { from: string; to: string; timezone: string }
  sessions: Array<{
    id: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    zoomLink: string
    attendeesCount: number
    isMyBooking: boolean
    audioFileId: string | null
    hasAudio: boolean
  }>
  audios: Array<{
    sessionId: string
    scheduledAt: string
    topic: string
    status: ZoomStatus
    type: ZoomSessionType
    audioFileId: string
  }>
}> {
  const from = startOfKyivDay(now)
  const to = endOfRollingKyivWindow(now)
  const sessions = await prisma.zoomSession.findMany({
    where: {
      scheduledAt: { gte: from, lt: to },
      status: { not: ZoomStatus.CANCELLED },
      requests: {
        path: ['type'],
        equals: 'group_practice',
      },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  const normalized = sessions.map((session) => {
    const meta =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}
    const report = parseZoomPostReport(session.postSessionReport)
    const attendeesCount =
      (session as { _count?: { attendees?: number } })._count?.attendees ?? 0
    const zoomLink = extractZoomLinkFromRequests(session.requests)

    return {
      id: session.id,
      scheduledAt: session.scheduledAt.toISOString(),
      topic: session.topic,
      status: session.status,
      type: (typeof meta.type === 'string'
        ? meta.type
        : session.type) as ZoomSessionType,
      zoomLink,
      attendeesCount,
      isMyBooking: false,
      audioFileId: report?.audioFileId ?? null,
      hasAudio: Boolean(report?.audioFileId),
    }
  })

  const audios = normalized
    .filter((session) => Boolean(session.audioFileId))
    .map((session) => ({
      sessionId: session.id,
      scheduledAt: session.scheduledAt,
      topic: session.topic,
      status: session.status,
      type: session.type,
      audioFileId: String(session.audioFileId),
    }))

  return {
    week: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: KYIV_TIME_ZONE,
    },
    sessions: normalized,
    audios,
  }
}

export async function createZoomSession(
  expertId: string,
  scheduledAt: Date,
  topic: string,
  requests: any[] = []
): Promise<ZoomSession> {
  if (resolveRequestedSessionType(requests) === 'individual') {
    await assertWeeklyPrivateLimit(expertId, scheduledAt)
  }

  console.log('[zoom/service createZoomSession] input:', {
    expertId,
    scheduledAt: scheduledAt?.toISOString?.() ?? String(scheduledAt),
    topic,
    type:
      requests && typeof requests === 'object' && !Array.isArray(requests)
        ? ((requests as Record<string, unknown>).type ?? null)
        : null,
  })
  let session: ZoomSession
  try {
    session = await prisma.zoomSession.create({
      data: {
        expertId, // ← прямий expertId (найпростіший і найшвидший спосіб)
        scheduledAt,
        topic,
        requests: requests as Prisma.InputJsonValue,
        status: ZoomStatus.SCHEDULED,
      },
    })
  } catch (err) {
    console.error('[zoom/service createZoomSession] ERROR:', err)
    throw err
  }
  console.log('[zoom/service createZoomSession] created:', session.id)

  void afterZoomOperation(bot, {
    operation: 'create',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  if (isGroupPracticeRequest(session.requests)) {
    void notifySubscribersNewSession(bot, session).catch((err) =>
      console.error('[zoom] notify failed:', err)
    )
  }

  return session
}

export async function getUpcomingZoom(): Promise<ZoomSession | null> {
  return prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: new Date() },
      status: ZoomStatus.SCHEDULED,
    },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function getUpcomingZoomBookingView(userId: string) {
  const session = await prisma.zoomSession.findFirst({
    where: {
      scheduledAt: { gte: new Date() },
      status: ZoomStatus.SCHEDULED,
    },
    include: {
      _count: { select: { attendees: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  if (!session) return null

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId: session.id,
        userId,
      },
    },
    select: { id: true },
  })

  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'ZOOM_BOOKING_QUESTION',
    },
    select: {
      userId: true,
      payload: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const effectiveQuestions = new Map<
    string,
    { userId: string; text: string; createdAt: Date }
  >()

  for (const event of questionEvents) {
    if (!event.userId) continue
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
      continue
    }

    const payload = event.payload as Record<string, unknown>
    if (payload.sessionId !== session.id) continue

    const questionText =
      typeof payload.questionText === 'string' ? payload.questionText.trim() : ''

    if (!questionText) continue

    effectiveQuestions.set(event.userId, {
      userId: event.userId,
      text: questionText,
      createdAt: event.createdAt,
    })
  }

  const orderedQuestions = [...effectiveQuestions.values()].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  )

  const myQuestionIndex = orderedQuestions.findIndex(
    (question) => question.userId === userId,
  )

  const otherQuestions = orderedQuestions.filter(
    (question) => question.userId !== userId,
  )

  return {
    ...session,
    attendeesCount: session._count.attendees,
    isMyBooking: Boolean(attendee),
    myQuestion:
      myQuestionIndex >= 0
        ? {
            text: orderedQuestions[myQuestionIndex].text,
            position: myQuestionIndex + 1,
          }
        : null,
    questionPreviews: otherQuestions.slice(0, 3).map((question) => question.text),
    questionsCount: orderedQuestions.length,
    remainingQuestionsCount: Math.max(otherQuestions.length - 3, 0),
  }
}

export async function getZoomBookingNotificationContext(
  userId: string,
  sessionId: string
) {
  const [session, user, attendeesCount, questionEvents] = await Promise.all([
    prisma.zoomSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        topic: true,
        scheduledAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        telegramUserName: true,
      },
    }),
    prisma.zoomSessionAttendee.count({
      where: { sessionId },
    }),
    prisma.event.findMany({
      where: {
        type: 'ZOOM_BOOKING_QUESTION',
      },
      select: {
        userId: true,
        payload: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  if (!session || !user) return null

  const effectiveQuestions = new Map<
    string,
    { userId: string; text: string; createdAt: Date }
  >()

  for (const event of questionEvents) {
    if (!event.userId) continue
    if (!event.payload || typeof event.payload !== 'object' || Array.isArray(event.payload)) {
      continue
    }

    const payload = event.payload as Record<string, unknown>
    if (payload.sessionId !== sessionId) continue

    const questionText =
      typeof payload.questionText === 'string' ? payload.questionText.trim() : ''

    if (!questionText) continue

    effectiveQuestions.set(event.userId, {
      userId: event.userId,
      text: questionText,
      createdAt: event.createdAt,
    })
  }

  const orderedQuestions = [...effectiveQuestions.values()].sort(
    (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
  )

  const myQuestionIndex = orderedQuestions.findIndex(
    (question) => question.userId === userId,
  )

  const myQuestion =
    myQuestionIndex >= 0
      ? {
          text: orderedQuestions[myQuestionIndex].text,
          position: myQuestionIndex + 1,
        }
      : null

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Учасник'

  return {
    session,
    displayName,
    username: user.telegramUserName?.trim() || null,
    attendeesCount,
    myQuestion,
  }
}

export async function registerAttendee(
  userId: string,
  sessionId: string
): Promise<ZoomSessionAttendee> {
  return prisma.zoomSessionAttendee.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { userId, sessionId },
    update: {},
  })
}

export async function assertCanBookGroupPracticeSession(args: {
  userId: string
  sessionId: string
}): Promise<void> {
  const { userId, sessionId } = args
  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })

  if (!session) throw new Error('session_not_found')
  if (session.status !== ZoomStatus.SCHEDULED) {
    throw new Error('session_unavailable')
  }

  const existingAttendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (existingAttendee) {
    return
  }

  if (session._count.attendees >= session.capacity) {
    throw new Error('slot_full')
  }
}

export async function saveBookingQuestionForAttendee(
  userId: string,
  sessionId: string,
  questionText: string
): Promise<{ id: string; createdAt: Date }> {
  const normalizedQuestionText = questionText.trim()
  if (!normalizedQuestionText) {
    throw new Error('questionText required')
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!attendee) {
    throw new Error('booking_not_found')
  }

  const event = await prisma.event.create({
    data: {
      userId,
      type: 'ZOOM_BOOKING_QUESTION',
      source: 'web',
      payload: {
        sessionId,
        questionText: normalizedQuestionText,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return event
}

export async function saveBookingPreparationForAttendee(
  userId: string,
  sessionId: string,
  preparationAnswer: string
): Promise<{ id: string; createdAt: Date }> {
  const normalizedPreparationAnswer = preparationAnswer.trim()
  if (!normalizedPreparationAnswer) {
    throw new Error('preparationAnswer required')
  }

  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: {
        sessionId,
        userId,
      },
    },
    select: {
      id: true,
    },
  })

  if (!attendee) {
    throw new Error('booking_not_found')
  }

  const event = await prisma.event.create({
    data: {
      userId,
      type: 'ZOOM_BOOKING_PREPARATION',
      source: 'web',
      payload: {
        sessionId,
        preparationAnswer: normalizedPreparationAnswer,
      },
    },
    select: {
      id: true,
      createdAt: true,
    },
  })

  return event
}

export async function autoBookAllUpcomingGroupSessions(
  userId: string
): Promise<void> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: new Date() },
      OR: [
        { type: ZoomSessionType.GROUP },
        { requests: { path: ['type'], equals: 'group_practice' } },
      ],
    },
    select: { id: true },
    orderBy: { scheduledAt: 'asc' },
  })

  for (const session of sessions) {
    await registerAttendee(userId, session.id)
  }
}

export async function markAttended(
  attendeeId: string,
  attendedAt = new Date()
): Promise<ZoomSessionAttendee> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.zoomSessionAttendee.findUnique({
      where: { id: attendeeId },
    })

    if (!current) {
      throw new Error('ATTENDEE_NOT_FOUND')
    }

    if (current.attended) {
      return current
    }

    const attendee = await tx.zoomSessionAttendee.update({
      where: { id: attendeeId },
      data: { attended: true },
    })

    await activateAbsystemTrialAfterFirstZoom({
      userId: attendee.userId,
      attendedAt,
      tx,
    })

    return attendee
  })
}

export async function savePostSessionReport(
  sessionId: string,
  report: Prisma.InputJsonValue
): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { postSessionReport: report, status: ZoomStatus.COMPLETED },
  })
}

export type PreviousZoomSessionRecap = {
  id: string
  title: string | null
  startsAt: string
  endsAt: string | null
  summary: string | null
  recordingUrl: string | null
  materialsUrl: string | null
  attendanceStatus: string | null
  attendanceCount: number
  nextStep: string | null
}

export type ZoomWeeklyReportSummary = {
  id: string
  weekStart: string
  weekEnd: string
  generatedAt: string
  summary: string | null
  progress: string | null
  achievement: string | null
  blocker: string | null
  nextStep: string | null
  detailsAvailable: boolean
}

type BookingQuestionEventPayload = {
  sessionId?: string
  questionText?: string
}

function parseBookingQuestionPayload(
  payload: unknown
): BookingQuestionEventPayload {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return {}
  }

  return payload as BookingQuestionEventPayload
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item ?? '').trim()).filter(Boolean)
}

function dedupeQuestionTexts(questionTexts: string[]): string[] {
  const seen = new Set<string>()

  return questionTexts.filter((questionText) => {
    const normalized = questionText.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) {
      return false
    }

    seen.add(normalized)
    return true
  })
}

async function getQuestionSummariesBySessionId(sessionIds: string[]) {
  if (sessionIds.length === 0) {
    return new Map<
      string,
      {
        questionPreviews: string[]
        questionsCount: number
        remainingQuestionsCount: number
      }
    >()
  }

  const questionEvents = await prisma.event.findMany({
    where: {
      type: 'ZOOM_BOOKING_QUESTION',
      OR: sessionIds.map((sessionId) => ({
        payload: {
          path: ['sessionId'],
          equals: sessionId,
        },
      })),
    },
    select: {
      payload: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const questionsBySessionId = new Map<string, string[]>()

  for (const event of questionEvents) {
    const payload = parseBookingQuestionPayload(event.payload)
    const sessionId =
      typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
    const questionText =
      typeof payload.questionText === 'string'
        ? payload.questionText.trim()
        : ''
    if (!sessionId || !questionText) {
      continue
    }

    const currentQuestions = questionsBySessionId.get(sessionId) ?? []
    currentQuestions.push(questionText)
    questionsBySessionId.set(sessionId, currentQuestions)
  }

  const summaries = new Map<
    string,
    {
      questionPreviews: string[]
      questionsCount: number
      remainingQuestionsCount: number
    }
  >()
  const sessionsWithStarterQuestions = await prisma.zoomSession.findMany({
    where: {
      id: { in: sessionIds },
    },
    select: {
      id: true,
      requests: true,
    },
  })

  const starterQuestionsBySessionId = new Map<string, string[]>()

  for (const session of sessionsWithStarterQuestions) {
    const requests =
      session.requests &&
      typeof session.requests === 'object' &&
      !Array.isArray(session.requests)
        ? (session.requests as Record<string, unknown>)
        : {}

    const starterQuestions = Array.isArray(requests.starterQuestions)
      ? requests.starterQuestions
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter(Boolean)
      : []

    starterQuestionsBySessionId.set(session.id, starterQuestions)
  }
  for (const sessionId of sessionIds) {
    const starterQuestions = starterQuestionsBySessionId.get(sessionId) ?? []

    const userQuestions = questionsBySessionId.get(sessionId) ?? []

    const questions = dedupeQuestionTexts([
      ...starterQuestions,
      ...userQuestions,
    ])

    summaries.set(sessionId, {
      questionPreviews: questions,
      questionsCount: questions.length,
      remainingQuestionsCount: Math.max(questions.length - 3, 0),
    })
  }

  return summaries
}

export async function getUserPreviousZoomSessionRecap(
  userId: string,
  now = new Date()
): Promise<PreviousZoomSessionRecap | null> {
  const session = await prisma.zoomSession.findFirst({
    where: {
      status: ZoomStatus.COMPLETED,
      scheduledAt: { lte: now },
      OR: [
        { requests: { path: ['type'], equals: 'group_practice' } },
        { type: ZoomSessionType.GROUP },
      ],
    },
    include: {
      _count: {
        select: {
          attendees: true,
        },
      },
      attendees: {
        where: {
          userId,
        },
        select: {
          attended: true,
        },
        take: 1,
      },
    },
    orderBy: {
      scheduledAt: 'desc',
    },
  })

  if (!session) {
    return null
  }

  const report = parseZoomPostReport(session.postSessionReport)
  const explicitTitle = session.topic.trim()
  const fallbackTitle = `Zoom-практика за ${session.scheduledAt.toLocaleDateString(
    'uk-UA',
    {
      day: 'numeric',
      month: 'long',
      timeZone: KYIV_TIME_ZONE,
    }
  )}`
  const attendee = session.attendees[0] ?? null

  return {
    id: session.id,
    title: explicitTitle || fallbackTitle,
    startsAt: session.scheduledAt.toISOString(),
    endsAt: null,
    summary: report?.summary?.trim() || null,
    recordingUrl: report?.audioUrl?.trim() || null,
    materialsUrl: null,
    attendanceStatus: attendee
      ? attendee.attended
        ? 'ATTENDED'
        : 'BOOKED'
      : null,
    attendanceCount: session._count.attendees,
    nextStep:
      report?.actionItems?.[0]?.trim() || report?.nextFocus?.trim() || null,
  }
}

export async function getUserLatestWeeklyReportSummary(
  userId: string
): Promise<ZoomWeeklyReportSummary | null> {
  const report = await getCachedLatestWeeklyReport(userId)
  if (!report) {
    return null
  }

  const topInsights = normalizeStringList(report.topInsights)
  const struggleAreas = normalizeStringList(report.struggleAreas)
  const nextWeekTasks = normalizeStringList(report.nextWeekTasks)
  const metrics =
    report.metrics &&
    typeof report.metrics === 'object' &&
    !Array.isArray(report.metrics)
      ? (report.metrics as Record<string, unknown>)
      : {}
  const analysis =
    report.analysis &&
    typeof report.analysis === 'object' &&
    !Array.isArray(report.analysis)
      ? (report.analysis as Record<string, unknown>)
      : {}

  const tasksDone =
    typeof metrics.tasksDone === 'number' ? metrics.tasksDone : null
  const tasksTotal =
    typeof metrics.tasksTotal === 'number' ? metrics.tasksTotal : null
  const reflections =
    typeof metrics.reflections === 'number' ? metrics.reflections : null
  const sessions =
    typeof metrics.sessions === 'number' ? metrics.sessions : null

  const progressParts = [
    tasksDone !== null && tasksTotal !== null
      ? `Виконано ${tasksDone}/${tasksTotal} задач`
      : null,
    reflections !== null ? `${reflections} рефлексій` : null,
    sessions !== null ? `${sessions} AI-сесій` : null,
  ].filter(Boolean)

  return {
    id: report.id,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    generatedAt: report.createdAt.toISOString(),
    summary:
      typeof report.summaryText === 'string' && report.summaryText.trim()
        ? report.summaryText.trim()
        : null,
    progress: progressParts[0] ?? null,
    achievement: topInsights[0] ?? null,
    blocker:
      struggleAreas[0] ??
      (typeof analysis.mainPainThisWeek === 'string' &&
      analysis.mainPainThisWeek.trim()
        ? analysis.mainPainThisWeek.trim()
        : null),
    nextStep:
      typeof report.nextWeekFocus === 'string' && report.nextWeekFocus.trim()
        ? report.nextWeekFocus.trim()
        : (nextWeekTasks[0] ?? null),
    detailsAvailable: true,
  }
}

export async function getSessionAttendees(
  sessionId: string
): Promise<ZoomAttendeeWithUser[]> {
  return prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  })
}

export async function getCalendarSessions(args: {
  from: Date
  to: Date
  role: 'coach' | 'user'
  userId: string
  expertId?: string
}): Promise<
  (ZoomSession & { _count: { attendees: number }; isMyBooking?: boolean })[]
> {
  const { from, to, role, userId, expertId } = args

  if (role === 'coach') {
    return prisma.zoomSession.findMany({
      where: { expertId, scheduledAt: { gte: from, lte: to } },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })
  }

  if (!expertId) {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const bookedIds = new Set(
      (
        await prisma.zoomSessionAttendee.findMany({
          where: {
            userId,
            sessionId: { in: sessions.map((session) => session.id) },
          },
          select: { sessionId: true },
        })
      ).map((attendee) => attendee.sessionId)
    )

    return sessions.map((session) => ({
      ...session,
      isMyBooking: bookedIds.has(session.id),
    }))
  }

  const zoomAccess = await getUserAccessState(userId)
  const userIsSubscriber = zoomAccess.state === 'FOCUS_ACTIVE'

  if (zoomAccess.state === 'PREMIUM') {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        expertId,
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const eligibleSession = selectTrialZoomEligibleSession(
      sessions,
      zoomAccess.expiresAt
    )
    if (!eligibleSession) {
      return []
    }

    const attendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: {
          sessionId: eligibleSession.id,
          userId,
        },
      },
      select: {
        id: true,
      },
    })

    return [{ ...eligibleSession, isMyBooking: Boolean(attendee) }]
  }

  if (!userIsSubscriber) {
    const sessions = await prisma.zoomSession.findMany({
      where: {
        expertId,
        scheduledAt: { gte: from, lte: to },
        status: { not: ZoomStatus.CANCELLED },
        OR: [
          { requests: { path: ['type'], equals: 'group_practice' } },
          { type: ZoomSessionType.GROUP },
        ],
      },
      include: { _count: { select: { attendees: true } } },
      orderBy: { scheduledAt: 'asc' },
    })

    const bookedIds = new Set(
      (
        await prisma.zoomSessionAttendee.findMany({
          where: {
            userId,
            sessionId: { in: sessions.map((session) => session.id) },
          },
          select: { sessionId: true },
        })
      ).map((attendee) => attendee.sessionId)
    )

    return sessions.map((session) => ({
      ...session,
      isMyBooking: bookedIds.has(session.id),
    }))
  }

  // Show all expert sessions, flagging which ones the user booked
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId,
      scheduledAt: { gte: from, lte: to },
      status: { not: ZoomStatus.CANCELLED },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  const bookedIds = new Set(
    (
      await prisma.zoomSessionAttendee.findMany({
        where: { userId, sessionId: { in: sessions.map((s) => s.id) } },
        select: { sessionId: true },
      })
    ).map((a) => a.sessionId)
  )

  return sessions.map((s) => ({ ...s, isMyBooking: bookedIds.has(s.id) }))
}

export async function updateSession(
  sessionId: string,
  patch: {
    scheduledAt?: Date
    topic?: string
    requests?: Prisma.InputJsonValue
  }
): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: patch,
  })
  void afterZoomOperation(bot, {
    operation: 'update',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
  return session
}

export async function cancelSession(sessionId: string): Promise<ZoomSession> {
  const session = await prisma.zoomSession.update({
    where: { id: sessionId },
    data: { status: ZoomStatus.CANCELLED },
  })

  void afterZoomOperation(bot, {
    operation: 'cancel',
    sessionId: session.id,
    affectedUserIds: [],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return session
}

export async function createFullSession(
  data: {
    expertId?: string
    scheduledAt: Date
    topic: string
    requests: Prisma.InputJsonValue
  },
  options?: {
    suppressAutomation?: boolean
    suppressSessionNotification?: boolean
  }
): Promise<ZoomSession> {
  console.log('[zoom/service createFullSession] input:', {
    expertId: data.expertId ?? null,
    scheduledAt: data.scheduledAt?.toISOString?.() ?? String(data.scheduledAt),
    topic: data.topic,
    type:
      data.requests &&
      typeof data.requests === 'object' &&
      !Array.isArray(data.requests)
        ? ((data.requests as Record<string, unknown>).type ?? null)
        : null,
  })
  let session: ZoomSession
  try {
    session = await prisma.zoomSession.create({
      data: { ...data, status: ZoomStatus.SCHEDULED },
    })
  } catch (err) {
    console.error('[zoom/service createFullSession] ERROR:', err)
    throw err
  }
  console.log('[zoom/service createFullSession] created:', session.id)
  if (!options?.suppressAutomation) {
    void afterZoomOperation(bot, {
      operation: 'create',
      sessionId: session.id,
      affectedUserIds: [],
    }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
  }

  if (
    isGroupPracticeRequest(session.requests) &&
    !options?.suppressSessionNotification
  ) {
    void notifySubscribersNewSession(bot, session).catch((err) =>
      console.error('[zoom] notify failed:', err)
    )
  }
  return session
}

export async function getSessionById(id: string): Promise<ZoomSession | null> {
  return prisma.zoomSession.findUnique({ where: { id } })
}

export async function getAllUpcomingSessionsForNotification(
  before: Date
): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: { status: ZoomStatus.SCHEDULED, scheduledAt: { lte: before } },
    orderBy: { scheduledAt: 'asc' },
  })
}

export async function getUpcomingGroupSessions(
  limit: number
): Promise<ZoomSession[]> {
  return prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    orderBy: { scheduledAt: 'asc' },
    take: Math.max(1, limit),
  })
}

export async function getAvailableSlotsForUser(userId: string): Promise<
  Array<{
    id: string
    date: string
    hour: number
    bookedCount: number
    isBooked: boolean
  }>
> {
  const now = new Date()
  const startOfToday = startOfKyivDay(now)
  const nextFourteenDays = endOfRollingKyivWindow(now)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: startOfToday, lt: nextFourteenDays },
      requests: { path: ['type'], equals: 'group_practice' },
    },
    include: {
      _count: { select: { attendees: true } },
      attendees: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return sessions
    .map((session) => {
      const meta = (session.requests as Record<string, unknown>) ?? {}
      const maxSlots = typeof meta.maxSlots === 'number' ? meta.maxSlots : 50
      const deadlineHours =
        typeof meta.bookingDeadlineHours === 'number'
          ? meta.bookingDeadlineHours
          : 24
      const deadline = new Date(
        session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000
      )
      const bookedCount = session._count.attendees
      const isBooked = session.attendees.length > 0
      const isOpen = bookedCount < maxSlots && now < deadline

      if (!isOpen) return null

      return {
        id: session.id,
        date: session.scheduledAt.toISOString(),
        hour: session.scheduledAt.getHours(),
        bookedCount,
        isBooked,
      }
    })
    .filter(
      (
        slot
      ): slot is {
        id: string
        date: string
        hour: number
        bookedCount: number
        isBooked: boolean
      } => Boolean(slot)
    )
}

export async function patchSessionRequests(
  sessionId: string,
  requests: Prisma.InputJsonValue
): Promise<ZoomSession> {
  return prisma.zoomSession.update({
    where: { id: sessionId },
    data: { requests },
  })
}

export async function bookSlot(
  sessionId: string,
  userId: string
): Promise<{ booked: boolean; remainingSlots: number }> {
  const session = await prisma.zoomSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })

  const meta = (session.requests as Record<string, unknown>) ?? {}
  const maxSlots = typeof meta.maxSlots === 'number' ? meta.maxSlots : 50
  const deadlineHours =
    typeof meta.bookingDeadlineHours === 'number'
      ? meta.bookingDeadlineHours
      : 24

  if (session._count.attendees >= maxSlots) throw new Error('slot_full')

  const deadline = new Date(
    session.scheduledAt.getTime() - deadlineHours * 60 * 60 * 1000
  )
  if (new Date() >= deadline) throw new Error('deadline_passed')

  await prisma.zoomSessionAttendee.upsert({
    where: { sessionId_userId: { sessionId, userId } },
    create: { sessionId, userId, attended: false },
    update: {},
  })

  const newCount = await prisma.zoomSessionAttendee.count({
    where: { sessionId },
  })

  if (newCount >= maxSlots) {
    await patchSessionRequests(sessionId, {
      ...meta,
      slotStatus: 'booked',
    } as unknown as Prisma.InputJsonValue)
  }

  void afterZoomOperation(bot, {
    operation: 'book',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { booked: true, remainingSlots: maxSlots - newCount }
}

export async function unbookSlot(
  sessionId: string,
  userId: string
): Promise<void> {
  const session = await prisma.zoomSession.findUniqueOrThrow({
    where: { id: sessionId },
  })

  const cutoff = new Date(session.scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  if (new Date() >= cutoff) throw new Error('too_late')

  await prisma.zoomSessionAttendee.deleteMany({ where: { sessionId, userId } })

  const meta = (session.requests as Record<string, unknown>) ?? {}
  await patchSessionRequests(sessionId, {
    ...meta,
    slotStatus: 'available',
  } as unknown as Prisma.InputJsonValue)

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))
}

async function cancelExistingReminders(
  userId: string,
  sessionId: string
): Promise<void> {
  await prisma.notificationJob.updateMany({
    where: {
      type: NotificationType.AI_REMINDER,
      status: 'PENDING',
      payload: { path: ['userId'], equals: userId },
      OR: [
        { payload: { path: ['payload', 'sessionId'], equals: sessionId } },
        { payload: { path: ['payload', 'session_id'], equals: sessionId } },
      ],
    },
    data: { status: 'FAILED', lastError: 'cancelled_by_zoom_reschedule' },
  })

  console.log(`[cancelReminders] userId=${userId} sessionId=${sessionId}`)
}

export async function scheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown }
): Promise<void> {
  const scheduledAt = new Date(session.scheduledAt)
  const remind24h = new Date(scheduledAt.getTime() - 24 * 60 * 60 * 1000)
  const remind2h = new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000)
  const now = new Date()
  const req =
    !session.requests ||
    Array.isArray(session.requests) ||
    typeof session.requests !== 'object'
      ? {}
      : (session.requests as Record<string, unknown>)

  const jobs: Array<{
    flowTimerId: 'ZOOM_REMINDER_24H' | 'ZOOM_REMINDER_2H'
    runAt: Date
  }> = []
  if (remind24h > now)
    jobs.push({ flowTimerId: 'ZOOM_REMINDER_24H', runAt: remind24h })
  if (remind2h > now)
    jobs.push({ flowTimerId: 'ZOOM_REMINDER_2H', runAt: remind2h })

  if (jobs.length === 0) {
    console.log('[scheduleReminders] всі часи в минулому, jobs не створено')
    return
  }

  for (const job of jobs) {
    const exists = await prisma.notificationJob.findFirst({
      where: {
        type: NotificationType.AI_REMINDER,
        status: 'PENDING',
        payload: { path: ['userId'], equals: userId },
        AND: [
          {
            payload: {
              path: ['payload', 'flow_timer_id'],
              equals: job.flowTimerId,
            },
          },
          { payload: { path: ['payload', 'sessionId'], equals: session.id } },
        ],
      },
      select: { id: true },
    })
    if (exists) continue

    await prisma.notificationJob.create({
      data: {
        type: NotificationType.AI_REMINDER,
        runAt: job.runAt,
        status: 'PENDING',
        payload: {
          event: NotificationEvent.AB_TEST_FOLLOWUP,
          userId,
          payload: {
            flow_timer_id: job.flowTimerId,
            sessionId: session.id,
            topic: session.topic,
            scheduledAt: session.scheduledAt.toISOString(),
            zoomLink: typeof req.zoomLink === 'string' ? req.zoomLink : '',
          },
        } as Prisma.InputJsonValue,
      },
    })
  }

  console.log(
    `[scheduleReminders] userId=${userId} sessionId=${session.id} jobs=${jobs.length}`
  )
}

async function getCoachReminderUserIds(
  expertId: string | null | undefined
): Promise<string[]> {
  if (!expertId) return []

  const coaches = await prisma.user.findMany({
    where: {
      expertId,
      deletedAt: null,
      role: { in: ['EXPERT', 'SUPERADMIN'] },
    },
    select: { id: true },
  })

  return coaches.map((coach) => coach.id)
}

export async function rescheduleReminders(
  userId: string,
  session: { id: string; scheduledAt: Date; topic: string; requests: unknown }
): Promise<void> {
  await cancelExistingReminders(userId, session.id)
  await scheduleReminders(userId, session)
}

async function notifyCoach(
  expertId: string | null | undefined,
  details: { swapId: string }
): Promise<void> {
  if (!expertId) return
  const expertUser = await prisma.user.findFirst({
    where: { expertId },
    select: { telegramChatId: true },
  })
  if (!expertUser?.telegramChatId) return
  await sendDedupedTelegramMessage(
    expertUser.telegramChatId,
    `💱 Відбувся обмін слотами. Swap #${details.swapId}`
  ).catch(() => undefined)
}

function isPrismaTableMissingError(err: unknown): err is { code: string } {
  return (
    err instanceof Error &&
    'code' in err &&
    (err as { code: string }).code === 'P2021'
  )
}

export async function getAvailablePrivateSlots(
  expertId: string,
  from: Date,
  to: Date
) {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId,
      type: ZoomSessionType.PRIVATE,
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gte: from, lte: to },
    },
    include: { _count: { select: { attendees: true } } },
    orderBy: { scheduledAt: 'asc' },
  })

  return sessions
    .map((session) => ({
      session,
      remaining: session.capacity - session._count.attendees,
    }))
    .filter((row) => row.remaining > 0)
}

export async function bookPrivateSlot(userId: string, sessionId: string) {
  const isSubscriber = await isActiveFocusSubscriber(userId)
  if (!isSubscriber) throw new Error('focus_subscription_required')

  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) throw new Error('session_not_found')
  if (session.type !== ZoomSessionType.PRIVATE)
    throw new Error('not_private_session')
  if (!session.expertId) throw new Error('expert_not_found')

  await assertWeeklyPrivateLimit(session.expertId, session.scheduledAt)

  const exists = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    select: { id: true },
  })
  if (exists) throw new Error('already_booked')
  if (session._count.attendees >= session.capacity) throw new Error('slot_full')

  await prisma.zoomSessionAttendee.create({
    data: { sessionId, userId, attended: false },
  })

  void afterZoomOperation(bot, {
    operation: 'book',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { success: true, session }
}

export async function cancelPrivateBooking(userId: string, sessionId: string) {
  const attendee = await prisma.zoomSessionAttendee.findUnique({
    where: { sessionId_userId: { sessionId, userId } },
    include: { session: { select: { scheduledAt: true } } },
  })
  if (!attendee) throw new Error('booking_not_found')

  const minCancellationAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  if (attendee.session.scheduledAt <= minCancellationAt)
    throw new Error('too_late_to_cancel')

  await prisma.zoomSessionAttendee.delete({
    where: { sessionId_userId: { sessionId, userId } },
  })

  void afterZoomOperation(bot, {
    operation: 'unbook',
    sessionId,
    affectedUserIds: [userId],
  }).catch((err) => console.error('[zoom] afterZoomOperation failed:', err))

  return { success: true }
}

function formatPrivateSessionSlotLabel(date: Date): string {
  return date.toLocaleString('uk-UA', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIME_ZONE,
  })
}

export async function getSwapCandidates(
  requesterId: string,
  sessionIdFrom: string
) {
  const sessionFrom = await prisma.zoomSession.findUnique({
    where: { id: sessionIdFrom },
    select: {
      id: true,
      expertId: true,
      scheduledAt: true,
      type: true,
      status: true,
    },
  })
  if (!sessionFrom) throw new Error('session_not_found')
  if (sessionFrom.type !== ZoomSessionType.PRIVATE)
    throw new Error('not_private_session')

  const requesterAttendee = await prisma.zoomSessionAttendee.findUnique({
    where: {
      sessionId_userId: { sessionId: sessionIdFrom, userId: requesterId },
    },
    select: { id: true },
  })
  if (!requesterAttendee) throw new Error('requester_not_attendee')

  const candidateSessions = await prisma.zoomSession.findMany({
    where: {
      expertId: sessionFrom.expertId,
      type: ZoomSessionType.PRIVATE,
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
      id: { not: sessionIdFrom },
      attendees: {
        some: {
          userId: { not: requesterId },
        },
      },
    },
    select: {
      id: true,
      scheduledAt: true,
      topic: true,
      attendees: {
        where: {
          userId: { not: requesterId },
        },
        take: 1,
        select: {
          userId: true,
          user: {
            select: {
              firstName: true,
            },
          },
        },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 12,
  })

  return candidateSessions
    .map((session) => {
      const attendee = session.attendees[0]
      if (!attendee) return null

      return {
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        topic: session.topic,
        targetUserId: attendee.userId,
        targetUserName: getSafeName(attendee.user.firstName) || 'Учасник',
        slotLabel: formatPrivateSessionSlotLabel(session.scheduledAt),
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    )
}

export async function createSwapRequest(
  requesterId: string,
  sessionIdFrom: string,
  options?: {
    targetUserId?: string
    sessionIdTo?: string
    targetUserIds?: string[]
  }
) {
  try {
    const isSubscriber = await isActiveFocusSubscriber(requesterId)
    if (!isSubscriber) throw new Error('focus_subscription_required')

    const sessionFrom = await prisma.zoomSession.findUnique({
      where: { id: sessionIdFrom },
    })
    if (!sessionFrom) throw new Error('session_not_found')
    if (sessionFrom.type !== ZoomSessionType.PRIVATE)
      throw new Error('not_private_session')

    const requesterAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: { sessionId: sessionIdFrom, userId: requesterId },
      },
      select: { id: true },
    })
    if (!requesterAttendee) throw new Error('requester_not_attendee')

    const targetUserId = options?.targetUserId?.trim() || undefined
    const sessionIdTo = options?.sessionIdTo?.trim() || undefined

    if ((targetUserId && !sessionIdTo) || (!targetUserId && sessionIdTo)) {
      throw new Error('swap_target_incomplete')
    }

    if (targetUserId && sessionIdTo) {
      const targetAttendee = await prisma.zoomSessionAttendee.findUnique({
        where: {
          sessionId_userId: { sessionId: sessionIdTo, userId: targetUserId },
        },
        select: {
          id: true,
          user: {
            select: {
              firstName: true,
              telegramChatId: true,
              telegramLinks: {
                where: { isActive: true, chatId: { not: null } },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { chatId: true },
              },
            },
          },
          session: {
            select: {
              id: true,
              type: true,
              status: true,
              expertId: true,
              scheduledAt: true,
            },
          },
        },
      })
      if (!targetAttendee) throw new Error('swap_target_not_found')
      if (targetAttendee.session.type !== ZoomSessionType.PRIVATE)
        throw new Error('not_private_session')
      if (targetAttendee.session.status === ZoomStatus.CANCELLED)
        throw new Error('swap_target_unavailable')
      if (targetAttendee.session.expertId !== sessionFrom.expertId)
        throw new Error('swap_target_mismatch')
      if (targetUserId === requesterId) throw new Error('swap_self_forbidden')

      const duplicate = await prisma.zoomSlotSwapRequest.findFirst({
        where: {
          requesterId,
          sessionIdFrom,
          targetUserId,
          sessionIdTo,
          status: SwapStatus.PENDING,
        },
        select: { id: true },
      })
      if (duplicate) throw new Error('swap_request_already_sent')

      const swap = await prisma.zoomSlotSwapRequest.create({
        data: {
          requesterId,
          sessionIdFrom,
          targetUserId,
          sessionIdTo,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: SwapStatus.PENDING,
        },
      })

      const requesterUser = await prisma.user.findUnique({
        where: { id: requesterId },
        select: { firstName: true },
      })

      const targetChatId =
        targetAttendee.user.telegramChatId ??
        targetAttendee.user.telegramLinks[0]?.chatId ??
        null

      if (targetChatId) {
        const requesterName = getSafeName(requesterUser?.firstName) || 'Учасник'
        await sendDedupedTelegramMessage(
          targetChatId,
          [
            `💱 ${requesterName} пропонує обміняти слот.`,
            '',
            `Її слот: ${formatPrivateSessionSlotLabel(sessionFrom.scheduledAt)}`,
            `Твій слот: ${formatPrivateSessionSlotLabel(targetAttendee.session.scheduledAt)}`,
          ].join('\n'),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Прийняти',
                    callback_data: `zoom:swap:accept:${swap.id}:${sessionIdTo}`,
                  },
                  {
                    text: 'Відхилити',
                    callback_data: `zoom:swap:decline:${swap.id}`,
                  },
                ],
              ],
            },
          }
        ).catch(() => undefined)
      }

      return {
        swapId: swap.id,
        targetUserId,
        sessionIdTo,
        sent: true,
      }
    }

    const candidates = await getSwapCandidates(requesterId, sessionIdFrom)
    return {
      swapId: null,
      candidates,
    }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping createSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function acceptSwapRequest(
  swapId: string,
  acceptorId: string,
  sessionIdTo: string
) {
  try {
    const swap = await prisma.zoomSlotSwapRequest.findUnique({
      where: { id: swapId },
      include: { sessionFrom: true },
    })
    if (!swap) throw new Error('swap_not_found')
    const sessionIdFrom = swap.sessionIdFrom
    if (!sessionIdFrom) throw new Error('swap_session_missing')
    if (swap.status !== SwapStatus.PENDING) throw new Error('swap_not_pending')
    if (swap.expiresAt <= new Date()) throw new Error('swap_expired')
    if (swap.targetUserId && swap.targetUserId !== acceptorId)
      throw new Error('swap_for_another_user')
    if (swap.sessionIdTo && swap.sessionIdTo !== sessionIdTo)
      throw new Error('swap_session_mismatch')

    const acceptorAttendee = await prisma.zoomSessionAttendee.findUnique({
      where: {
        sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId },
      },
      select: { id: true },
    })
    if (!acceptorAttendee) throw new Error('acceptor_not_attendee')

    await prisma.$transaction(async (tx) => {
      await tx.zoomSessionAttendee.update({
        where: {
          sessionId_userId: {
            sessionId: sessionIdFrom,
            userId: swap.requesterId,
          },
        },
        data: { userId: acceptorId },
      })
      await tx.zoomSessionAttendee.update({
        where: {
          sessionId_userId: { sessionId: sessionIdTo, userId: acceptorId },
        },
        data: { userId: swap.requesterId },
      })
      await tx.zoomSlotSwapRequest.update({
        where: { id: swapId },
        data: {
          status: SwapStatus.ACCEPTED,
          targetUserId: acceptorId,
          sessionIdTo,
          resolvedAt: new Date(),
        },
      })
    })

    await notifyCoach(swap.sessionFrom?.expertId ?? null, { swapId })

    void afterZoomOperation(bot, {
      operation: 'swap_accept',
      sessionId: sessionIdFrom,
      affectedUserIds: [swap.requesterId, acceptorId],
    }).catch((error) =>
      console.error('[zoom] afterZoomOperation failed:', error)
    )

    void afterZoomOperation(bot, {
      operation: 'swap_accept',
      sessionId: sessionIdTo,
      affectedUserIds: [acceptorId, swap.requesterId],
    }).catch((error) =>
      console.error('[zoom] afterZoomOperation failed:', error)
    )

    return {
      success: true,
      newSessionA: sessionIdTo,
      newSessionB: sessionIdFrom,
    }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping acceptSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

export async function declineSwapRequest(swapId: string, _declinerId: string) {
  try {
    const existing = await prisma.zoomSlotSwapRequest.findUnique({
      where: { id: swapId },
      select: { id: true, targetUserId: true },
    })
    if (!existing) throw new Error('swap_not_found')
    if (existing.targetUserId && existing.targetUserId !== _declinerId)
      throw new Error('swap_for_another_user')

    const swap = await prisma.zoomSlotSwapRequest.update({
      where: { id: swapId },
      data: { status: SwapStatus.DECLINED, resolvedAt: new Date() },
    })
    const requester = await prisma.user.findUnique({
      where: { id: swap.requesterId },
      select: { telegramChatId: true },
    })
    if (requester?.telegramChatId) {
      await sendDedupedTelegramMessage(
        requester.telegramChatId,
        'Обмін відхилено'
      ).catch(() => undefined)
    }

    if (swap.sessionIdFrom) {
      void afterZoomOperation(bot, {
        operation: 'swap_decline',
        sessionId: swap.sessionIdFrom,
        affectedUserIds: [swap.requesterId],
      }).catch((error) =>
        console.error('[zoom] afterZoomOperation failed:', error)
      )
    }

    return { success: true }
  } catch (err: unknown) {
    if (isPrismaTableMissingError(err)) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — run prisma migrate deploy to apply migration. Skipping declineSwapRequest.'
      )
      throw new Error('swap_storage_unavailable')
    }
    throw err
  }
}

function startOfWeekMonday(inputDate: Date): Date {
  const date = new Date(inputDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(inputDate: Date): Date {
  const start = startOfWeekMonday(inputDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

export async function getCoachWeekSlots(
  coachId: string,
  anchorDate = new Date()
) {
  const from = startOfWeekMonday(anchorDate)
  const to = endOfWeekSunday(anchorDate)
  return prisma.zoomSlot.findMany({
    where: {
      coachId,
      date: { gte: from, lte: to },
    },
    orderBy: [{ date: 'asc' }, { hour: 'asc' }],
  })
}

export async function toggleCoachSlotStatus(input: {
  slotId: string
  coachId: string
  status: ZoomSlotStatus
}) {
  return prisma.zoomSlot.update({
    where: { id: input.slotId },
    data: { status: input.status },
    select: { id: true, status: true, date: true, hour: true },
  })
}

export async function initiateZoomSwap(
  initiatorId: string,
  targetSlotId: string
) {
  const isSubscriber = await isActiveFocusSubscriber(initiatorId)
  if (!isSubscriber) throw new Error('focus_subscription_required')

  const user = await prisma.user.findUnique({
    where: { id: initiatorId },
    select: { id: true, swapsUsedThisMonth: true },
  })
  if (!user) throw new Error('user_not_found')
  if (user.swapsUsedThisMonth >= 1) throw new Error('swap_limit_reached')

  const targetSlot = await prisma.zoomSlot.findUnique({
    where: { id: targetSlotId },
    select: { id: true, coachId: true, status: true },
  })
  if (!targetSlot) throw new Error('target_slot_not_found')
  if (targetSlot.status !== ZoomSlotStatus.OPEN)
    throw new Error('target_slot_closed')

  const duplicateSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const duplicate = await prisma.zoomSlotSwapRequest.findFirst({
    where: {
      requesterId: initiatorId,
      targetSlotId,
      createdAt: { gte: duplicateSince },
      paymentStatus: {
        in: [ZoomSwapStatus.PENDING_PAYMENT, ZoomSwapStatus.CONFIRMED],
      },
    },
    select: { id: true },
  })
  if (duplicate) throw new Error('duplicate_pair_30d')

  const month = new Date().toISOString().slice(0, 7)
  const swap = await prisma.zoomSlotSwapRequest.create({
    data: {
      requesterId: initiatorId,
      targetSlotId,
      fee: 75,
      month,
      paymentStatus: ZoomSwapStatus.PENDING_PAYMENT,
      status: SwapStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
    select: { id: true, fee: true },
  })
  const orderReference = `zoom_swap_${swap.id}_${Date.now()}`
  const payment = buildPaymentRequest({
    userId: initiatorId,
    productId: 'zoom_swap',
    amount: swap.fee,
    currency: 'UAH',
    payRef: orderReference,
    product_name: ['Zoom Swap Fee'],
    product_count: [1],
    product_price: [swap.fee],
  })
  const backendBaseUrl = (
    process.env.PUBLIC_API_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    process.env.TELEGRAM_WEBHOOK_URL?.trim() ||
    process.env.INTERNAL_API_URL?.trim()?.replace(/\/api$/, '') ||
    (process.env.PORT
      ? `http://127.0.0.1:${process.env.PORT}`
      : 'http://127.0.0.1:3001')
  ).replace(/\/$/, '')
  const checkoutUrl = await buildShortWayForPayCheckoutUrl(
    backendBaseUrl,
    payment,
    {
      product: 'zoom_swap',
      swapId: swap.id,
    }
  )

  await prisma.zoomSlotSwapRequest.update({
    where: { id: swap.id },
    data: { orderRef: orderReference },
  })

  return {
    swapId: swap.id,
    fee: swap.fee,
    checkoutUrl,
    message: abTestZoomContent.swap.created,
  }
}

async function notifyZoomSwapPaymentCompleted(input: {
  swapId: string
  requesterChatId: string | null
  requesterFirstName: string | null
  coachChatId: string | null
  slotDate: Date | null
  slotHour: number | null
}) {
  const slotLabel =
    input.slotDate && typeof input.slotHour === 'number'
      ? `${input.slotDate.toLocaleDateString('uk-UA')} о ${String(input.slotHour).padStart(2, '0')}:00`
      : 'у вибраний слот'

  await Promise.all([
    input.requesterChatId
      ? sendDedupedTelegramMessage(
          input.requesterChatId,
          `✅ Оплату за Zoom swap підтверджено. Ваш запит #${input.swapId} зарезервовано ${slotLabel}.`
        ).catch(() => undefined)
      : Promise.resolve(),
    input.coachChatId
      ? sendDedupedTelegramMessage(
          input.coachChatId,
          `💱 Оплачений Zoom swap #${input.swapId}. ${getSafeName(input.requesterFirstName) || 'Учасник'} зарезервував слот ${slotLabel}.`
        ).catch(() => undefined)
      : Promise.resolve(),
  ])
}

export async function confirmZoomSwapPaymentByOrderRef(
  orderRef: string,
  paymentContext?: {
    amount?: number
    currency?: string
    transactionId?: string | null
  }
) {
  const swap = await prisma.zoomSlotSwapRequest.findFirst({
    where: { orderRef },
    select: {
      id: true,
      requesterId: true,
      paymentStatus: true,
      paymentLogId: true,
      fee: true,
      targetSlotId: true,
      requester: {
        select: {
          expertId: true,
          firstName: true,
          telegramChatId: true,
        },
      },
      sessionFrom: {
        select: {
          expertId: true,
        },
      },
      targetSlot: {
        select: {
          id: true,
          coachId: true,
          date: true,
          hour: true,
          status: true,
          coach: {
            select: {
              telegramChatId: true,
              expertId: true,
            },
          },
        },
      },
    },
  })

  if (!swap) {
    console.warn('[ZOOM_SWAP] swap_not_found', { orderRef })
    return { updated: false, error: 'swap_not_found' as const }
  }

  if (swap.paymentStatus === ZoomSwapStatus.CONFIRMED) {
    console.info('[ZOOM_SWAP_IDEMPOTENT] already_confirmed', {
      swapId: swap.id,
      orderRef,
    })
    return { updated: false, duplicate: true as const, swapId: swap.id }
  }

  const existingPaymentLog = await prisma.paymentLog
    .findUnique({
      where: { orderReference: orderRef },
      select: { id: true },
    })
    .catch(() => null)

  const expertId =
    swap.requester.expertId ??
    swap.sessionFrom?.expertId ??
    swap.targetSlot?.coach.expertId ??
    null

  if (!expertId) {
    console.error('[ZOOM_SWAP] missing_expert_id', {
      swapId: swap.id,
      orderRef,
    })
    return {
      updated: false,
      error: 'missing_expert_id' as const,
      swapId: swap.id,
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let paymentLogId = existingPaymentLog?.id ?? swap.paymentLogId ?? null

      if (!paymentLogId) {
        const createdPaymentLog = await tx.paymentLog.create({
          data: {
            orderReference: orderRef,
            userId: swap.requesterId,
            expertId,
            amountCents: Math.round((paymentContext?.amount ?? swap.fee) * 100),
            currency: paymentContext?.currency ?? 'UAH',
            status: 'SUCCESS',
            processedAt: new Date(),
            metadata: {
              scope: 'zoom',
              type: 'zoom_swap',
              swapId: swap.id,
              targetSlotId: swap.targetSlotId,
              transactionId: paymentContext?.transactionId ?? null,
            },
          },
          select: { id: true },
        })
        paymentLogId = createdPaymentLog.id
      }

      if (swap.targetSlot?.id) {
        const reservation = await tx.zoomSlot.updateMany({
          where: {
            id: swap.targetSlot.id,
            status: ZoomSlotStatus.OPEN,
          },
          data: {
            status: ZoomSlotStatus.CLOSED,
          },
        })

        if (reservation.count === 0) {
          throw new Error('target_slot_unavailable')
        }
      }

      await tx.zoomSlotSwapRequest.update({
        where: { id: swap.id },
        data: {
          paymentStatus: ZoomSwapStatus.CONFIRMED,
          paidAt: new Date(),
          paymentLogId,
          status: SwapStatus.ACCEPTED,
          resolvedAt: new Date(),
        },
      })

      await tx.user.update({
        where: { id: swap.requesterId },
        data: { swapsUsedThisMonth: { increment: 1 } },
      })

      return { paymentLogId }
    })

    await notifyZoomSwapPaymentCompleted({
      swapId: swap.id,
      requesterChatId: swap.requester.telegramChatId ?? null,
      requesterFirstName: swap.requester.firstName ?? null,
      coachChatId: swap.targetSlot?.coach.telegramChatId ?? null,
      slotDate: swap.targetSlot?.date ?? null,
      slotHour: swap.targetSlot?.hour ?? null,
    }).catch(() => undefined)

    console.info('[ZOOM_SWAP_COMPLETED]', {
      swapId: swap.id,
      orderRef,
      paymentLogId: result.paymentLogId,
    })

    return {
      updated: true,
      swapId: swap.id,
      paymentLogId: result.paymentLogId,
    }
  } catch (error) {
    console.error('[ZOOM_SWAP_FAILED]', {
      swapId: swap.id,
      orderRef,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export async function resetMonthlySwapUsage() {
  const result = await prisma.user.updateMany({
    where: { swapsUsedThisMonth: { gt: 0 } },
    data: { swapsUsedThisMonth: 0 },
  })
  return { resetUsers: result.count }
}

export async function expireStaleSwapRequests() {
  try {
    const stale = await prisma.zoomSlotSwapRequest.findMany({
      where: { status: SwapStatus.PENDING, expiresAt: { lt: new Date() } },
      select: { id: true, requesterId: true },
    })
    if (stale.length === 0)
      return {
        expiredCount: 0,
        expired: [] as Array<{ id: string; requesterId: string }>,
      }

    await prisma.zoomSlotSwapRequest.updateMany({
      where: { id: { in: stale.map((item) => item.id) } },
      data: { status: SwapStatus.EXPIRED, resolvedAt: new Date() },
    })
    return { expiredCount: stale.length, expired: stale }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as { code: string }).code === 'P2021'
    ) {
      console.warn(
        '[zoom/service] ZoomSlotSwapRequest table not found — ' +
          'run prisma migrate deploy to apply migration. Skipping.'
      )
      return {
        expiredCount: 0,
        expired: [] as Array<{ id: string; requesterId: string }>,
      }
    }
    throw err
  }
}

export async function formatChannelPost(): Promise<string> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: { gt: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 1,
  })

  const nextGroupPractice = sessions.find((session) =>
    isGroupPracticeRequest(session.requests)
  )

  const nextSessionLine = nextGroupPractice
    ? formatFocusChannelNextSessionLine(nextGroupPractice.scheduledAt)
    : 'Скоро опублікуємо найближчу дату в каналі.'

  return [
    'Вітаю, ти всередині ФОКУСУ.',
    '',
    'Тут відбувається реальна робота.',
    '',
    'Що далі:',
    '',
    '— щотижня Zoom-практика',
    '— розбір твоєї ситуації',
    '— конкретні рішення і дії',
    '',
    '📅 Наступна Zoom-практика:',
    nextSessionLine,
    '',
    'Що зробити зараз:',
    '1. Натисни «Записатись на Zoom» під цим повідомленням.',
    '2. Обери найближчу практику і забронюй місце.',
    '',
    'Якщо загубилась або хочеш повернутись назад — натисни «Відкрити чат-бот».',
  ].join('\n')
}

function formatFocusChannelNextSessionLine(date: Date): string {
  const weekday = date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    timeZone: KYIV_TIME_ZONE,
  })
  const month = date.toLocaleDateString('uk-UA', {
    month: 'long',
    timeZone: KYIV_TIME_ZONE,
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIME_ZONE,
  })

  return `${capitalizeLabel(weekday)}, ${date.getDate()} ${month} · ${time}`
}

function capitalizeLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getChannelPostContentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function cleanupExtraChannelPosts(keepId: string): Promise<void> {
  await prisma.zoomChannelPost
    .deleteMany({
      where: {
        id: { not: keepId },
      },
    })
    .catch(() => undefined)
}

export async function syncChannelPost(telegramBot: Telegraf): Promise<void> {
  if (channelPostSyncInFlight) {
    console.log('[syncChannelPost] skipped: sync already in flight')
    return channelPostSyncInFlight
  }

  channelPostSyncInFlight = (async () => {
    const channelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID?.trim()
    console.log('[syncChannelPost] channelId:', channelId ?? null)
    if (!channelId) {
      console.warn('[syncChannelPost] FOCUS_TELEGRAM_CHANNEL_ID не задано')
      return
    }

    const text = await formatChannelPost()
    console.log('[syncChannelPost] text length:', text.length)
    const contentHash = getChannelPostContentHash(text)
    const zoomUrl = resolveZoomCalendarUrl({ intent: 'booking' })
    const mainBotUrl = getBotLink() || 'https://t.me/Test_ABsystem_bot'
    const syncSignature = JSON.stringify({ channelId, text, zoomUrl })
    const now = Date.now()

    if (
      lastChannelPostSyncSignature === syncSignature &&
      now - lastChannelPostSyncAt < CHANNEL_POST_SYNC_TTL_MS
    ) {
      console.log('[syncChannelPost] skipped: identical payload within ttl')
      return
    }

    const replyMarkup = zoomUrl
      ? {
          inline_keyboard: [
            [
              { text: 'Записатись на Zoom', url: zoomUrl },
              { text: 'Відкрити чат-бот', url: mainBotUrl },
            ],
          ],
        }
      : {
          inline_keyboard: [[{ text: 'Відкрити чат-бот', url: mainBotUrl }]],
        }

    const existing = await prisma.zoomChannelPost.findFirst({
      orderBy: { updatedAt: 'desc' },
    })
    console.log('[syncChannelPost] existing:', existing?.messageId ?? null)
    console.log('[CHANNEL_SYNC] start', {
      channelId,
      existing: existing?.messageId ?? null,
      contentHash,
    })

    if (existing && lastChannelPostContentHash === contentHash) {
      lastChannelPostSyncSignature = syncSignature
      lastChannelPostSyncAt = now
      console.log('[CHANNEL_SYNC] mode: skip', {
        reason: 'same_content_hash',
        messageId: existing.messageId,
      })
      return
    }

    if (existing) {
      try {
        await telegramBot.telegram.editMessageText(
          channelId,
          existing.messageId,
          undefined,
          text,
          {
            reply_markup: replyMarkup,
            link_preview_options: { is_disabled: true },
          }
        )
        await cleanupExtraChannelPosts(existing.id)
        lastChannelPostContentHash = contentHash
        lastChannelPostSyncSignature = syncSignature
        lastChannelPostSyncAt = now
        console.log('[CHANNEL_SYNC] mode: edit', {
          messageId: existing.messageId,
        })
        return
      } catch (err) {
        const description =
          err && typeof err === 'object' && 'description' in err
            ? String(err.description ?? '')
            : err &&
                typeof err === 'object' &&
                'response' in err &&
                err.response &&
                typeof err.response === 'object' &&
                'description' in err.response
              ? String(err.response.description ?? '')
              : ''
        if (description.includes('message is not modified')) {
          lastChannelPostContentHash = contentHash
          lastChannelPostSyncSignature = syncSignature
          lastChannelPostSyncAt = now
          console.log('[CHANNEL_SYNC] mode: skip', {
            messageId: existing.messageId,
            reason: 'message_not_modified',
          })
          return
        }
        console.error('[syncChannelPost] ERROR edit:', err)
        await prisma.zoomChannelPost
          .delete({ where: { id: existing.id } })
          .catch(() => undefined)
      }
    }

    try {
      const sent = await telegramBot.telegram.sendMessage(channelId, text, {
        reply_markup: replyMarkup,
        link_preview_options: { is_disabled: true },
      })
      console.log('[syncChannelPost] sent:', sent.message_id)
      if (existing?.messageId !== sent.message_id) {
        await telegramBot.telegram
          .pinChatMessage(channelId, sent.message_id)
          .catch(() => undefined)
      }
      let savedId: string
      if (existing) {
        const updated = await prisma.zoomChannelPost.update({
          where: { id: existing.id },
          data: {
            messageId: sent.message_id,
            chatId: channelId,
          },
        })
        savedId = updated.id
      } else {
        const created = await prisma.zoomChannelPost.create({
          data: {
            messageId: sent.message_id,
            chatId: channelId,
          },
        })
        savedId = created.id
      }
      await cleanupExtraChannelPosts(savedId)
      lastChannelPostContentHash = contentHash
      lastChannelPostSyncSignature = syncSignature
      lastChannelPostSyncAt = now
      console.log('[CHANNEL_SYNC] mode: create', { messageId: sent.message_id })
    } catch (err) {
      console.error('[syncChannelPost] ERROR create:', err)
    }
  })().finally(() => {
    channelPostSyncInFlight = null
  })

  return channelPostSyncInFlight
}

export async function notifySubscribersNewSession(
  telegramBot: Telegraf,
  session: ZoomSession
): Promise<void> {
  const zoomUrl = resolveZoomCalendarUrl()
  const inviteUrl = process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''

  const paidUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: {
            is: {
              code: { in: [...FOCUS_PRODUCT_CODES] },
            },
          },
        },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const dt = new Date(session.scheduledAt)
  const dateStr = dt.toLocaleString('uk-UA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue

    const safeName = getSafeName(user.firstName)
    const greeting = safeName ? `${safeName}, ` : ''
    const text =
      `${greeting}опубліковано нову Zoom-практику.\n\n` +
      `${dateStr}\n` +
      `${session.topic}\n\n` +
      'Посилання на підключення надійде за 2 год до початку.'

    const calendarButton = canUseTelegramWebAppButton(zoomUrl)
      ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
      : { text: 'Переглянути календар', url: zoomUrl }
    const secondRow = inviteUrl
      ? [{ text: 'УВІЙТИ У ФОКУС', url: inviteUrl }]
      : []

    try {
      await telegramBot.telegram.sendMessage(tgId, text, {
        reply_markup: {
          inline_keyboard: [
            [calendarButton],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notify paid] failed ${tgId}:`, err)
    }
  }

  const unpaidLeads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: {
        none: { status: 'ACTIVE' },
      },
      deletedAt: null,
    },
    select: {
      firstName: true,
      testResultType: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const RESULT_LABEL: Record<string, string> = {
    STATE: 'СТАН',
    GOAL: 'ЦІЛЬ',
    CHOICE: 'ВИБІР',
    DECISION: 'РІШЕННЯ',
    ACTION: 'ДІЯ',
  }

  for (const user of unpaidLeads) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const focus = RESULT_LABEL[user.testResultType ?? ''] ?? 'поточний запит'
    const leadText =
      `${greeting}відбудеться Zoom-практика ФОКУС.\n\n` +
      `${dateStr}\n${session.topic}\n\n` +
      `Діагностика зафіксувала пріоритетну точку: ${focus}.\n` +
      'Саме цей патерн розбирається на живих практиках ФОКУС.\n\n' +
      'Для участі необхідно активувати доступ.'
    try {
      await telegramBot.telegram.sendMessage(tgId, leadText, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Активувати доступ до ФОКУС',
                callback_data: 'open_focus_payment',
              },
            ],
          ],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notify lead] failed ${tgId}:`, err)
    }
  }
}

type ZoomOperation =
  | 'create'
  | 'update'
  | 'cancel'
  | 'book'
  | 'unbook'
  | 'swap_accept'
  | 'swap_decline'

type ScheduleEventType =
  | 'UPDATE'
  | 'CANCEL'
  | 'SWAP'
  | 'PAID_BOOKING'
  | 'CREATE'

interface ScheduleEventPayload {
  eventType: ScheduleEventType
  sessionId?: string
  sessionTitle?: string
  affectedUserIds: string[]
  coachMetadata: Record<string, unknown>
}

async function getSessionAttendeeUserIds(sessionId: string): Promise<string[]> {
  const rows = await prisma.zoomSessionAttendee.findMany({
    where: { sessionId },
    select: { userId: true },
  })
  return rows.map((row) => row.userId)
}

async function getActiveSubscriberIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      productSubscriptions: { some: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: { id: true },
  })
  return rows.map((row) => row.id)
}

export async function notifyAffectedUsers(
  telegramBot: Telegraf,
  operation: ZoomOperation,
  session: ZoomSession,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, deletedAt: null },
    select: {
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const dt = new Date(session.scheduledAt)
  const dateStr = dt.toLocaleString('uk-UA', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  const messageByOperation: Record<
    ZoomOperation,
    (greeting: string) => string
  > = {
    create: (greeting) =>
      `${greeting}заплановано нову Zoom-сесію.\n\n${dateStr}\n${session.topic}`,
    update: (greeting) =>
      `${greeting}розклад Zoom-сесії оновлено.\n\n${dateStr}\n${session.topic}\n\nНагадування перераховано.`,
    cancel: (greeting) =>
      `${greeting}Zoom-сесію скасовано.\n\n${dateStr}\n${session.topic}`,
    book: (greeting) =>
      `${greeting}запис підтверджено.\n\n${dateStr}\n${session.topic}\n\nНагадування заплановано.`,
    unbook: (greeting) =>
      `${greeting}запис скасовано.\n\n${dateStr}\n${session.topic}`,
    swap_accept: (greeting) =>
      `${greeting}обмін слотом підтверджено.\n\nНовий час: ${dateStr}\n${session.topic}\n\nНагадування оновлено.`,
    swap_decline: (greeting) =>
      `${greeting}запит на обмін відхилено.\n\nРозклад залишається без змін.`,
  }

  const zoomUrl = resolveZoomCalendarUrl()
  const calendarButton = zoomUrl
    ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
    : null

  for (const user of users) {
    const chatId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!chatId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const text = messageByOperation[operation](greeting)

    try {
      await telegramBot.telegram.sendMessage(chatId, text, {
        reply_markup: calendarButton
          ? { inline_keyboard: [[calendarButton]] }
          : undefined,
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyAffected] failed ${chatId}:`, err)
    }
  }
}

function operationToEventType(operation: ZoomOperation): ScheduleEventType {
  const map: Record<ZoomOperation, ScheduleEventType> = {
    create: 'CREATE',
    update: 'UPDATE',
    cancel: 'CANCEL',
    book: 'PAID_BOOKING',
    unbook: 'CANCEL',
    swap_accept: 'SWAP',
    swap_decline: 'SWAP',
  }
  return map[operation] ?? 'UPDATE'
}

export async function processScheduleNotification(
  telegramBot: Telegraf,
  payload: ScheduleEventPayload
): Promise<void> {
  const { eventType, affectedUserIds, sessionTitle, coachMetadata } = payload
  const zoomUrl = resolveZoomCalendarUrl()
  const baseUrl = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const bookingUrl = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/zoom/booking`
    : null

  if (affectedUserIds.length > 0 && eventType !== 'SWAP') {
    const users = await prisma.user.findMany({
      where: { id: { in: affectedUserIds }, deletedAt: null },
      select: {
        firstName: true,
        telegramChatId: true,
        telegramLinks: {
          where: { isActive: true, chatId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { chatId: true },
        },
      },
    })

    for (const user of users) {
      const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
      if (!tgId) continue

      const safeName = getSafeName(user.firstName)
      const greeting = safeName ? `${safeName}, ` : ''

      let text = ''
      let buttons: Array<Array<{ text: string; [key: string]: unknown }>> = []

      const zoomBtn = zoomUrl
        ? canUseTelegramWebAppButton(zoomUrl)
          ? { text: 'Відкрити календар зустрічей', web_app: { url: zoomUrl } }
          : { text: 'Відкрити календар зустрічей', url: zoomUrl }
        : null
      const bookBtn = bookingUrl
        ? canUseTelegramWebAppButton(bookingUrl)
          ? { text: 'Забронювати новий слот', web_app: { url: bookingUrl } }
          : { text: 'Забронювати новий слот', url: bookingUrl }
        : null

      if (eventType === 'UPDATE') {
        text =
          `${greeting}оновлено графік запланованих сесій.\n\n` +
          `Назва зустрічі: ${sessionTitle ?? 'Zoom-практика'}\n` +
          `Новий час: ${String(coachMetadata.newDateTimeFormatted ?? 'оновлено')}\n\n` +
          'Зміни автоматично внесено у персональний додаток.'
        if (zoomBtn) buttons = [[zoomBtn]]
      } else if (eventType === 'CANCEL') {
        text =
          `${greeting}індивідуальну консультацію (${String(coachMetadata.oldDateTimeFormatted ?? '—')}) скасовано.\n\n` +
          'Для вибору нового вікна скористайтеся сервісом бронювання.'
        if (bookBtn) buttons = [[bookBtn]]
      } else if (eventType === 'PAID_BOOKING') {
        text =
          `${greeting}запис на консультацію підтверджено.\n\n` +
          `Назва зустрічі: ${sessionTitle ?? 'Zoom-консультація'}\n` +
          `Час: ${String(coachMetadata.bookedDateTimeFormatted ?? '—')}`
        if (zoomBtn) buttons = [[zoomBtn]]
      }

      if (!text) continue

      try {
        await telegramBot.telegram.sendMessage(tgId, text, {
          reply_markup:
            buttons.length > 0
              ? ({ inline_keyboard: buttons } as any)
              : undefined,
        })
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (err) {
        console.warn(`[processScheduleNotification:${eventType}] ${tgId}:`, err)
      }
    }
  }

  if (eventType === 'SWAP') {
    const user1Id = String(coachMetadata.user1Id ?? '')
    const user2Id = String(coachMetadata.user2Id ?? '')
    const swapUsers = [
      {
        userId: user1Id,
        newTime: String(coachMetadata.newTime1 ?? 'оновлено'),
      },
      {
        userId: user2Id,
        newTime: String(coachMetadata.newTime2 ?? 'оновлено'),
      },
    ].filter((item) => item.userId)

    for (const swapUser of swapUsers) {
      const user = await prisma.user.findUnique({
        where: { id: swapUser.userId },
        select: {
          firstName: true,
          telegramChatId: true,
          telegramLinks: {
            where: { isActive: true, chatId: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { chatId: true },
          },
        },
      })
      const tgId =
        user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
      if (!tgId) continue
      const safeName = getSafeName(user?.firstName)
      const greeting = safeName ? `${safeName}, ` : ''
      const zoomBtn = zoomUrl
        ? canUseTelegramWebAppButton(zoomUrl)
          ? { text: 'Переглянути оновлений розклад', web_app: { url: zoomUrl } }
          : { text: 'Переглянути оновлений розклад', url: zoomUrl }
        : null
      try {
        await telegramBot.telegram.sendMessage(
          tgId,
          `${greeting}обмін слотом підтверджено.\n\nНовий час консультації: ${swapUser.newTime}\n\nРозклад оновлено автоматично.`,
          {
            reply_markup: zoomBtn
              ? { inline_keyboard: [[zoomBtn]] }
              : undefined,
          }
        )
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (err) {
        console.warn(`[processScheduleNotification:SWAP] ${tgId}:`, err)
      }
    }
  }

  let report = 'ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n'
  if (eventType === 'CREATE') {
    report += `Тип події: Нова сесія\nНазва: ${sessionTitle ?? 'Zoom-сесія'}\nЧас: ${String(coachMetadata.newDateTimeFormatted ?? '—')}\nЗареєстровано учасників: ${String(coachMetadata.attendeesCount ?? 0)}`
  } else if (eventType === 'UPDATE') {
    report += `Тип події: Оновлення параметрів сесії\nНазва: ${sessionTitle ?? 'Zoom-сесія'}\nНовий час: ${String(coachMetadata.newDateTimeFormatted ?? '—')}\nПричетних учасників сповіщено: ${affectedUserIds.length}`
  } else if (eventType === 'CANCEL') {
    report += `Тип події: Скасування\nУчасник: ${String(coachMetadata.userName ?? 'Учасник')} (id: ${String(coachMetadata.userId ?? '—')})\nПопередня дата: ${String(coachMetadata.oldDateTimeFormatted ?? '—')}\nСлот звільнено для бронювання.`
  } else if (eventType === 'SWAP') {
    report += `Тип події: Обмін слотами\nУчасники: ${String(coachMetadata.user1Name ?? 'Учасник 1')} ↔ ${String(coachMetadata.user2Name ?? 'Учасник 2')}\n\n${String(coachMetadata.user1Name ?? 'Учасник 1')}: ${String(coachMetadata.newTime1 ?? '—')}\n${String(coachMetadata.user2Name ?? 'Учасник 2')}: ${String(coachMetadata.newTime2 ?? '—')}`
  } else if (eventType === 'PAID_BOOKING') {
    report += `Тип події: Запис на індивідуальну консультацію\nУчасник: ${String(coachMetadata.userName ?? 'Учасник')} (id: ${String(coachMetadata.userId ?? '—')})\nДата та час: ${String(coachMetadata.bookedDateTimeFormatted ?? '—')}\nСтатус оплати: PAID via WayForPay\nАналітичний фокус: ${String(coachMetadata.resultKey ?? '—').toUpperCase()}\nЗапит учасника: ${String(coachMetadata.userTargetDescription ?? '—')}`
  }

  const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
  const panelUrl = panelBase
    ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom`
    : null

  void sendOpsTelegramMessage(
    report,
    panelUrl
      ? {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Панель керування розкладом', url: panelUrl }],
            ],
          },
        }
      : undefined
  ).catch((err) => console.error('[coach feed]', err))
}

export async function afterZoomOperation(
  telegramBot: Telegraf,
  params: {
    operation: ZoomOperation
    sessionId: string
    affectedUserIds: string[]
    coachNotify?: boolean
  }
): Promise<void> {
  const { operation, sessionId } = params

  const session = await prisma.zoomSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { attendees: true } } },
  })
  if (!session) return

  const isGroup = isGroupPracticeRequest(session.requests)

  if (isGroup) {
    void syncChannelPost(telegramBot).catch((err) =>
      console.error('[afterZoomOp] syncChannelPost:', err)
    )
  }

  const affectedUserIds =
    params.affectedUserIds.length > 0
      ? params.affectedUserIds
      : await getSessionAttendeeUserIds(sessionId)

  const shouldNotifyAffected = !(operation === 'create' && isGroup)

  if (shouldNotifyAffected && affectedUserIds.length > 0) {
    void notifyAffectedUsers(
      telegramBot,
      operation,
      session,
      affectedUserIds
    ).catch((err) => console.error('[afterZoomOp] notifyAffectedUsers:', err))
  }

  const formatted = new Date(session.scheduledAt).toLocaleString('uk-UA', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })
  const eventType = operationToEventType(operation)
  const coachMetadata: Record<string, unknown> = {
    newDateTimeFormatted: formatted,
    oldDateTimeFormatted: formatted,
    userId: affectedUserIds[0] ?? '',
    userName: 'Учасник',
    bookedDateTimeFormatted: formatted,
    resultKey: '',
    userTargetDescription: '—',
    attendeesCount: session._count.attendees,
  }
  if (operation === 'swap_accept') {
    coachMetadata.user1Id = affectedUserIds[0] ?? ''
    coachMetadata.user2Id = affectedUserIds[1] ?? ''
    coachMetadata.user1Name = 'Учасник 1'
    coachMetadata.user2Name = 'Учасник 2'
    coachMetadata.newTime1 = formatted
    coachMetadata.newTime2 = formatted
  }
  void processScheduleNotification(telegramBot, {
    eventType,
    sessionId,
    sessionTitle: session.topic,
    affectedUserIds,
    coachMetadata,
  }).catch((err) =>
    console.error('[afterZoomOp] processScheduleNotification:', err)
  )

  if (operation === 'book') {
    const reminderUserIds = [
      ...new Set([
        ...affectedUserIds,
        ...(await getCoachReminderUserIds(session.expertId)),
      ]),
    ]
    for (const userId of reminderUserIds) {
      void scheduleReminders(userId, session).catch((err) =>
        console.error('[afterZoomOp] scheduleReminders:', err)
      )
    }
  }

  if (operation === 'update' || operation === 'swap_accept') {
    const reminderUserIds = [
      ...new Set([
        ...affectedUserIds,
        ...(await getCoachReminderUserIds(session.expertId)),
      ]),
    ]
    for (const userId of reminderUserIds) {
      void rescheduleReminders(userId, session).catch((err) =>
        console.error('[afterZoomOp] rescheduleReminders:', err)
      )
    }
  }

  if (operation === 'cancel' || operation === 'unbook') {
    const reminderUserIds = [
      ...new Set([
        ...affectedUserIds,
        ...(await getCoachReminderUserIds(session.expertId)),
      ]),
    ]
    for (const userId of reminderUserIds) {
      void cancelExistingReminders(userId, sessionId).catch((err) =>
        console.error('[afterZoomOp] cancelExistingReminders:', err)
      )
    }
  }

  if (params.coachNotify) {
    void notifyCoach(session.expertId, {
      swapId: `${operation}:${sessionId}`,
    }).catch((err) => console.error('[afterZoomOp] notifyCoach:', err))
  }
}

export async function notifyMonthSchedule(
  telegramBot: Telegraf,
  sessions: ZoomSession[]
): Promise<void> {
  if (sessions.length === 0) return

  const upcomingGroupSessions = sessions
    .filter((session) => isGroupPracticeRequest(session.requests))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())

  if (upcomingGroupSessions.length === 0) return

  const focusInviteUrl =
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ?? ''
  const zoomUrl = resolveZoomCalendarUrl()

  const scheduleLines = upcomingGroupSessions
    .map((session) => {
      const dt = new Date(session.scheduledAt)
      return (
        dt.toLocaleString('uk-UA', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }) + ` — ${session.topic}`
      )
    })
    .join('\n')

  const firstDt = new Date(upcomingGroupSessions[0].scheduledAt)
  const monthLabel = firstDt.toLocaleString('uk-UA', {
    month: 'long',
    year: 'numeric',
  })

  const activeSubscriptionUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: { some: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
      productSubscriptions: {
        where: { status: 'ACTIVE' },
        select: {
          product: {
            select: { code: true },
          },
        },
      },
    },
  })

  const paidUsers = await prisma.user.findMany({
    where: {
      productSubscriptions: {
        some: {
          status: 'ACTIVE',
          product: {
            is: {
              code: { in: [...FOCUS_PRODUCT_CODES] },
            },
          },
        },
      },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const selectedUserIds = new Set(paidUsers.map((user) => user.id))
  for (const user of activeSubscriptionUsers) {
    const products = user.productSubscriptions
      .map((subscription) => subscription.product.code)
      .filter((code): code is string => Boolean(code))
    const selected = selectedUserIds.has(user.id)
    console.info('[FOCUS_AUDIENCE]', {
      userId: user.id,
      product: products.length > 0 ? products.join(',') : 'none',
      selected,
      reason: selected
        ? 'active_focus_subscription'
        : 'active_non_focus_subscription',
    })
  }

  const paidText =
    `Розклад Zoom-практик ФОКУС — ${monthLabel}\n\n` +
    `${scheduleLines}\n\n` +
    'Посилання на підключення надходить автоматично за 2 год до початку кожної практики.'

  const calBtn = canUseTelegramWebAppButton(zoomUrl)
    ? { text: 'Переглянути календар', web_app: { url: zoomUrl } }
    : { text: 'Переглянути календар', url: zoomUrl }

  for (const user of paidUsers) {
    const tgId = user.telegramChatId ?? user.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(user.firstName)
    const greeting = name ? `${name}, ` : ''
    const secondRow = focusInviteUrl
      ? [{ text: 'УВІЙТИ У ФОКУС', url: focusInviteUrl }]
      : []
    try {
      await telegramBot.telegram.sendMessage(tgId, `${greeting}${paidText}`, {
        reply_markup: {
          inline_keyboard: [
            [calBtn],
            ...(secondRow.length > 0 ? [secondRow] : []),
          ],
        },
      })
      for (const session of upcomingGroupSessions) {
        await scheduleReminders(user.id, session)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyMonth paid] ${tgId}:`, err)
    }
  }

  for (const session of upcomingGroupSessions) {
    for (const coachId of await getCoachReminderUserIds(session.expertId)) {
      await scheduleReminders(coachId, session)
    }
  }

  const leads = await prisma.user.findMany({
    where: {
      testResultType: { not: null },
      productSubscriptions: { none: { status: 'ACTIVE' } },
      deletedAt: null,
    },
    select: {
      firstName: true,
      testResultType: true,
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const resultContext: Record<string, string> = {
    STATE:
      'Діагностика зафіксувала точку: СТАН. На практиках ФОКУС розбираємо саме цей патерн.',
    GOAL: 'Діагностика зафіксувала точку: ЦІЛЬ. На практиках ФОКУС переводимо запит у конкретний крок.',
    CHOICE:
      'Діагностика зафіксувала точку: ВИБІР. На практиках ФОКУС працюємо з блоком вибору.',
    DECISION:
      'Діагностика зафіксувала точку: РІШЕННЯ. На практиках ФОКУС доводимо до фіксації і дії.',
    ACTION:
      'Діагностика зафіксувала точку: ДІЯ. На практиках ФОКУС декомпозуємо крок до виконуваного формату.',
  }

  for (const lead of leads) {
    const tgId = lead.telegramChatId ?? lead.telegramLinks[0]?.chatId ?? null
    if (!tgId) continue
    const name = getSafeName(lead.firstName)
    const greeting = name ? `${name}, ` : ''
    const context = resultContext[lead.testResultType ?? ''] ?? ''
    const text =
      `${greeting}опубліковано розклад Zoom-практик ФОКУС на ${monthLabel}.\n\n` +
      `${scheduleLines}\n\n` +
      `${context ? `${context}\n\n` : ''}` +
      'Для участі необхідно активувати доступ.'

    try {
      await telegramBot.telegram.sendMessage(tgId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Активувати доступ до ФОКУС',
                callback_data: 'open_focus_payment',
              },
            ],
          ],
        },
      })
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (err) {
      console.warn(`[notifyMonth lead] ${tgId}:`, err)
    }
  }

  console.log(
    `[notifyMonthSchedule] paid=${paidUsers.length} leads=${leads.length} sessions=${upcomingGroupSessions.length}`
  )
}

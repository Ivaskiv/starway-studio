import { NotificationChannel,NotificationStatus,NotificationType,ZoomStatus,type UserLifecycleState } from '@starway/db/prisma-client'
import type { Telegraf } from 'telegraf'
import { prisma } from '../../db/client.js'
import { bot,sendOpsTelegramMessage } from '../../lib/telegram.js'
import { sendTelegramMessage } from '../../lib/telegram/messageFormatter.js'
import { sendCoachZoomSummary } from '../../modules/ai-operator/operator.service.js'
import { enqueueDueReminderWindow } from '../../modules/zoom/notifications/zoom.reminders.service.js'
import { buildZoomCalendarUrl } from '../../modules/zoom/urls.js'
import { AB_TEST_LIFECYCLE_REMINDERS,type LifecycleReminderKey } from '../../products/ab-system/content/abTest.followups.js'
import {
  endOfDay,
  addDays,
} from './common.js'

function startOfWeekMonday(date = new Date()): Date {
  const normalized = new Date(date)
  const day = normalized.getDay()
  const diff = day === 0 ? -6 : 1 - day
  normalized.setDate(normalized.getDate() + diff)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export async function zoomScheduleReadinessFridayCron(): Promise<void> {
  const currentWeekStart = startOfWeekMonday(new Date())
  const nextWeekStart = addDays(currentWeekStart, 7)
  const nextWeekEnd = endOfDay(addDays(nextWeekStart, 6))

  const count = await prisma.zoomSession.count({
    where: {
      scheduledAt: {
        gte: nextWeekStart,
        lte: nextWeekEnd,
      },
      status: { not: ZoomStatus.CANCELLED },
    },
  })

  if (count === 0) {
    await sendOpsTelegramMessage(
      'Zoom-розклад на наступний тиждень не сформовано. Додати сесії до неділі.',
    )
  }
}

type ZoomReminderType = 'ZOOM_REMINDER_2H' | 'ZOOM_REMINDER_5M'
type ZoomRecoveryType = 'ZOOM_NO_SHOW'
type ZoomCoachSummaryType = 'ZOOM_COACH_SUMMARY_60M'
const ZOOM_REMINDER_2H_TARGET_MINUTES = 120
const ZOOM_REMINDER_2H_GRACE_MINUTES = 10
const ZOOM_REMINDER_5M_TARGET_MINUTES = 5
const ZOOM_REMINDER_5M_GRACE_MINUTES = 1

async function wasReminderSentRecently(userId: string, reminderKey: LifecycleReminderKey): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const hit = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: reminderKey,
      status: NotificationStatus.SENT,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  })
  return Boolean(hit)
}

async function wasZoomReminderSentRecently(
  userId: string,
  sessionId: string,
  reminderType: ZoomReminderType | ZoomRecoveryType | ZoomCoachSummaryType,
): Promise<boolean> {
  const hit = await prisma.notification.findFirst({
    where: {
      userId,
      type: NotificationType.AI_REMINDER,
      templateKey: reminderType,
      status: NotificationStatus.SENT,
      data: { path: ['sessionId'], equals: sessionId },
    },
    select: { id: true },
  })

  return Boolean(hit)
}

function resolveZoomReminderType(diffMs: number): ZoomReminderType | null {
  const diffMinutes = diffMs / (60 * 1000)

  if (
    diffMinutes >= ZOOM_REMINDER_2H_TARGET_MINUTES - ZOOM_REMINDER_2H_GRACE_MINUTES
    && diffMinutes <= ZOOM_REMINDER_2H_TARGET_MINUTES
  ) {
    return 'ZOOM_REMINDER_2H'
  }

  if (
    diffMinutes >= -ZOOM_REMINDER_5M_GRACE_MINUTES
    && diffMinutes <= ZOOM_REMINDER_5M_TARGET_MINUTES
  ) {
    return 'ZOOM_REMINDER_5M'
  }

  return null
}

function resolveZoomSessionEndAt(scheduledAt: Date, requests: unknown): Date {
  const meta =
    requests && typeof requests === 'object' && !Array.isArray(requests)
      ? requests as Record<string, unknown>
      : {}
  const durationMinutesRaw = meta.durationMinutes
  const durationMinutes =
    typeof durationMinutesRaw === 'number' && Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0
      ? durationMinutesRaw
      : 60

  return new Date(scheduledAt.getTime() + durationMinutes * 60 * 1000)
}

type BookingQuestionEventPayload = {
  sessionId?: string
  questionText?: string
}

function parseBookingQuestionPayload(payload: unknown): BookingQuestionEventPayload {
  if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
    return {}
  }

  return payload as BookingQuestionEventPayload
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatZoomCoachSummaryDate(date: Date): string {
  const day = date.toLocaleDateString('uk-UA', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Kyiv',
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Kyiv',
  })

  return `${day}, ${time}`
}

function buildCoachProblemSummary(questions: string[]): string[] {
  const keywordBuckets = [
    {
      label: 'Гроші',
      keywords: ['гроші', 'грош', 'дохід', 'зароб', 'продаж', 'клієнт', 'ціна', 'вартість', 'фінанс'],
    },
    {
      label: 'Страх',
      keywords: ['страх', 'боюс', 'бою', 'тривог', 'сором', 'невпевн', 'відмова'],
    },
    {
      label: 'Відкладання',
      keywords: ['відкладан', 'прокраст', 'не можу почати', 'потім', 'завис', 'стопор'],
    },
    {
      label: 'Відносини',
      keywords: ['відносин', 'стосунк', 'чоловік', 'партнер', 'сім', 'мама', 'тато'],
    },
  ] as const

  const bucketCounts = keywordBuckets
    .map((bucket) => ({
      label: bucket.label,
      count: questions.reduce((sum, question) => (
        sum + bucket.keywords.reduce((bucketSum, keyword) => (
          bucketSum + (question.includes(keyword) ? 1 : 0)
        ), 0)
      ), 0),
    }))
    .filter((bucket) => bucket.count > 0)
    .sort((left, right) => right.count - left.count)

  if (bucketCounts.length > 0) {
    return bucketCounts.slice(0, 3).map((bucket) => `${bucket.label} (${bucket.count})`)
  }

  const stopWords = new Set([
    'або', 'але', 'без', 'більш', 'бути', 'вже', 'вона', 'вони', 'воно', 'все', 'всіх',
    'де', 'для', 'дуже', 'зараз', 'його', 'йти', 'коли', 'мене', 'мені', 'можу', 'моя',
    'моє', 'мої', 'на', 'над', 'нам', 'нас', 'не', 'ні', 'про', 'просто', 'після',
    'це', 'цей', 'ця', 'ці', 'щоб', 'що', 'як', 'я', 'у', 'та', 'ти', 'тут', 'так',
  ])
  const wordCounts = new Map<string, number>()

  for (const question of questions) {
    for (const word of question.split(' ')) {
      if (word.length < 4 || stopWords.has(word)) continue
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1)
    }
  }

  return [...wordCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([word, count]) => `${word} (${count})`)
}

function buildCoachOpeningRecommendation(topProblems: string[]): string {
  const primary = topProblems[0]?.toLowerCase() ?? ''

  if (primary.includes('гроші')) {
    return 'Почни з питання: "Хто зараз застряг у темі грошей або доходу?"'
  }

  if (primary.includes('страх')) {
    return 'Почни з питання: "Хто зараз впирається в страх або невпевненість?"'
  }

  if (primary.includes('відкладання')) {
    return 'Почни з питання: "Хто зараз відкладає важливу дію і не може зрушити?"'
  }

  if (primary.includes('відносини')) {
    return 'Почни з питання: "Хто зараз застряг у напрузі у відносинах?"'
  }

  return 'Почни з питання: "Хто зараз відчуває головний стоп і хоче розібрати його першим?"'
}

function buildCoachSummaryMessage(params: {
  scheduledAt: Date
  participantsCount: number
  topProblems: string[]
  hasQuestions: boolean
}): string {
  const topProblems = params.hasQuestions && params.topProblems.length > 0
    ? params.topProblems.map((problem, index) => `${index + 1}. ${escapeHtml(problem)}`).join('\n')
    : 'Учасники ще не залишили запити'
  const recommendation = buildCoachOpeningRecommendation(params.topProblems)

  return [
    '🔥 <b>ПІДГОТОВКА ДО ZOOM</b>',
    '',
    `📅 ${escapeHtml(formatZoomCoachSummaryDate(params.scheduledAt))}`,
    `👥 ${params.participantsCount} учасників`,
    '',
    '<b>ТОП запити</b>',
    topProblems,
    '',
    '<b>🎯 Рекомендація</b>',
    escapeHtml(recommendation),
  ].join('\n')
}

export async function scanZoomCoachSummary(): Promise<void> {
  const now = new Date()
  const upcomingWindowStart = new Date(now.getTime() + 50 * 60 * 1000)
  const upcomingWindowEnd = new Date(now.getTime() + 60 * 60 * 1000)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      scheduledAt: {
        gt: upcomingWindowStart,
        lte: upcomingWindowEnd,
      },
      expertId: { not: null },
    },
    select: {
      id: true,
      expertId: true,
      scheduledAt: true,
      attendees: {
        select: {
          userId: true,
        },
      },
    },
    take: 100,
  })

  for (const session of sessions) {
    const coachRecipients = await prisma.user.findMany({
      where: {
        expertId: session.expertId,
        deletedAt: null,
        role: { in: ['EXPERT', 'SUPERADMIN'] },
      },
      select: {
        id: true,
      },
    })

    const pendingCoachIds = new Set<string>()
    for (const coach of coachRecipients) {
      const alreadySent = await wasZoomReminderSentRecently(
        coach.id,
        session.id,
        'ZOOM_COACH_SUMMARY_60M',
      )
      if (!alreadySent) {
        pendingCoachIds.add(coach.id)
      }
    }

    if (pendingCoachIds.size === 0) continue

    const questionEvents = await prisma.event.findMany({
      where: {
        type: 'ZOOM_BOOKING_QUESTION',
        payload: {
          path: ['sessionId'],
          equals: session.id,
        },
      },
      select: {
        payload: true,
      },
    })

    const questionTexts = questionEvents
      .map((event) => parseBookingQuestionPayload(event.payload).questionText)
      .filter((questionText): questionText is string => typeof questionText === 'string' && questionText.trim().length > 0)
      .map((questionText) => questionText.trim())
    const normalizedQuestions = questionTexts.map(normalizeQuestionText).filter(Boolean)
    const topProblems = buildCoachProblemSummary(normalizedQuestions)
    const summaryMessage = buildCoachSummaryMessage({
      scheduledAt: session.scheduledAt,
      participantsCount: session.attendees.length,
      topProblems,
      hasQuestions: questionTexts.length > 0,
    })
    const sendResults = await sendCoachZoomSummary(session.expertId, summaryMessage, {
      targetUserIds: [...pendingCoachIds],
      replyMarkup: {
        inline_keyboard: [[
          { text: 'Відкрити календар', web_app: { url: buildZoomCalendarUrl() } },
        ]],
      },
    })

    for (const result of sendResults) {
      if (!pendingCoachIds.has(result.userId)) continue

      await prisma.notification.create({
        data: {
          expertId: session.expertId,
          userId: result.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_COACH_SUMMARY_60M',
          title: 'Pre-Zoom Coach Summary',
          body: `Session ${session.id}`,
          status: result.sent ? NotificationStatus.SENT : NotificationStatus.FAILED,
          sentAt: result.sent ? new Date() : undefined,
          failureReason: result.sent ? undefined : 'coach_chat_not_found',
          data: {
            sessionId: session.id,
            scheduledAt: session.scheduledAt.toISOString(),
            participantsCount: session.attendees.length,
            questionCount: questionTexts.length,
            topProblems,
          },
        },
      })
    }
  }
}

export async function scanZoomSessionReminders(_telegramBot: Telegraf): Promise<void> {
  const now = new Date()
  const twoHourStart = new Date(now.getTime() + (ZOOM_REMINDER_2H_TARGET_MINUTES - ZOOM_REMINDER_2H_GRACE_MINUTES) * 60 * 1000)
  const twoHourEnd = new Date(now.getTime() + ZOOM_REMINDER_2H_TARGET_MINUTES * 60 * 1000)
  const fiveMinuteStart = new Date(now.getTime() - ZOOM_REMINDER_5M_GRACE_MINUTES * 60 * 1000)
  const fiveMinuteEnd = new Date(now.getTime() + ZOOM_REMINDER_5M_TARGET_MINUTES * 60 * 1000)

  const sessions = await prisma.zoomSession.findMany({
    where: {
      status: ZoomStatus.SCHEDULED,
      OR: [
        { scheduledAt: { gte: twoHourStart, lte: twoHourEnd } },
        { scheduledAt: { gte: fiveMinuteStart, lte: fiveMinuteEnd } },
      ],
    },
    select: {
      id: true,
      topic: true,
      scheduledAt: true,
      expertId: true,
      requests: true,
      attendees: {
        select: {
          userId: true,
          user: {
            select: {
              telegramChatId: true,
            },
          },
        },
      },
    },
  })

  for (const session of sessions) {
    const diffMs = session.scheduledAt.getTime() - now.getTime()
    const reminderType = resolveZoomReminderType(diffMs)

    if (!reminderType) continue
    for (const attendee of session.attendees) {
      if (!attendee.user.telegramChatId?.trim()) continue

      await enqueueDueReminderWindow(attendee.userId, {
        id: session.id,
        scheduledAt: session.scheduledAt,
        topic: session.topic ?? '',
        requests: session.requests,
      }, reminderType)
      .catch((error) => {
        console.error('[zoom] failed to enqueue canonical reminder job', {
          userId: attendee.userId,
          sessionId: session.id,
          reminderType,
          error: error instanceof Error ? error.message : String(error),
        })
      })
    }
  }
}

export async function scanZoomNoShowRecovery(
  telegramBot: Telegraf,
  options?: {
    now?: Date
    lookbackHours?: number
  },
): Promise<void> {
  const now = options?.now ?? new Date()
  const lookbackHours =
    typeof options?.lookbackHours === 'number' && Number.isFinite(options.lookbackHours) && options.lookbackHours > 0
      ? options.lookbackHours
      : 8
  const recentEndedStart = new Date(now.getTime() - lookbackHours * 60 * 60 * 1000)
  const bookingUrl = buildZoomCalendarUrl({ intent: 'booking' })

  const attendees = await prisma.zoomSessionAttendee.findMany({
    where: {
      attended: false,
      user: {
        telegramChatId: { not: null },
      },
      session: {
        status: { not: ZoomStatus.CANCELLED },
        scheduledAt: {
          gt: recentEndedStart,
          lte: now,
        },
      },
    },
    select: {
      userId: true,
      user: {
        select: {
          telegramChatId: true,
        },
      },
      session: {
        select: {
          id: true,
          expertId: true,
          scheduledAt: true,
          requests: true,
        },
      },
    },
    take: 500,
  })

  for (const attendee of attendees) {
    const sessionEndedAt = resolveZoomSessionEndAt(
      attendee.session.scheduledAt,
      attendee.session.requests,
    )
    if (sessionEndedAt > now) continue

    const chatId = attendee.user.telegramChatId?.trim()
    if (!chatId) continue

    const alreadySent = await wasZoomReminderSentRecently(
      attendee.userId,
      attendee.session.id,
      'ZOOM_NO_SHOW',
    )
    if (alreadySent) continue

    const title = 'Ти не прийшла на Zoom.'
    const body = '> Це не проблема. Але важливо не злити процес.\n\nЩо робимо далі:'

    try {
      console.info('[NO_SHOW]', {
        userId: attendee.userId,
        sessionId: attendee.session.id,
        triggered: true,
      })
      await sendTelegramMessage(
        telegramBot,
        chatId,
        [title, '', body].join('\n'),
        {
          replyMarkup: {
            inline_keyboard: [
              [{ text: 'Написати причину', callback_data: 'continue_ai_mentor_chat' }],
              [{ text: 'Записатись ще раз', web_app: { url: bookingUrl } }],
            ],
          },
        },
      )

      await prisma.notification.create({
        data: {
          expertId: attendee.session.expertId ?? null,
          userId: attendee.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_NO_SHOW',
          title,
          body,
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          data: {
            sessionId: attendee.session.id,
          },
        },
      })
    } catch (error) {
      await prisma.notification.create({
        data: {
          expertId: attendee.session.expertId ?? null,
          userId: attendee.userId,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.AI_REMINDER,
          templateKey: 'ZOOM_NO_SHOW',
          title,
          body,
          status: NotificationStatus.FAILED,
          failureReason: error instanceof Error ? error.message : String(error),
          data: {
            sessionId: attendee.session.id,
          },
        },
      })
    }
  }
}

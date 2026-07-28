import type { Context } from 'telegraf'
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { listMicroTasksForUser } from '../../microTask/service.js'
import { getUserAccess, getUserSystemState } from '../../access/service.js'
import { notificationRecordService } from '../../../services/notifications/services/NotificationRecordService.js'
import { syncAccessAwareChatMenuButton } from '../handlers/start.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { TelegramConversationRenderer } from '../conversation/renderers/telegramConversationRenderer.js'
import { telegramContentRegistry } from '../content/contentRegistry.js'
import { pickBestTask, type Task } from './taskPriority.service.js'
import { resolveUserLifecycle } from '../../flow-control/service.js'
import { resolveCentralLifecycleSnapshot } from '../../lifecycle/service.js'

const NUDGE_MARKER_PREFIX = 'NUDGE_SENT:'
const NUDGE_DISMISSED_MARKER = 'NUDGE_DISMISSED'
const NUDGE_TASK_DAY_PREFIX = 'NUDGE_TASK_DAY:'
const NUDGE_WAVE_DAY_PREFIX = 'NUDGE_WAVE_DAY:'
const NUDGE_SIGNATURE_DAY_PREFIX = 'NUDGE_SIGNATURE_DAY:'
const NUDGE_THRESHOLDS_HOURS = [12, 36, 84] as const
const DISALLOWED_SUBSCRIPTION_STATUSES = new Set(['WAITLIST', 'CANCELLED', 'EXPIRED'])
const conversationRenderer = new TelegramConversationRenderer()
function normalizeTaskType(task: {
  title: string
  reason?: string
  source?: string
}): Task['type'] {
  const haystack = [task.title, task.reason, task.source].filter(Boolean).join(' ').toLowerCase()

  if (haystack.includes('рефлекс') || haystack.includes('state') || haystack.includes('inner')) {
    return 'reflection'
  }

  if (haystack.includes('ціль') || haystack.includes('goal') || haystack.includes('vision')) {
    return 'goal'
  }

  if (haystack.includes('identity') || haystack.includes('ідент') || haystack.includes('хто я')) {
    return 'identity'
  }

  return 'action'
}

function parseNudgeCount(notes: string | null | undefined): number {
  const matches = String(notes ?? '').match(/NUDGE_SENT:(\d+)/g) ?? []
  return matches.reduce((max, match) => {
    const value = Number(match.split(':')[1] ?? 0)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 0)
}

function hasDismissedNudges(notes: string | null | undefined): boolean {
  return String(notes ?? '').includes(NUDGE_DISMISSED_MARKER)
}

function appendUniqueNote(notes: string | null | undefined, marker: string): string {
  const normalized = String(notes ?? '').trim()
  if (normalized.includes(marker)) {
    return normalized
  }

  return normalized ? `${normalized}\n${marker}` : marker
}

function getUtcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function startOfUtcDay(date = new Date()) {
  const value = new Date(date)
  value.setUTCHours(0, 0, 0, 0)
  return value
}

function endOfUtcDay(date = new Date()) {
  const value = startOfUtcDay(date)
  value.setUTCDate(value.getUTCDate() + 1)
  return value
}

function hasTaskNudgeForDay(notes: string | null | undefined, taskId: string, dateKey = getUtcDayKey()): boolean {
  return String(notes ?? '').includes(`${NUDGE_TASK_DAY_PREFIX}${dateKey}:${taskId}`)
}

function hasWaveNudgeForDay(
  notes: string | null | undefined,
  wave: number,
  dateKey = getUtcDayKey(),
): boolean {
  return String(notes ?? '').includes(`${NUDGE_WAVE_DAY_PREFIX}${dateKey}:${wave}`)
}

function hasSignatureNudgeForDay(
  notes: string | null | undefined,
  signature: string,
  dateKey = getUtcDayKey(),
): boolean {
  return String(notes ?? '').includes(`${NUDGE_SIGNATURE_DAY_PREFIX}${dateKey}:${signature}`)
}

async function markTaskNudgeForDay(userId: string, taskId: string, dateKey = getUtcDayKey()): Promise<void> {
  const carrier = await getNudgeCarrier(userId)
  if (!carrier) return

  await prisma.funnelLead.update({
    where: { id: carrier.id },
    data: {
      notes: appendUniqueNote(carrier.notes, `${NUDGE_TASK_DAY_PREFIX}${dateKey}:${taskId}`),
    },
  })
}

async function markWaveNudgeForDay(userId: string, wave: number, dateKey = getUtcDayKey()): Promise<void> {
  const carrier = await getNudgeCarrier(userId)
  if (!carrier) return

  await prisma.funnelLead.update({
    where: { id: carrier.id },
    data: {
      notes: appendUniqueNote(carrier.notes, `${NUDGE_WAVE_DAY_PREFIX}${dateKey}:${wave}`),
    },
  })
}

async function markSignatureNudgeForDay(userId: string, signature: string, dateKey = getUtcDayKey()): Promise<void> {
  const carrier = await getNudgeCarrier(userId)
  if (!carrier) return

  await prisma.funnelLead.update({
    where: { id: carrier.id },
    data: {
      notes: appendUniqueNote(carrier.notes, `${NUDGE_SIGNATURE_DAY_PREFIX}${dateKey}:${signature}`),
    },
  })
}

async function getNudgeCarrier(userId: string) {
  return prisma.funnelLead.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      notes: true,
    },
  })
}

export async function getNudgeCount(userId: string): Promise<number> {
  const carrier = await getNudgeCarrier(userId)
  return parseNudgeCount(carrier?.notes)
}

export async function markNudgeSent(userId: string, step: number): Promise<void> {
  const carrier = await getNudgeCarrier(userId)
  if (!carrier) return

  await prisma.funnelLead.update({
    where: { id: carrier.id },
    data: {
      notes: appendUniqueNote(carrier.notes, `${NUDGE_MARKER_PREFIX}${step}`),
    },
  })
}

async function markNudgeDismissed(userId: string): Promise<void> {
  const carrier = await getNudgeCarrier(userId)
  if (!carrier) return

  await prisma.funnelLead.update({
    where: { id: carrier.id },
    data: {
      notes: appendUniqueNote(carrier.notes, NUDGE_DISMISSED_MARKER),
    },
  })
}

async function resolveSubscriptionStopStatus(userId: string): Promise<string | null> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { status: true },
  })

  return subscription?.status ?? null
}

async function resolveLastActivityHours(userId: string): Promise<number> {
  const [user, mentor, entry] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { lastLoginAt: true },
    }),
    prisma.userAiMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { lastInteractionAt: true },
    }),
    prisma.dailyEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ])

  const timestamps = [
    user?.lastLoginAt?.getTime(),
    mentor?.lastInteractionAt?.getTime(),
    entry?.createdAt?.getTime(),
  ].filter((value): value is number => Number.isFinite(value))

  if (!timestamps.length) {
    return Number.POSITIVE_INFINITY
  }

  const latestActivityAt = Math.max(...timestamps)
  return (Date.now() - latestActivityAt) / 3_600_000
}

async function resolveChatId(userId: string): Promise<string | null> {
  const link = await prisma.telegramLink.findFirst({
    where: { userId, isActive: true, chatId: { not: null } },
    orderBy: { updatedAt: 'desc' },
    select: { chatId: true },
  })

  return link?.chatId ?? null
}

export async function getOverdueTasks(userId: string): Promise<Task[]> {
  const rows = await listMicroTasksForUser(userId, 'all')

  return rows
    .filter(task => task.status === 'expired')
    .map((task) => {
      const createdAt = new Date(task.createdAt)
      const dueAt = task.dueAt ? new Date(task.dueAt) : createdAt
      const overdueHours = Math.max(0, (Date.now() - dueAt.getTime()) / 3_600_000)

      return {
        id: task.id,
        title: task.title,
        type: normalizeTaskType({
          title: task.title,
          reason: task.reason,
          source: task.source,
        }),
        createdAt,
        overdueHours,
      }
    })
}

async function isNudgeEligible(userId: string, lifecycleSnapshot = null as ReturnType<typeof resolveCentralLifecycleSnapshot> | null): Promise<boolean> {
  const now = new Date()
  if (!lifecycleSnapshot) {
    return false
  }

  if (!lifecycleSnapshot.reminderState.eligible) {
    return false
  }

  const systemState = await getUserSystemState(userId).catch(() => null)
  const mentorModulesLocked = systemState?.aiModules
    ?.filter(module => module.moduleId === 'AI_MENTOR')
    .every(module => module.isLocked)

  if (mentorModulesLocked) {
    return false
  }

  const subscriptionStatus = await resolveSubscriptionStopStatus(userId)
  if (subscriptionStatus && DISALLOWED_SUBSCRIPTION_STATUSES.has(subscriptionStatus)) {
    return false
  }

  if (lifecycleSnapshot.state !== 'trial' && lifecycleSnapshot.state !== 'active') {
    return false
  }
  const [access, preferences, user, latestSubscription] = await Promise.all([
    getUserAccess(userId),
    prisma.notificationPreference.findUnique({
      where: { userId },
      select: {
        telegramEnabled: true,
        aiRemindersEnabled: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        trialEndsAt: true,
      },
    }),
    prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        status: true,
        trialEndsAt: true,
        currentPeriodEnd: true,
      },
    }),
  ])

  if (user?.email?.startsWith('telegram-guest-')) {
    return false
  }

  const trialExpired = !!user?.trialEndsAt && user.trialEndsAt <= now
  const subscriptionExpired = latestSubscription?.status === 'EXPIRED'
    || latestSubscription?.status === 'CANCELED'
    || (!!latestSubscription?.currentPeriodEnd && latestSubscription.currentPeriodEnd <= now)
    || (!!latestSubscription?.trialEndsAt && latestSubscription.trialEndsAt <= now)

  if (trialExpired || subscriptionExpired) {
    return false
  }

  if (!access.abilities['mentor.core'] && !access.abilities['mentor.daily']) {
    return false
  }

  return Boolean(preferences?.telegramEnabled && preferences.aiRemindersEnabled)
}

function buildTaskSignature(tasks: Task[]): string {
  return tasks
    .map(task => task.title.trim().toLowerCase())
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 4)
    .join('|')
    .slice(0, 220)
}

function buildTaskNudgeTemplateKey(signature: string, dateKey = getUtcDayKey()) {
  return `task_nudge_${dateKey}_${signature || 'single'}`
}

async function hasAnyTaskNudgeForDay(userId: string, dateKey = getUtcDayKey()): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      channel: NotificationChannel.TELEGRAM,
      templateKey: {
        startsWith: `task_nudge_${dateKey}_`,
      },
      createdAt: {
        gte: startOfUtcDay(),
        lt: endOfUtcDay(),
      },
    },
    select: { id: true },
  })

  return Boolean(existing)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function buildNudgeMessage(task: Task): string {
  return [
    '<b>Збережи ритм одним кроком</b>',
    '',
    'Ось дія, яка поверне тебе в процес без перевантаження:',
    '',
    `<blockquote>${escapeHtml(task.title)}</blockquote>`,
    '',
    'Це займе приблизно 2 хвилини. Не потрібно рятувати весь день — достатньо повернути наступний крок.',
  ].join('\n')
}

function buildNudgeRecord(task: Task) {
  return {
    title: 'Поверни один крок і збережи ритм',
    body: `Займе 2 хвилини: ${task.title}`,
  }
}

async function hasTelegramNudgeRecord(userId: string, templateKey: string): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      channel: NotificationChannel.TELEGRAM,
      templateKey,
      createdAt: {
        gte: startOfUtcDay(),
        lt: endOfUtcDay(),
      },
    },
    select: { id: true },
  })

  return Boolean(existing)
}

async function hasReachedTelegramDailyLimit(userId: string, limit = 2): Promise<boolean> {
  const count = await prisma.notification.count({
    where: {
      userId,
      channel: NotificationChannel.TELEGRAM,
      status: NotificationStatus.SENT,
      createdAt: {
        gte: startOfUtcDay(),
        lt: endOfUtcDay(),
      },
    },
  })

  return count >= limit
}

async function sendNudgeMessage(userId: string, task: Task, templateKey: string, ctx?: Context): Promise<boolean> {
  const chatId = ctx?.chat?.id ? String(ctx.chat.id) : await resolveChatId(userId)
  if (!chatId) {
    return false
  }

  if (!(ctx?.chat?.id) && await hasTelegramNudgeRecord(userId, templateKey)) {
    return false
  }

  if (!(ctx?.chat?.id) && await hasReachedTelegramDailyLimit(userId)) {
    return false
  }

  await syncAccessAwareChatMenuButton(chatId, userId)

  const payload = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '▶️ ПРОДОВЖИТИ', callback_data: 'continue_task' }],
        [{ text: '✕ ЗАКРИТИ', callback_data: 'dismiss_task' }],
      ],
    },
  }

  if (ctx?.chat?.id) {
    await planMessage(
      ctx,
      'ctx.reply',
      'nudge_task',
      buildNudgeMessage(task),
      payload.reply_markup,
      'HTML',
    )
    return true
  }

  const sent = await conversationRenderer.renderOutbound({ chatId }, {
    text: null,
    buttons: [],
    cards: [{
      kind: 'message',
      text: buildNudgeMessage(task),
      parseMode: 'HTML',
      buttons: [
        { kind: 'callback', label: telegramContentRegistry.buttons.continueTask, value: 'continue_task' },
        { kind: 'callback', label: telegramContentRegistry.buttons.dismissTask, value: 'dismiss_task' },
      ],
    }],
    media: [],
    nextActions: [],
    telemetry: {},
    analytics: {},
  })

  if (!sent) {
    return false
  }

  const record = buildNudgeRecord(task)
  await notificationRecordService.create({
    userId,
    type: NotificationType.AI_REMINDER,
    title: record.title,
    body: record.body,
    channel: NotificationChannel.TELEGRAM,
    status: NotificationStatus.SENT,
    templateKey,
    sentAt: new Date(),
    data: {
      source: 'task_nudge',
      taskId: task.id,
    },
  })

  return true
}

export async function processNudges(userId: string, ctx?: Context): Promise<void> {
  const [carrier, lastActivityHours] = await Promise.all([
    getNudgeCarrier(userId),
    resolveLastActivityHours(userId),
  ])

  const lifecycle = await resolveUserLifecycle(userId)
  const lifecycleSnapshot = resolveCentralLifecycleSnapshot({ userLifecycle: lifecycle })

  if (!(await isNudgeEligible(userId, lifecycleSnapshot))) {
    return
  }

  if (!carrier || hasDismissedNudges(carrier.notes)) {
    return
  }

  const nudgeCount = parseNudgeCount(carrier.notes)
  if (nudgeCount >= NUDGE_THRESHOLDS_HOURS.length) {
    return
  }

  const dateKey = getUtcDayKey()
  const wave = nudgeCount + 1
  if (hasWaveNudgeForDay(carrier.notes, wave, dateKey)) {
    return
  }

  if (!ctx?.chat?.id && await hasAnyTaskNudgeForDay(userId, dateKey)) {
    return
  }

  const thresholdHours = NUDGE_THRESHOLDS_HOURS[nudgeCount]
  if (lastActivityHours < thresholdHours) {
    return
  }

  const tasks = await getOverdueTasks(userId)
  if (!tasks.length) {
    return
  }

  const signature = buildTaskSignature(tasks)
  if (signature && hasSignatureNudgeForDay(carrier.notes, signature, dateKey)) {
    return
  }

  const templateKey = buildTaskNudgeTemplateKey(signature, dateKey)
  if (await hasTelegramNudgeRecord(userId, templateKey)) {
    return
  }

  const bestTask = await pickBestTask(tasks, {
    state: lifecycleSnapshot.state,
    lastActivityHours,
  })

  if (hasTaskNudgeForDay(carrier.notes, bestTask.id, dateKey)) {
    return
  }

  const sent = await sendNudgeMessage(userId, bestTask, templateKey, ctx)
  if (!sent) {
    return
  }

  await markNudgeSent(userId, wave)
  await markWaveNudgeForDay(userId, wave, dateKey)
  await markTaskNudgeForDay(userId, bestTask.id, dateKey)
  if (signature) {
    await markSignatureNudgeForDay(userId, signature, dateKey)
  }
}

export async function dismissNudges(userId: string): Promise<void> {
  await markNudgeDismissed(userId)
}

export async function processScheduledNudges(): Promise<void> {
  const candidates = await prisma.microTask.findMany({
    where: {
      isCompleted: false,
      OR: [
        { status: 'expired' },
        { status: 'active', dueAt: { lt: new Date() } },
      ],
      user: {
        notificationPreference: {
          is: {
            telegramEnabled: true,
            aiRemindersEnabled: true,
          },
        },
      },
    },
    distinct: ['userId'],
    select: { userId: true },
  })

  for (const candidate of candidates) {
    await processNudges(candidate.userId)
  }
}

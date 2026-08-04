import type { Context, Telegraf } from 'telegraf'
import { Markup } from 'telegraf'

import { prisma } from '../../db/client.js'
import { sendUserTelegramMessage } from '../../lib/telegram.js'
import { coachOnly } from '../../middleware/coachOnly.middleware.js'
import {
  getCanonicalCoachMetrics,
  getFunnelStats,
  getLiveActivity,
  getOverviewStats,
  getRetentionStats,
} from '../../modules/analytics/service.js'
import {
  findCloudinaryZoomAudioById,
  ingestCloudinaryZoomAudio,
} from '../../modules/zoom/cloudinary-audio-ingest.service.js'
import { parseZoomPostReport } from '../../modules/zoom/zoomPostReport.types.js'
import { coachBotContent } from '../content/coachBot.content.js'
import { coachContent } from '../content/coachContent.content.js'
import {
  handleCoachContentAction,
  handleCoachContentCommand,
  handleCoachContentNote,
  handleCoachContentText,
  handleCoachContentZooms,
} from '../flows/contentPlanner.flow.js'
import { enqueueRuntimeOutboxItem } from '../../core/runtime/runtimeOutbox.js'

type CoachAccess = {
  id: string
  role: 'EXPERT' | 'SUPERADMIN'
  expertId: string | null
}

const coachPanelContent = coachBotContent

const KYIV_TZ = 'Europe/Kyiv'
const COACH_RUNTIME_ERROR_MESSAGE = coachBotContent.runtime.error
const REQUIRED_PANEL_SECTIONS = ['start', 'menu', 'schedule', 'nextWeek', 'analytics', 'stats', 'audio', 'users', 'notify', 'payments'] as const
const REQUIRED_PLANNER_SECTIONS = ['planner', 'buttons', 'note', 'mode', 'topics', 'prompts'] as const

let coachContentCatalogValidated = false

function readCoachTelegramAccessId(): string {
  return String(
    process.env.COACH_TELEGRAM_ID
    ?? process.env.TEST_COACH_MENTOR_TELEGRAM_ID
    ?? '',
  ).trim()
}

function maskTelegramToken(token: string | null | undefined): string | null {
  const normalized = String(token ?? '').trim()
  if (!normalized) return null
  if (normalized.length <= 8) return normalized
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`
}

export function validateCoachContentCatalog(): void {
  if (coachContentCatalogValidated) return
  coachContentCatalogValidated = true

  const missingPanelSections = REQUIRED_PANEL_SECTIONS.filter((key) => !(key in coachBotContent))
  const missingPlannerSections = REQUIRED_PLANNER_SECTIONS.filter((key) => !(key in coachContent))

  if (missingPanelSections.length === 0 && missingPlannerSections.length === 0) return

  console.error('[coach-panel] startup validation failed', {
    missingPanelSections,
    missingPlannerSections,
  })
}

function getCommandPayload(ctx: Context): string {
  const match = Array.isArray((ctx as { match?: unknown[] }).match)
    ? (ctx as { match?: unknown[] }).match
    : null
  if (!match) return ''
  return typeof match[1] === 'string' ? match[1].trim() : ''
}

function formatKyivDateTime(value: Date | string): string {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TZ,
  })
}

function safeText(value: string | null | undefined, fallback = '—'): string {
  const text = String(value ?? '').trim()
  return text || fallback
}

function formatMoney(value: number): string {
  return `€${value.toFixed(2)}`
}

function startOfWeekMonday(now = new Date()): Date {
  const kyivNow = new Date(now.toLocaleString('en-US', { timeZone: KYIV_TZ }))
  const date = new Date(kyivNow)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeekSunday(weekStart: Date): Date {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + 6)
  date.setHours(23, 59, 59, 999)
  return date
}

function startOfMonth(value: string): { from: Date; to: Date; label: string } | null {
  const normalized = value.trim()
  if (!/^\d{4}-\d{2}$/.test(normalized)) return null

  const [yearValue, monthValue] = normalized.split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthValue) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null
  }

  return {
    from: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)),
    to: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)),
    label: normalized,
  }
}

function resolvePublicApiBaseUrl(): string {
  const candidates = [
    process.env.PUBLIC_API_URL?.trim(),
    process.env.TELEGRAM_WEBHOOK_URL?.trim(),
    process.env.INTERNAL_API_URL?.trim(),
    'http://localhost:3001',
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      if (url.pathname === '/api') {
        url.pathname = '/'
      }
      return url.toString().replace(/\/$/, '')
    } catch {
      continue
    }
  }

  return 'http://localhost:3001'
}

function buildAudioStreamUrl(audioId: string, download = false): string {
  const base = resolvePublicApiBaseUrl()
  const url = new URL(`/api/audio/stream/${encodeURIComponent(audioId)}`, `${base}/`)
  if (download) {
    url.searchParams.set('download', '1')
  }
  return url.toString()
}

function splitPayload(payload: string): string[] {
  return payload.trim().split(/\s+/u).filter(Boolean)
}

async function replyOrEditPanelMessage(
  ctx: Context,
  text: string,
): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text).catch(() => undefined)
      return
    } catch (error) {
      console.error('[coach-panel:edit-fallback] failed', error)
    }
  }

  await ctx.reply(text).catch(() => undefined)
}

async function reportCoachRuntimeError(ctx: Context, scope: string, error: unknown): Promise<void> {
  console.error(`[coach-panel:${scope}] failed`, error)

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
  }

  await ctx.reply(COACH_RUNTIME_ERROR_MESSAGE).catch(() => undefined)
}

async function showCoachAudioLibraryHome(ctx: Context, coach: CoachAccess): Promise<void> {
  const months = await listCoachAudioLibraryMonths(coach)

  await replyOrEditPanelMessage(ctx, [
    '🎧 Аудіо ЗУМИ ФОКУС',
    '',
    'Натисни "Завантажити Zoom" і просто надішли файл у цей чат.',
    'Далі система сама зробить upload → transcript → analysis → content → library.',
    '',
    months.length > 0
      ? 'Нижче доступні місяці бібліотеки.'
      : 'У бібліотеці ще немає оброблених Zoom-аудіо.',
  ].join('\n'))

  if (months.length > 0) {
    await ctx.reply(
      'Бібліотека по місяцях:',
      Markup.inlineKeyboard(
        months.map((month) => [Markup.button.callback(formatMonthLabel(month), `coach-library:month:${month}`)]),
      ),
    ).catch(() => undefined)
  }
}

async function showCoachAudioLibraryMonth(ctx: Context, coach: CoachAccess, month: string): Promise<void> {
  const sessions = await listCoachAudioLibrarySessions(coach, month)
  if (sessions.length === 0) {
    await replyOrEditPanelMessage(ctx, `За ${month} оброблених Zoom-сесій поки немає.`)
    return
  }

  await replyOrEditPanelMessage(ctx, `📚 ${formatMonthLabel(month)}\n\nВибери Zoom-сесію:`)

  for (const session of sessions) {
    const report = session.report
    const text = [
      `• ${formatKyivDateTime(session.scheduledAt)} — ${session.topic}`,
      `  type: ${resolveZoomTypeLabel(report?.sessionType ?? session.type)}`,
      `  audio: ${report?.audioUrl || report?.audioFileId ? 'yes' : 'no'}`,
      `  transcript: ${report?.transcript ? 'yes' : 'no'}`,
      `  analysis: ${report?.summary || report?.coachReport ? 'yes' : 'no'}`,
    ].join('\n')

    await ctx.reply(
      text,
      Markup.inlineKeyboard([
        [Markup.button.callback('Відкрити картку Zoom', `coach-library:session:${session.id}:overview`)],
      ]),
    ).catch(() => undefined)
  }
}

async function showCoachAudioLibrarySession(ctx: Context, coach: CoachAccess, sessionId: string, section = 'overview'): Promise<void> {
  const session = await loadCoachAudioLibrarySession(coach, sessionId)
  if (!session) {
    await ctx.reply('❌ Zoom-сесію не знайдено.').catch(() => undefined)
    return
  }

  const report = session.report
  const audioId = report?.audioFileId ?? null
  const audioUrl = audioId ? buildAudioStreamUrl(audioId) : null
  const audioDownloadUrl = audioId ? buildAudioStreamUrl(audioId, true) : null
  const header = [
    `🎙 ${session.topic}`,
    `📅 ${formatKyivDateTime(session.scheduledAt)}`,
    `🎯 ${resolveZoomTypeLabel(report?.sessionType ?? session.type)}`,
  ].join('\n')

  let body = ''
  if (section === 'audio') {
    body = [
      header,
      '',
      report?.audioUrl || audioId
        ? `Аудіо готове${report?.audioDuration ? ` • ${Math.round(report.audioDuration)}s` : ''}.`
        : 'Аудіо ще не готове.',
    ].join('\n')
  } else if (section === 'transcript') {
    body = [
      header,
      '',
      '📝 Транскрипт',
      clipText(report?.transcript, 3500),
    ].join('\n')
  } else if (section === 'analysis') {
    body = [
      header,
      '',
      '📊 Аналіз',
      report?.summary ? `Summary: ${report.summary}` : 'Summary: —',
      '',
      report?.coachReport ? `Coach report:\n${clipText(report.coachReport, 2200)}` : 'Coach report: —',
    ].join('\n')
  } else if (section === 'content') {
    body = [
      header,
      '',
      '🎬 Контент',
      ...(report?.contentIdeas?.length
        ? report.contentIdeas.map((item, index) => `${index + 1}. ${item}`)
        : ['Ідей контенту поки немає.']),
    ].join('\n')
  } else if (section === 'insights') {
    body = [
      header,
      '',
      '📈 Інсайти',
      ...(report?.insights?.length ? ['Insights:', ...report.insights.map((item) => `• ${item}`)] : ['Insights: —']),
      '',
      ...(report?.wins?.length ? ['Wins:', ...report.wins.map((item) => `• ${item}`)] : ['Wins: —']),
      '',
      ...(report?.objections?.length ? ['Objections:', ...report.objections.map((item) => `• ${item}`)] : ['Objections: —']),
      '',
      ...(report?.recurringThemes?.length ? ['Recurring themes:', ...report.recurringThemes.map((item) => `• ${item}`)] : ['Recurring themes: —']),
    ].join('\n')
  } else {
    body = [
      header,
      '',
      `🎧 Аудіо: ${report?.audioUrl || audioId ? 'готове' : 'очікується'}`,
      `📝 Транскрипт: ${report?.transcript ? 'готовий' : 'очікується'}`,
      `📊 Аналіз: ${report?.summary || report?.coachReport ? 'готовий' : 'очікується'}`,
      `🎬 Контент: ${report?.contentIdeas?.length ? `${report.contentIdeas.length} ідей` : 'очікується'}`,
      `📈 Інсайти: ${report?.insights?.length ? `${report.insights.length} знайдено` : 'очікується'}`,
    ].join('\n')
  }

  const sectionKeyboard = buildCoachLibrarySectionsKeyboard(session.id)
  if ((section === 'audio' || section === 'overview') && audioUrl && audioDownloadUrl) {
    await ctx.reply(
      body,
      {
        reply_markup: {
          inline_keyboard: [
            [Markup.button.url('🎧 Слухати', audioUrl), Markup.button.url('💾 Завантажити', audioDownloadUrl)],
            ...sectionKeyboard.inline_keyboard,
          ],
        },
      },
    ).catch(() => undefined)
    return
  }

  await ctx.reply(body, { reply_markup: sectionKeyboard }).catch(() => undefined)
}

function withCoachRuntimeProtection<T extends Context>(
  scope: string,
  handler: (ctx: T) => Promise<unknown>,
) {
  return async (ctx: T): Promise<void> => {
    try {
      await handler(ctx)
    } catch (error) {
      await reportCoachRuntimeError(ctx, scope, error)
    }
  }
}

function formatUserRow(user: {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  telegramUserId: string | null
  telegramChatId: string | null
  telegramUserName: string | null
  role: string
  focusPaid: boolean
  expertId: string | null
  createdAt: Date
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Без імені'
  const telegram = user.telegramUserId ?? user.telegramChatId ?? user.telegramUserName ?? '—'

  return [
    `• ${name}`,
    `  id: ${user.id}`,
    `  email: ${user.email}`,
    `  tg: ${telegram}`,
    `  role: ${user.role}`,
    `  expert: ${user.expertId ?? '—'}`,
    `  focus: ${user.focusPaid ? 'yes' : 'no'}`,
    `  created: ${formatKyivDateTime(user.createdAt)}`,
  ].join('\n')
}

function resolveCoachExpertScopeId(coach: CoachAccess): string {
  return coach.expertId ?? coach.id
}

function formatMonthLabel(month: string): string {
  const [yearValue, monthValue] = month.split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthValue) - 1
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return month
  }

  return new Date(Date.UTC(year, monthIndex, 1)).toLocaleDateString('uk-UA', {
    month: 'long',
    year: 'numeric',
    timeZone: KYIV_TZ,
  })
}

function resolveZoomTypeLabel(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'INDIVIDUAL' || normalized === 'PRIVATE') return 'INDIVIDUAL'
  return 'GROUP'
}

function clipText(value: string | null | undefined, limit = 1400): string {
  const normalized = String(value ?? '').trim()
  if (!normalized) return '—'
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`
}

async function listCoachAudioLibraryMonths(coach: CoachAccess): Promise<string[]> {
  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId: resolveCoachExpertScopeId(coach),
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ scheduledAt: 'desc' }],
    select: {
      scheduledAt: true,
      postSessionReport: true,
    },
  })

  const months = new Set<string>()
  for (const session of sessions) {
    const report = parseZoomPostReport(session.postSessionReport)
    if (!report?.transcript && !report?.audioFileId && !report?.audioUrl) continue
    months.add(session.scheduledAt.toISOString().slice(0, 7))
  }

  return Array.from(months).sort((left, right) => right.localeCompare(left)).slice(0, 12)
}

async function listCoachAudioLibrarySessions(coach: CoachAccess, month: string) {
  const monthRange = startOfMonth(month)
  if (!monthRange) return []

  const sessions = await prisma.zoomSession.findMany({
    where: {
      expertId: resolveCoachExpertScopeId(coach),
      scheduledAt: { gte: monthRange.from, lte: monthRange.to },
      status: { not: 'CANCELLED' },
    },
    orderBy: [{ scheduledAt: 'desc' }],
    select: {
      id: true,
      scheduledAt: true,
      topic: true,
      type: true,
      postSessionReport: true,
    },
  })

  return sessions
    .map((session) => ({
      ...session,
      report: parseZoomPostReport(session.postSessionReport),
    }))
    .filter((session) => Boolean(session.report?.transcript || session.report?.audioFileId || session.report?.audioUrl))
}

async function loadCoachAudioLibrarySession(coach: CoachAccess, sessionId: string) {
  const session = await prisma.zoomSession.findFirst({
    where: {
      id: sessionId,
      expertId: resolveCoachExpertScopeId(coach),
      status: { not: 'CANCELLED' },
    },
    select: {
      id: true,
      scheduledAt: true,
      topic: true,
      type: true,
      status: true,
      postSessionReport: true,
    },
  })

  if (!session) return null
  return {
    ...session,
    report: parseZoomPostReport(session.postSessionReport),
  }
}

function buildCoachLibrarySectionsKeyboard(sessionId: string) {
  return {
    inline_keyboard: [
      [
        Markup.button.callback('🎧 Аудіо', `coach-library:session:${sessionId}:audio`),
        Markup.button.callback('📝 Транскрипт', `coach-library:session:${sessionId}:transcript`),
      ],
      [
        Markup.button.callback('📊 Аналіз', `coach-library:session:${sessionId}:analysis`),
        Markup.button.callback('🎬 Контент', `coach-library:session:${sessionId}:content`),
      ],
      [
        Markup.button.callback('📈 Інсайти', `coach-library:session:${sessionId}:insights`),
      ],
    ],
  }
}

async function resolveCoachAccess(ctx: Context): Promise<CoachAccess | null> {
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : ''
  if (!telegramUserId) return null

  const privilegedTelegramId = readCoachTelegramAccessId()
  const coach = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramUserId },
        { telegramChatId: telegramUserId },
      ],
    },
    select: { id: true, role: true, expertId: true },
  })

  if (!coach && privilegedTelegramId === telegramUserId) {
    const fallbackCoach = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'SUPERADMIN' },
          { role: 'EXPERT' },
        ],
      },
      orderBy: [
        { role: 'desc' },
        { createdAt: 'asc' },
      ],
      select: { id: true, role: true, expertId: true },
    })

    if (!fallbackCoach) return null
    if (fallbackCoach.role !== 'EXPERT' && fallbackCoach.role !== 'SUPERADMIN') return null
    return {
      id: fallbackCoach.id,
      role: fallbackCoach.role,
      expertId: fallbackCoach.expertId ?? null,
    }
  }

  if (!coach) return null
  if (coach.role !== 'EXPERT' && coach.role !== 'SUPERADMIN') return null
  return {
    id: coach.id,
    role: coach.role,
    expertId: coach.expertId ?? null,
  }
}

async function resolveCoachUserId(ctx: Context): Promise<string | null> {
  return (await resolveCoachAccess(ctx))?.id ?? null
}

function buildExpertScopeWhere(coach: CoachAccess) {
  return coach.role === 'EXPERT'
    ? { expertId: coach.expertId ?? coach.id }
    : {}
}

export async function handleCoachAudioCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [action] = splitPayload(payload.toLowerCase())
  const normalizedPayloadParts = splitPayload(payload)
  const monthQuery = normalizedPayloadParts.find((part) => /^\d{4}-\d{2}$/.test(part))

  if (action === 'run' || action === 'ingest' || action === 'sync') {
    await replyOrEditPanelMessage(ctx, coachPanelContent.audio.ingestStarted)
    const results = await ingestCloudinaryZoomAudio()
    const total = results.reduce((sum, item) => sum + item.returned, 0)
    const filtered = results.reduce((sum, item) => sum + item.filtered, 0)
    const accepted = results.reduce((sum, item) => sum + item.accepted, 0)
    const enqueued = results.reduce((sum, item) => sum + item.enqueued, 0)
    const duplicates = results.reduce((sum, item) => sum + item.duplicates, 0)

    await replyOrEditPanelMessage(ctx, [
      `🎧 ${coachPanelContent.audio.title}`,
      '',
      coachPanelContent.audio.ingestDone,
      `• folders: ${results.length}`,
      `• total: ${total}`,
      `• filtered: ${filtered}`,
      `• accepted: ${accepted}`,
      `• enqueued: ${enqueued}`,
      `• duplicates: ${duplicates}`,
    ].join('\n'))
    return true
  }

  if (monthQuery) {
    await showCoachAudioLibraryMonth(ctx, coach, monthQuery)
    return true
  }

  await showCoachAudioLibraryHome(ctx, coach)
  return true
}

async function enqueueCoachAudioUpload(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  const message = ('message' in ctx ? ctx.message : null) as Record<string, unknown> | null
  if (!coach || !chatId || !message) return false

  const audio = message.audio && typeof message.audio === 'object' ? message.audio as Record<string, unknown> : null
  const document = message.document && typeof message.document === 'object' ? message.document as Record<string, unknown> : null
  const voice = message.voice && typeof message.voice === 'object' ? message.voice as Record<string, unknown> : null

  const media = audio ?? document ?? voice
  if (!media) return false

  const mimeType = String(media.mime_type ?? '').trim() || null
  const fileName = String(media.file_name ?? '').trim() || (audio ? 'telegram-audio' : voice ? 'telegram-voice.ogg' : 'telegram-document')
  const isAudioLike = Boolean(audio || voice)
    || Boolean(mimeType && mimeType.startsWith('audio/'))
    || /\.(mp3|m4a|wav|ogg|oga|aac|flac|mp4|mpeg|webm)$/i.test(fileName)

  if (!isAudioLike) {
    await ctx.reply('Надішли аудіо Zoom у форматі audio або document з аудіо-файлом.').catch(() => undefined)
    return true
  }

  const fileId = String(media.file_id ?? '').trim()
  const fileUniqueId = String(media.file_unique_id ?? '').trim() || null
  if (!fileId) {
    await ctx.reply('Не вдалося прочитати файл Telegram. Спробуй надіслати його ще раз.').catch(() => undefined)
    return true
  }

  const messageId = typeof message.message_id === 'number' ? message.message_id : null
  const uploadedAt = typeof message.date === 'number'
    ? new Date(message.date * 1000)
    : new Date()
  const coachBotToken = String(process.env.COACH_BOT_TOKEN ?? '').trim()
  const coachBotId = coachBotToken.split(':')[0] || null
  const coachBotUsername = String(process.env.COACH_BOT_NAME ?? '').trim() || null

  console.info('[ZOOM_AUDIO_TELEGRAM] update:received', {
    botInstance: 'coachBot',
    botUsername: coachBotUsername,
    botId: coachBotId,
    tokenHash: maskTelegramToken(coachBotToken),
    fileId,
    fileUniqueId,
    messageId,
    chatId,
  })

  const mediaType = audio
    ? 'audio'
    : voice
      ? 'voice'
      : 'document_audio'

  const outbox = await enqueueRuntimeOutboxItem({
    scope: 'zoom_audio_ingest',
    type: 'ZOOM_AUDIO_UPLOADED',
    source: 'telegram',
    userId: coach.id,
    state: 'uploaded',
    tenantId: chatId,
    runtime: {
      requestFingerprint: fileUniqueId ?? fileId,
      orchestrationPath: ['coach_bot_zoom_audio_upload', chatId],
    },
    payload: {
      fileId,
      fileUniqueId,
      chatId,
      messageId,
      mediaType,
      fileName,
      mimeType,
      caption: typeof message.caption === 'string' ? message.caption : null,
      source: 'telegram',
      observedAt: uploadedAt.toISOString(),
      uploadedAt: uploadedAt.toISOString(),
      duration: typeof media.duration === 'number' ? media.duration : null,
      sizeBytes: typeof media.file_size === 'number' ? media.file_size : null,
    },
  })

  if (outbox.duplicate) {
    await ctx.reply('Цей файл уже в обробці або вже був завантажений.').catch(() => undefined)
    return true
  }

  await ctx.reply([
    '🎧 Zoom-аудіо прийнято.',
    'Далі під капотом підуть upload → transcript → analysis → content → library.',
    'Статус я надішлю сюди в цей чат.',
  ].join('\n')).catch(() => undefined)
  return true
}

async function handleCoachAudioAction(ctx: Context, action: string): Promise<boolean> {
  const parts = action.split(':')
  const intent = parts[1] ?? ''
  const audioId = parts.slice(2).join(':').trim()
  if (!audioId) return false

  const item = await findCloudinaryZoomAudioById(audioId)
  if (!item) {
    await ctx.answerCbQuery('Аудіо не знайдено').catch(() => undefined)
    await ctx.reply('❌ Не вдалося знайти аудіо. Спробуй оновити список через /audio.').catch(() => undefined)
    return true
  }

  const playUrl = buildAudioStreamUrl(item.assetId)
  const downloadUrl = buildAudioStreamUrl(item.assetId, true)
  const isDownload = intent === 'audio-download'
  const primaryLabel = isDownload ? '💾 Завантажити аудіо' : '🎧 Слухати аудіо'
  const primaryUrl = isDownload ? downloadUrl : playUrl

  await ctx.answerCbQuery(isDownload ? 'Готую download' : 'Відкриваю аудіо').catch(() => undefined)
  await ctx.reply(
    [
      `🎧 ${item.fileName}`,
      '',
      isDownload ? 'Завантаж аудіо за кнопкою нижче.' : 'Відкрий аудіо за кнопкою нижче.',
    ].join('\n'),
    Markup.inlineKeyboard([
      [Markup.button.url(primaryLabel, primaryUrl)],
      [Markup.button.url('💾 Завантажити', downloadUrl)],
    ]),
  ).catch(() => undefined)
  return true
}

export async function handleCoachUsersCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const normalized = payload.trim()
  const searchQuery = normalized.toLowerCase().startsWith('search ')
    ? normalized.slice(7).trim()
    : normalized

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
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
      email: true,
      telegramUserId: true,
      telegramChatId: true,
      telegramUserName: true,
      role: true,
      focusPaid: true,
      expertId: true,
      createdAt: true,
    },
  })

  const header = searchQuery
    ? `${coachPanelContent.users.searchHeader}: ${searchQuery}`
    : coachPanelContent.users.listHeader

  if (users.length === 0) {
    await replyOrEditPanelMessage(ctx, [
      `👥 ${coachPanelContent.users.title}`,
      '',
      header,
      '',
      coachPanelContent.users.empty,
      '',
      coachPanelContent.users.usage,
    ].join('\n'))
    return true
  }

  await replyOrEditPanelMessage(ctx, [
    `👥 ${coachPanelContent.users.title}`,
    '',
    header,
    '',
    ...users.map(user => formatUserRow(user)),
  ].join('\n\n'))
  return true
}

export async function handleCoachNotifyCommand(ctx: Context, payload = ''): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [mode, ...rest] = splitPayload(payload)
  if (!mode) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }
  const normalizedMode = mode.toLowerCase()
  const message = rest.join(' ').trim()

  if (!normalizedMode || (normalizedMode !== 'all' && normalizedMode !== 'user')) {
    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.usage,
    ].join('\n'))
    return true
  }

  if (!message) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  if (normalizedMode === 'all') {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        telegramEnabled: true,
        telegramChatId: { not: null },
        ...buildExpertScopeWhere(coach),
      },
      select: {
        id: true,
        telegramChatId: true,
      },
    })

    let delivered = 0
    let failed = 0

    for (const user of users) {
      if (!user.telegramChatId) {
        failed += 1
        continue
      }

      const sent = await sendUserTelegramMessage(user.telegramChatId, message).catch(() => false)
      if (sent) {
        delivered += 1
      } else {
        failed += 1
      }
    }

    await replyOrEditPanelMessage(ctx, [
      `🔔 ${coachPanelContent.notify.title}`,
      '',
      coachPanelContent.notify.done,
      `• delivered: ${delivered}`,
      `• failed: ${failed}`,
      `• scope: ${coach.role === 'SUPERADMIN' ? 'all users' : 'expert users'}`,
    ].join('\n'))
    return true
  }

  const [target, ...messageParts] = rest
  const targetMessage = messageParts.join(' ').trim()
  if (!target || !targetMessage) {
    await replyOrEditPanelMessage(ctx, coachPanelContent.notify.usage)
    return true
  }

  const recipient = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      ...buildExpertScopeWhere(coach),
      OR: [
        { id: target },
        { email: { equals: target, mode: 'insensitive' } },
        { telegramUserId: target },
        { telegramChatId: target },
        { telegramUserName: { equals: target.replace(/^@/, ''), mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      email: true,
      telegramChatId: true,
    },
  })

  if (!recipient?.telegramChatId) {
    await replyOrEditPanelMessage(ctx, 'Користувача не знайдено або в нього немає Telegram chatId.')
    return true
  }

  const sent = await sendUserTelegramMessage(recipient.telegramChatId, targetMessage).catch(() => false)
  await replyOrEditPanelMessage(ctx, [
    `🔔 ${coachPanelContent.notify.title}`,
    '',
    sent ? coachPanelContent.notify.done : '❌ Не вдалося надіслати повідомлення.',
    `• target: ${recipient.email}`,
    `• userId: ${recipient.id}`,
  ].join('\n'))
  return true
}

export async function handleCoachStatsCommand(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [overview, funnel, retention, liveActivity, canonical] = await Promise.all([
    getOverviewStats('30d'),
    getFunnelStats('30d'),
    getRetentionStats('30d'),
    getLiveActivity(5),
    getCanonicalCoachMetrics(),
  ])

  const funnelSummary = funnel.stages
    .map(stage => `${stage.stage}:${stage.users} (${stage.conversionRate}%)`)
    .join(' | ')

  const liveSummary = liveActivity.length > 0
    ? liveActivity
      .map(item => `• ${formatKyivDateTime(item.createdAt)} — ${item.type} — ${safeText(item.user.label)}`)
      .join('\n')
    : '—'

    await replyOrEditPanelMessage(ctx, [
      `📊 ${coachPanelContent.analytics.title}`,
      '',
      `👥 ${coachPanelContent.analytics.total}: ${canonical.totalUsers}`,
      `🔬 ${coachPanelContent.analytics.inTest}: ${canonical.testInProgress}`,
      `✅ ${coachPanelContent.analytics.testDone}: ${canonical.testCompleted}`,
      `💳 ${coachPanelContent.analytics.focusPaid}: ${canonical.focusPaid}`,
      `🎥 ${coachPanelContent.analytics.zoomActive}: ${canonical.activeZoomUsers}`,
      `📈 ${coachPanelContent.analytics.conversion}: ${canonical.testToFocusConversion}%`,
      `🚀 ${coachPanelContent.analytics.abSystemUpgrades}: ${canonical.abSystemUpgrades}`,
      `💰 ${coachPanelContent.analytics.revenue}: ${formatMoney(canonical.revenueCents / 100)}`,
      `📆 ${coachPanelContent.analytics.mrr}: ${formatMoney(canonical.mrr)}`,
      '',
      `🆕 ${coachPanelContent.stats.newUsers}: ${overview.newUsers}`,
      `⏱️ ${coachPanelContent.stats.avgActions}: ${overview.avgActionsPerUser}`,
      `🔁 ${coachPanelContent.stats.streakUsers}: ${overview.streakUsers}`,
      '',
      `${coachPanelContent.stats.retention}: D1 ${retention.day1}% | D3 ${retention.day3}% | D7 ${retention.day7}%`,
      '',
      `${coachPanelContent.stats.funnel}: ${funnelSummary}`,
      '',
      `${coachPanelContent.stats.liveActivity}:`,
      liveSummary,
    ].join('\n'))
  return true
}

export async function handleCoachPaymentsCommand(ctx: Context): Promise<boolean> {
  const coach = await resolveCoachAccess(ctx)
  const chatId = ctx.chat?.id ? String(ctx.chat.id) : ''
  if (!coach || !chatId) return false

  const [active, trial, pastDue, canceled, expired, recentPurchases] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIAL' } }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { status: 'CANCELED' } }),
    prisma.subscription.count({ where: { status: 'EXPIRED' } }),
    prisma.purchaseHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        userId: true,
        productId: true,
        amountCents: true,
        currency: true,
        createdAt: true,
      },
    }),
  ])

  const recentLines = recentPurchases.length > 0
    ? recentPurchases.map((purchase) => {
      const amount = Number.isFinite(Number(purchase.amountCents))
        ? (Number(purchase.amountCents) / 100).toFixed(0)
        : '0'
      return `• ${formatKyivDateTime(purchase.createdAt)} — ${purchase.productId ?? 'unknown'} — ${amount} ${purchase.currency} — ${purchase.userId}`
    }).join('\n')
    : coachPanelContent.payments.noData

  await replyOrEditPanelMessage(ctx, [
    `💳 ${coachPanelContent.payments.title}`,
    '',
    `ACTIVE: ${active}`,
    `TRIAL: ${trial}`,
    `PAST_DUE: ${pastDue}`,
    `CANCELED: ${canceled}`,
    `EXPIRED: ${expired}`,
    '',
    'Recent purchases:',
    recentLines,
  ].join('\n'))
  return true
}

async function handleCoachPanelAction(ctx: Context, action: string): Promise<boolean> {
  if (action === 'coach-content:users') {
    await ctx.answerCbQuery('Users').catch(() => undefined)
    return handleCoachUsersCommand(ctx, '')
  }

  if (action === 'coach-content:notify') {
    await ctx.answerCbQuery('Notify').catch(() => undefined)
    return handleCoachNotifyCommand(ctx, '')
  }

  if (action === 'coach-content:audio') {
    await ctx.answerCbQuery('Audio').catch(() => undefined)
    return handleCoachAudioCommand(ctx, '')
  }

  if (action.startsWith('coach-library:month:')) {
    const month = action.replace('coach-library:month:', '').trim()
    await ctx.answerCbQuery('Місяць').catch(() => undefined)
    const coach = await resolveCoachAccess(ctx)
    if (!coach) return false
    await showCoachAudioLibraryMonth(ctx, coach, month)
    return true
  }

  if (action.startsWith('coach-library:session:')) {
    const [, , sessionId, section = 'overview'] = action.split(':')
    await ctx.answerCbQuery('Zoom card').catch(() => undefined)
    const coach = await resolveCoachAccess(ctx)
    if (!coach || !sessionId) return false
    await showCoachAudioLibrarySession(ctx, coach, sessionId, section)
    return true
  }

  if (action.startsWith('coach-content:audio-play:') || action.startsWith('coach-content:audio-download:')) {
    return handleCoachAudioAction(ctx, action)
  }

  if (action === 'coach-content:planner') {
    await ctx.answerCbQuery('Planner').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'WEEKLY_PLAN')
  }

  if (action === 'coach-content:monthly') {
    await ctx.answerCbQuery('Monthly plan').catch(() => undefined)
    return handleCoachContentCommand(ctx, 'MONTHLY_PLAN')
  }

  if (action === 'coach-content:payments') {
    await ctx.answerCbQuery('Payments').catch(() => undefined)
    return handleCoachPaymentsCommand(ctx)
  }

  return handleCoachContentAction(ctx, action)
}

export function registerCoachContentHandlers(telegramBot: Telegraf): void {
  validateCoachContentCatalog()

  telegramBot.hears(/^(?:🎬\s*)?Контент$/iu, coachOnly, withCoachRuntimeProtection('menu:content', async (ctx) => {
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN')
  }))

  telegramBot.hears(/^\/planner(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:planner', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/планер(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:планер', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'WEEKLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/місяць(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:місяць', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/monthly(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:monthly', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'MONTHLY_PLAN', payload)
  }))

  telegramBot.hears(/^\/reels(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:reels', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'REELS_IDEAS', payload)
  }))

  telegramBot.hears(/^\/контент(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:контент', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentCommand(ctx, 'FULL_CONTENT', payload)
  }))

  telegramBot.hears(/^\/зуми(?:@\w+)?$/iu, coachOnly, withCoachRuntimeProtection('command:зуми', async (ctx) => {
    await handleCoachContentZooms(ctx)
  }))

  telegramBot.hears(/^\/audio(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:audio', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachAudioCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/users(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:users', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachUsersCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/notify(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:notify', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachNotifyCommand(ctx, payload)
  }))

  telegramBot.hears(/^\/stats(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:stats', async (ctx) => {
    await handleCoachStatsCommand(ctx)
  }))

  telegramBot.hears(/^\/payments(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:payments', async (ctx) => {
    await handleCoachPaymentsCommand(ctx)
  }))

  telegramBot.hears(/^\/нотатка(?:@\w+)?(?:\s+(.*))?$/iu, coachOnly, withCoachRuntimeProtection('command:нотатка', async (ctx) => {
    const payload = getCommandPayload(ctx)
    await handleCoachContentNote(ctx, payload)
  }))

  telegramBot.action(/^coach-content:/, coachOnly, async (ctx) => {
    const raw = 'data' in ctx.callbackQuery ? String(ctx.callbackQuery.data ?? '') : ''
    try {
      const handled = await handleCoachPanelAction(ctx, raw)
      if (!handled) {
        await ctx.answerCbQuery().catch(() => undefined)
      }
    } catch (error) {
      await reportCoachRuntimeError(ctx, raw || 'coach-content:unknown', error)
    }
  })

  telegramBot.on('text', coachOnly, async (ctx, next) => {
    try {
      await handleCoachContentText(ctx, async () => { await next() })
    } catch (error) {
      await reportCoachRuntimeError(ctx, 'text', error)
    }
  })

  telegramBot.on(['audio', 'document', 'voice'], coachOnly, withCoachRuntimeProtection('media:zoom-audio-upload', async (ctx) => {
    await enqueueCoachAudioUpload(ctx)
  }))
}

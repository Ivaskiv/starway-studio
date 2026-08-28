import type { Context } from 'telegraf'
import { Markup } from 'telegraf'

import { enqueueRuntimeOutboxItem } from '../../../core/runtime/outbox.js'
import { prisma } from '../../../db/client.js'
import { readCoachBotName, readCoachBotToken } from '../../../modules/telegram-mentor/runtime/botConfig.js'
import {
  findCloudinaryZoomAudioById,
  ingestCloudinaryZoomAudio,
} from '../../../modules/zoom/audio/cloudinary-audio-ingest.service.js'
import { parseZoomPostReport } from '../../../modules/zoom/reports/zoomPostReport.types.js'
import {
  type CoachAccess,
  buildAudioStreamUrl,
  clipText,
  coachPanelContent,
  formatKyivDateTime,
  formatMonthLabel,
  maskTelegramToken,
  resolveCoachAccess,
  resolveCoachExpertScopeId,
  resolveZoomTypeLabel,
  replyOrEditPanelMessage,
  splitPayload,
  startOfMonth,
} from './shared.js'

export async function showCoachAudioLibraryHome(ctx: Context, coach: CoachAccess): Promise<void> {
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

export async function showCoachAudioLibraryMonth(ctx: Context, coach: CoachAccess, month: string): Promise<void> {
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

export async function showCoachAudioLibrarySession(ctx: Context, coach: CoachAccess, sessionId: string, section = 'overview'): Promise<void> {
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
            [Markup.button.url('Слухати', audioUrl), Markup.button.url('Завантажити', audioDownloadUrl)],
            ...sectionKeyboard.inline_keyboard,
          ],
        },
      },
    ).catch(() => undefined)
    return
  }

  await ctx.reply(body, { reply_markup: sectionKeyboard }).catch(() => undefined)
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
        Markup.button.callback('Аудіо', `coach-library:session:${sessionId}:audio`),
        Markup.button.callback('Транскрипт', `coach-library:session:${sessionId}:transcript`),
      ],
      [
        Markup.button.callback('Аналіз', `coach-library:session:${sessionId}:analysis`),
        Markup.button.callback('Контент', `coach-library:session:${sessionId}:content`),
      ],
      [
        Markup.button.callback('Інсайти', `coach-library:session:${sessionId}:insights`),
      ],
    ],
  }
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

export async function enqueueCoachAudioUpload(ctx: Context): Promise<boolean> {
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
  const coachBotToken = readCoachBotToken()
  const coachBotId = coachBotToken.split(':')[0] || null
  const coachBotUsername = readCoachBotName() || null

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

export async function handleCoachAudioAction(ctx: Context, action: string): Promise<boolean> {
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
      [Markup.button.url('Завантажити', downloadUrl)],
    ]),
  ).catch(() => undefined)
  return true
}

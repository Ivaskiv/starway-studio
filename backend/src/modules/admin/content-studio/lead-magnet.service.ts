import { prisma } from '../../../db/client.js'
import { logger } from '../../../utils/logger.js'
import { trackEvent } from '../../events/service.js'
import { createLeadMagnetLandingCard } from '../../landing/cards/landingController.js'
import { startLeadMagnet } from '../../telegram-mentor/flows/leadMagnet.flow.js'
import type { LeadMagnetPreviewPayload,LeadMagnetPublishResult,LeadMagnetStatus } from './service.js'

function buildLeadMagnetContentText(payload: LeadMagnetPreviewPayload): string {
  return [
    payload.title,
    '',
    `Продукт: ${payload.productLabel}`,
    `Статус: ${payload.status}`,
    `Формат: ${payload.formatLabel}`,
    `Крок ламається тут: ${payload.funnelStepLabel}`,
    `Реальна конверсія: ${payload.realConversion}`,
    `Ідеальний орієнтир: ${payload.idealConversion}`,
    `Вибірка: ${payload.sampleSize}`,
    `Куди ведемо: ${payload.destinations.join(' · ')}`,
    '',
    `Обіцянка: ${payload.promise}`,
    `Hook: ${payload.structure.hook}`,
    `Пояснення: ${payload.structure.explanation}`,
    `Результат: ${payload.structure.result}`,
    `Перехід у продукт: ${payload.structure.transitionToProduct}`,
    '',
    `Кроки: ${payload.structure.steps.join(' · ')}`,
    '',
    `Що робити: ${payload.arguments.join(' · ')}`,
    '',
    payload.telegramMessage,
    '',
    `Підтвердження: ${payload.confirmations.join(' · ')}`,
    '',
    `AI Інсайт: ${payload.aiInsight}`,
  ].join('\n')
}

async function sendTelegramTextMessage(params: {
  token: string
  chatId: string
  text: string
}): Promise<{ ok: boolean; messageId: number | null }> {
  const token = params.token.trim()
  const chatId = params.chatId.trim()

  if (!token || !chatId) {
    return { ok: false, messageId: null }
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: params.text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`TELEGRAM_SEND_FAILED: ${body}`)
  }

  const json = await response.json().catch(() => null) as { ok?: boolean; result?: { message_id?: number } } | null
  return { ok: Boolean(json?.ok), messageId: json?.result?.message_id ?? null }
}

async function upsertLeadMagnetContentItem(params: {
  userId: string
  payload: LeadMagnetPreviewPayload
  publishStatus: LeadMagnetStatus
}): Promise<{ id: string; createdAt: Date }> {
  const content = buildLeadMagnetContentText(params.payload)
  const topic = params.payload.productLabel?.trim() || params.payload.title.trim()

  const existing = await prisma.contentItem.findFirst({
    where: {
      userId: params.userId,
      type: 'lead_magnet',
      topic,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  }).catch(() => null)

  if (existing?.id) {
    const updated = await prisma.contentItem.update({
      where: { id: existing.id },
      data: {
        content,
        platform: 'telegram',
        status: params.publishStatus,
        topic,
      },
      select: { id: true, createdAt: true },
    })

    return updated
  }

  const created = await prisma.contentItem.create({
    data: {
      userId: params.userId,
      type: 'lead_magnet',
      topic,
      platform: 'telegram',
      status: params.publishStatus,
      content,
    },
    select: { id: true, createdAt: true },
  })

  return created
}

export async function saveLeadMagnetDraft(params: {
  userId: string
  payload: LeadMagnetPreviewPayload
}): Promise<LeadMagnetPublishResult> {
  const saved = await upsertLeadMagnetContentItem({
    userId: params.userId,
    payload: params.payload,
    publishStatus: params.payload.status === 'approved' || params.payload.status === 'published'
      ? params.payload.status
      : 'review',
  })

  return {
    contentItemId: saved.id,
    status: 'draft',
    savedAt: new Date().toISOString(),
    telegramSent: false,
  }
}

export async function testLeadMagnetTelegram(params: {
  userId: string
  payload: LeadMagnetPreviewPayload
  telegramToken: string
  telegramChatId: string
}): Promise<LeadMagnetPublishResult> {
  const saved = await upsertLeadMagnetContentItem({
    userId: params.userId,
    payload: params.payload,
    publishStatus: 'draft',
  })

  const text = params.payload.telegramMessage || buildLeadMagnetContentText(params.payload)
  const sent = await sendTelegramTextMessage({
    token: params.telegramToken,
    chatId: params.telegramChatId,
    text,
  })

  await prisma.event.create({
    data: {
      userId: params.userId,
      type: 'content_studio_lead_magnet_tested',
      source: 'web',
      payload: {
        contentItemId: saved.id,
        formatKey: params.payload.formatKey,
        telegramChatId: params.telegramChatId,
      },
    },
  }).catch((error) => {
    logger.warn('[content-studio] failed to track lead magnet test', error)
  })

  return {
    contentItemId: saved.id,
    status: 'draft',
    savedAt: new Date().toISOString(),
    telegramSent: sent.ok,
    telegramMessageId: sent.messageId,
  }
}

export async function publishLeadMagnet(params: {
  userId: string
  payload: LeadMagnetPreviewPayload
  telegramToken?: string
  telegramChatId?: string
}): Promise<LeadMagnetPublishResult> {
  if (params.payload.status !== 'approved') {
    throw new Error('lead_magnet_not_approved')
  }

  const saved = await upsertLeadMagnetContentItem({
    userId: params.userId,
    payload: params.payload,
    publishStatus: 'published',
  })

  const text = params.payload.telegramMessage || buildLeadMagnetContentText(params.payload)
  const shouldSendTelegram = params.payload.destinations.includes('telegram_bot')
  const sent = shouldSendTelegram && params.telegramToken && params.telegramChatId
    ? await sendTelegramTextMessage({
        token: params.telegramToken,
        chatId: params.telegramChatId,
        text,
      })
    : { ok: false, messageId: null }

  if (params.payload.destinations.includes('telegram_bot') && params.telegramChatId) {
    await startLeadMagnet(params.userId, params.telegramChatId, params.payload.title).catch((error) => {
      logger.warn('[content-studio] failed to start lead magnet flow', error)
    })
  }

  if (params.payload.destinations.includes('landing_page')) {
    await createLeadMagnetLandingCard({
      userId: params.userId,
      title: params.payload.title,
      url: `/dashboard/mentor/landing?leadMagnet=${saved.id}`,
      price: 0,
    }).catch((error) => {
      logger.warn('[content-studio] failed to create lead magnet landing card', error)
    })
  }

  if (params.payload.destinations.includes('dm_script')) {
    await trackEvent({
      userId: params.userId,
      type: 'content_studio_dm_script_generated',
      source: 'web',
      payload: {
        contentItemId: saved.id,
        formatKey: params.payload.formatKey,
        productLabel: params.payload.productLabel,
      },
    }).catch((error) => {
      logger.warn('[content-studio] failed to track DM script generation', error)
    })
  }

  await prisma.event.create({
    data: {
      userId: params.userId,
      type: 'content_studio_lead_magnet_published',
      source: 'web',
      payload: {
        contentItemId: saved.id,
        formatKey: params.payload.formatKey,
        telegramChatId: params.telegramChatId,
        destinations: params.payload.destinations,
        productLabel: params.payload.productLabel,
      },
    },
  }).catch((error) => {
    logger.warn('[content-studio] failed to track lead magnet publish', error)
  })

  return {
    contentItemId: saved.id,
    status: 'published',
    savedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    telegramSent: sent.ok,
    telegramMessageId: sent.messageId,
  }
}

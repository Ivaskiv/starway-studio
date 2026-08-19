import { createHash } from 'node:crypto'
import type { Telegraf } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { getBotLink } from '../../../lib/telegram.js'
import { sendTelegramMessage } from '../../../lib/telegram/messageFormatter.js'
import { ZoomStatus } from '@starway/db/prisma-client'
import type { ZoomSession } from '../types.js'

const KYIV_TIME_ZONE = 'Europe/Kyiv'
const CHANNEL_POST_SYNC_TTL_MS = 60_000

let channelPostSyncInFlight: Promise<void> | null = null
let lastChannelPostSyncSignature = ''
let lastChannelPostSyncAt = 0
let lastChannelPostContentHash = ''

function isGroupPracticeRequest(requests: unknown): boolean {
  if (!requests || Array.isArray(requests) || typeof requests !== 'object') {
    return false
  }

  return (requests as Record<string, unknown>).type === 'group_practice'
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
    ? [
        'Наступна Zoom-практика:',
        formatFocusChannelNextSessionLine(nextGroupPractice.scheduledAt),
      ]
    : ['Щопонеділка Zoom-практика · 19:00']

  return [
    'ФОКУС',
    '',
    ...nextSessionLine,
    '',
    'Повернися в чат-бот та обери найближчу практику і забронюй місце.',
  ].join('\n')
}

function formatFocusChannelNextSessionLine(date: Date): string {
  const weekday = date.toLocaleDateString('uk-UA', {
    weekday: 'long',
    timeZone: KYIV_TIME_ZONE,
  })
  const dayMonth = date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    timeZone: KYIV_TIME_ZONE,
  })
  const time = date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KYIV_TIME_ZONE,
  })

  return `${capitalizeLabel(weekday)}, ${dayMonth} · ${time}`
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
    const mainBotUrl = getBotLink() || 'https://t.me/Test_ABsystem_bot'
    const syncSignature = JSON.stringify({ channelId, text, mainBotUrl })
    const now = Date.now()

    if (
      lastChannelPostSyncSignature === syncSignature &&
      now - lastChannelPostSyncAt < CHANNEL_POST_SYNC_TTL_MS
    ) {
      console.log('[syncChannelPost] skipped: identical payload within ttl')
      return
    }

    const replyMarkup = {
      inline_keyboard: [[{ text: 'ПОВЕРНУТИСЯ', url: mainBotUrl }]],
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
      const sent = await sendTelegramMessage(telegramBot, channelId, text, {
        replyMarkup: replyMarkup,
        disableWebPagePreview: true,
      }) as { message_id: number }
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
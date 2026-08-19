import { ZoomStatus } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import {
  handleFocusChannelJoinByTelegramUserId,
} from '../../subscriptions/payments/callback/notifications.js'
import {
  createFullSession,
  updateSession,
} from '../../zoom/service.js'
import {
  parseZoomChannelPost,
} from '../../zoom/shared/zoom.channel-parser.js'
import { handleNotebookChannelPost } from './notebook.js'

function hasStructuredFields(text: string): boolean {
 const lowered = text.toLowerCase()
 return (
 lowered.includes('дата:') &&
 lowered.includes('час:') &&
 lowered.includes('тема:')
 )
}

export function registerChannelHandlers(): void {
  const isParticipantStatus = (status: string | undefined): boolean =>
      status === 'member' ||
      status === 'administrator' ||
      status === 'creator' ||
      status === 'restricted'

    const handleChannelJoinUpdate = async (ctx: Context) => {
      const update = ctx.update as {
        chat_member?: {
          chat?: { id?: number | string }
          old_chat_member?: { status?: string }
          new_chat_member?: { status?: string; user?: { id?: number | string } }
        }
        my_chat_member?: {
          chat?: { id?: number | string }
          old_chat_member?: { status?: string }
          new_chat_member?: { status?: string; user?: { id?: number | string } }
        }
      }

      const memberUpdate = update.chat_member ?? update.my_chat_member
      if (!memberUpdate) return

      const oldStatus = memberUpdate.old_chat_member?.status
      const newStatus = memberUpdate.new_chat_member?.status
      const becameParticipant =
        !isParticipantStatus(oldStatus) && isParticipantStatus(newStatus)
      if (!becameParticipant) return

      const telegramUserId = String(
        memberUpdate.new_chat_member?.user?.id ?? ''
      ).trim()
      const chatId = String(memberUpdate.chat?.id ?? '').trim()
      if (!telegramUserId || !chatId) return

      await handleFocusChannelJoinByTelegramUserId(telegramUserId, chatId).catch(
        (error) => {
          logger.warn('[focus:block12:post-join] failed', error)
        }
      )
    }

    bot.on('chat_member', async (ctx) => {
      await handleChannelJoinUpdate(ctx)
    })

    bot.on('my_chat_member', async (ctx) => {
      await handleChannelJoinUpdate(ctx)
    })

    bot.on('channel_post', async (ctx) => {
      try {
        const post = (
          ctx.update as {
            channel_post?: {
              chat?: { id?: number | string }
              message_id?: number
              text?: string
              caption?: string | null
              from?: { id?: number | string }
              voice?: {
                file_id?: string
                file_unique_id?: string
                mime_type?: string | null
              }
              audio?: {
                file_id?: string
                file_unique_id?: string
                mime_type?: string | null
                file_name?: string | null
              }
              document?: {
                file_id?: string
                file_unique_id?: string
                mime_type?: string | null
                file_name?: string | null
              }
            }
          }
        ).channel_post
        console.log('[DEBUG channel_post] отримано update:', {
          chatId: post?.chat?.id,
          text: post?.text?.slice(0, 100),
          type: post?.chat ? 'channel' : undefined,
        })
        if (!post?.chat?.id) return

        const chatId = String(post.chat.id).trim()
        const rawText = String(post.text ?? post.caption ?? '').trim()
        if (rawText.startsWith('/')) {
          console.info('[channel_post] skip command text:', {
            chatId,
            text: rawText.slice(0, 120),
          })
          return
        }

        const focusChannelId = process.env.FOCUS_TELEGRAM_CHANNEL_ID?.trim()

        if (focusChannelId && chatId === focusChannelId) {
          if (!post.text) return

          const parsed = parseZoomChannelPost(post.text)
          if (!parsed.isValid) {
            if (parsed.errors.length > 0 && hasStructuredFields(post.text)) {
              const expertTgId = process.env.COACH_TELEGRAM_ID?.trim()
              if (expertTgId) {
                await ctx.telegram.sendMessage(
                  expertTgId,
                  'Помилка в шаблоні Zoom-сесії:\n\n' +
                    parsed.errors.join('\n') +
                    '\n\nШаблон:\n' +
                    '#zoom\n' +
                    'Дата: DD.MM.YYYY\n' +
                    'Час: HH:MM\n' +
                    'Тема: назва практики\n' +
                    'Link: https://zoom.us/j/...'
                )
              }
            }
            return
          }

          const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
          if (
            coachTelegramId &&
            post.from?.id &&
            String(post.from.id) !== coachTelegramId
          ) {
            return
          }

          const expert = coachTelegramId
            ? await prisma.expert.findFirst({
                where: { users: { some: { telegramUserId: coachTelegramId } } },
                select: { id: true },
              })
            : await prisma.expert.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
              })

          if (!expert) {
            console.warn('[zoom-parser] expert not found')
            return
          }

          const existing = await prisma.zoomSession.findFirst({
            where: {
              expertId: expert.id,
              scheduledAt: parsed.scheduledAt,
              status: { not: ZoomStatus.CANCELLED },
            },
          })

          let isCreated = false

          if (existing) {
            const existingMeta =
              existing.requests &&
              typeof existing.requests === 'object' &&
              !Array.isArray(existing.requests)
                ? (existing.requests as Record<string, unknown>)
                : {}

            await updateSession(existing.id, {
              topic: parsed.topic,
              requests: {
                ...existingMeta,
                type: 'group_practice',
                zoomLink: parsed.zoomLink,
              },
            })
          } else {
            await createFullSession({
              expertId: expert.id,
              scheduledAt: parsed.scheduledAt,
              topic: parsed.topic,
              requests: {
                type: 'group_practice',
                zoomLink: parsed.zoomLink,
                notify24h: true,
                notify2h: true,
                notifiedAt24h: null,
                notifiedAt2h: null,
              },
            })
            isCreated = true
          }

          const expertTgId = process.env.COACH_TELEGRAM_ID?.trim()
          if (expertTgId) {
            const dateStr = parsed.scheduledAt.toLocaleString('uk-UA', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
            })
            await ctx.telegram.sendMessage(
              expertTgId,
              `Zoom-сесію ${isCreated ? 'додано' : 'оновлено'} в системі.\n\n` +
                `${dateStr}\n` +
                `${parsed.topic}\n\n` +
                'Нагадування заплановані.'
            )
          }
          return
        }

        if (post.text || post.caption) {
          const handledNotebook = await handleNotebookChannelPost(ctx, post)
          if (handledNotebook) {
            return
          }
        }

        return
      } catch (error) {
        logger.error('[telegram-thin-client:channel_post]', error)
      }
    })
}

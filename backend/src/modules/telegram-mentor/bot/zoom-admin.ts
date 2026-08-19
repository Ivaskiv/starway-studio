import { ZoomStatus } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import {
  bot,
  sendOpsTelegramMessage,
} from '../../../lib/telegram.js'
import { logger } from '../../../utils/logger.js'
import {
  afterZoomOperation,
  createFullSession,
  notifyMonthSchedule,
  syncChannelPost,
  updateSession,
} from '../../zoom/service.js'

interface MonthSessionLine {
 scheduledAt: Date
 topic: string
 zoomLink: string
}

function parseMonthSchedule(
 text: string,
 year: number
): { lines: MonthSessionLine[]; errors: string[] } {
 const errors: string[] = []
 const lines: MonthSessionLine[] = []
 const rows = text
 .split('\n')
 .map((line) => line.trim())
 .filter((line) => /^[A-Za-zА-Яа-яІіЇїЄєҐґ]{2}\s+\d{2}\.\d{2}/.test(line))

 for (const row of rows) {
 const parts = row.split('|').map((part) => part.trim())
 if (parts.length < 2) {
 errors.push(`Невірний рядок: ${row}`)
 continue
 }

 const dateMatch = parts[0].match(/(\d{2})\.(\d{2})/)
 if (!dateMatch) {
 errors.push(`Не вдалось розпізнати дату: ${parts[0]}`)
 continue
 }

 const day = Number(dateMatch[1])
 const month = Number(dateMatch[2])
 const timeMatch = parts[0].match(/(\d{2}):(\d{2})/)
 const hours = timeMatch ? Number(timeMatch[1]) : 19
 const minutes = timeMatch ? Number(timeMatch[2]) : 0
 const scheduledAt = new Date(year, month - 1, day, hours, minutes, 0, 0)

 if (
 Number.isNaN(scheduledAt.getTime()) ||
 scheduledAt <= new Date() ||
 scheduledAt.getMonth() !== month - 1 ||
 scheduledAt.getDate() !== day
 ) {
 errors.push(`Дата в минулому або невірна: ${parts[0]}`)
 continue
 }

 const topic = parts[1] || 'Zoom-практика ФОКУС'
 const zoomLink = parts[2] ?? ''
 if (zoomLink && !zoomLink.startsWith('https://')) {
 errors.push(`Link має починатись з https://: ${zoomLink}`)
 continue
 }

 lines.push({ scheduledAt, topic, zoomLink })
 }

 return { lines, errors }
}

export function registerZoomAdminHandlers(): void {
  bot.command('zoomhelp', async (ctx) => {
   const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
   if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId)
   return

   await ctx.reply(
   'Команди управління розкладом:\n\n' +
   '/zoom month ММ.РРРР\n' +
   'Пн ДД.ММ | Тема | https://link\n' +
   ' Додати місячний розклад\n\n' +
   '/zoom edit <id> link https://новий-link\n' +
   ' Оновити Zoom-посилання\n\n' +
   '/zoom edit <id> time РРРР-ММ-ДД ГГ:ХХ\n' +
   ' Перенести час сесії\n\n' +
   '/zoomhelp — цей список'
   )
   })
   bot.hears(/^\/zoom edit ([a-z0-9-]+) (link|time) (.+)$/i, async (ctx) => {
   try {
   const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
   if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId)
   return

   const sessionId = String(ctx.match[1] ?? '').trim()
   const field = String(ctx.match[2] ?? '')
   .trim()
   .toLowerCase()
   const value = String(ctx.match[3] ?? '').trim()

   const session = await prisma.zoomSession.findUnique({
   where: { id: sessionId },
   })
   if (!session) {
   await ctx.reply(`Сесію ${sessionId} не знайдено.`)
   return
   }

   if (field === 'link') {
   if (!value.startsWith('https://')) {
   await ctx.reply('Link має починатись з https://')
   return
   }
   const existingMeta =
   session.requests &&
   typeof session.requests === 'object' &&
   !Array.isArray(session.requests)
   ? (session.requests as Record<string, unknown>)
   : {}

   await updateSession(sessionId, {
   requests: {
   ...existingMeta,
   zoomLink: value,
   },
   })
   await ctx.reply(`Zoom-посилання оновлено.\n${session.topic}`)
   const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
   const panelUrl = panelBase
   ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom`
   : ''
   void sendOpsTelegramMessage(
   `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n` +
   `Тип події: Редагування сесії\n` +
   `Сесія: ${session.topic}\n` +
   `Зміна: Zoom-посилання\n` +
   `Нове значення: ${value}`,
   panelUrl
   ? {
   reply_markup: {
   inline_keyboard: [
   [{ text: 'ПАНЕЛЬ КЕРУВАННЯ', url: panelUrl }],
                    ],
                  },
                }
              : undefined
          ).catch((err) => console.error('[zoom edit] ops report:', err))
          return
        }

        const normalized = value.replace(' ', 'T')
        const parsedDate = new Date(normalized)
        if (Number.isNaN(parsedDate.getTime())) {
          await ctx.reply(
            'Невірний формат.\nПриклад: /zoom edit <id> time 2026-06-09 19:00'
          )
          return
        }

        const updated = await updateSession(sessionId, {
          scheduledAt: parsedDate,
        })
        const attendees = await prisma.zoomSessionAttendee.findMany({
          where: { sessionId },
          select: { userId: true },
        })
        void afterZoomOperation(bot, {
          operation: 'update',
          sessionId,
          affectedUserIds: attendees.map((attendee) => attendee.userId),
        }).catch((err) => console.error('[zoom edit] afterZoomOperation:', err))

        await ctx.reply(
          `Час сесії оновлено.\n${updated.topic}\n` +
            `Новий час: ${updated.scheduledAt.toLocaleString('uk-UA')}\n` +
            'Нагадування перераховано.'
        )
        const panelBase = process.env.PUBLIC_FRONTEND_URL?.trim() ?? ''
        const panelUrl = panelBase
          ? `${panelBase.replace(/\/$/, '')}/app/dashboard/zoom`
          : ''
        void sendOpsTelegramMessage(
          `ТРАНЗАКЦІЙНИЙ ЗВІТ\n\n` +
            `Тип події: Редагування сесії\n` +
            `Сесія: ${updated.topic}\n` +
            `Зміна: Час\n` +
            `Нове значення: ${updated.scheduledAt.toLocaleString('uk-UA')}`,
          panelUrl
            ? {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: 'ПАНЕЛЬ КЕРУВАННЯ', url: panelUrl }],
                  ],
                },
              }
            : undefined
        ).catch((err) => console.error('[zoom edit] ops report:', err))
      } catch (error) {
        logger.error('[telegram-thin-client:zoom_edit]', error)
        await ctx.reply('Не вдалося оновити сесію. Перевір параметри і повтори.')
      }
    })
    bot.hears(/^\/zoom month\s+([\s\S]+)/, async (ctx) => {
      try {
        const coachTelegramId = process.env.COACH_TELEGRAM_ID?.trim()
        if (!coachTelegramId || String(ctx.from?.id ?? '') !== coachTelegramId)
          return

        const raw = ctx.match[1]
        const fullText = typeof raw === 'string' ? raw.trim() : ''
        if (!fullText) {
          await ctx.reply(
            'Не передано тіло розкладу. Формат: /zoom month ММ.РРРР + рядки сесій.'
          )
          return
        }

        await ctx.reply('Обробка розкладу...')
        await ctx.telegram.sendChatAction(ctx.chat.id, 'typing')

        const headerMatch = fullText.match(/(\d{2})\.(\d{4})/)
        if (!headerMatch) {
          await ctx.reply(
            'Не вдалось розпізнати місяць. Формат першого рядка: /zoom month ММ.РРРР'
          )
          return
        }
        const year = Number(headerMatch[2])
        const { lines, errors } = parseMonthSchedule(fullText, year)

        if (errors.length > 0) {
          await ctx.reply(
            `Знайдено помилки в розкладі:\n\n${errors.join('\n')}\n\nВиправ і надішли ще раз.`
          )
          return
        }
        if (lines.length === 0) {
          await ctx.reply('Рядки розкладу не знайдено. Перевір формат.')
          return
        }

        const expert =
          (await prisma.expert.findFirst({
            where: { users: { some: { telegramUserId: coachTelegramId } } },
            select: { id: true },
          })) ??
          (await prisma.expert.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          }))

        if (!expert) {
          await ctx.reply('Expert не знайдено в БД.')
          return
        }

        const created = []
        const skipped: string[] = []

        for (const line of lines) {
          const existing = await prisma.zoomSession.findFirst({
            where: {
              expertId: expert.id,
              scheduledAt: line.scheduledAt,
              status: { not: ZoomStatus.CANCELLED },
            },
            select: { id: true },
          })

          if (existing) {
            skipped.push(
              `${line.scheduledAt.toLocaleDateString('uk-UA')} — вже існує`
            )
            continue
          }

          const session = await createFullSession(
            {
              expertId: expert.id,
              scheduledAt: line.scheduledAt,
              topic: line.topic,
              requests: {
                type: 'group_practice',
                zoomLink: line.zoomLink,
                notify24h: true,
                notify2h: true,
                notifiedAt24h: null,
                notifiedAt2h: null,
              },
            },
            {
              suppressAutomation: true,
              suppressSessionNotification: true,
            }
          )
          created.push(session)
        }

        const createdLines = created
          .map((session) => {
            const dt = new Date(session.scheduledAt)
            return `${dt.toLocaleString('uk-UA', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })} — ${session.topic}`
          })
          .join('\n')

        await ctx.reply(
          `Розклад збережено: ${created.length} сесій.\n\n` +
            `${createdLines || 'Нових сесій не створено.'}` +
            (skipped.length > 0
              ? `\n\nПропущено (вже існує):\n${skipped.join('\n')}`
              : '')
        )

        if (created.length === 0) return

        void syncChannelPost(bot).catch((err) =>
          console.error('[zoom month] syncChannelPost:', err)
        )
        void notifyMonthSchedule(bot, created).catch((err) =>
          console.error('[zoom month] notifyMonth:', err)
        )
      } catch (error) {
        logger.error('[telegram-thin-client:zoom_month]', error)
        await ctx.reply('Не вдалося обробити розклад. Перевір формат і повтори.')
      }
    })
}

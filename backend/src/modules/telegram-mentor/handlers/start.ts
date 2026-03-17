// backend/src/modules/telegram-mentor/handlers/start.ts

import { randomBytes } from 'crypto'
import type { Context } from 'telegraf'
import { prisma } from '../../../db/client.js'
import { mainMenuKeyboard } from '../keyboards.js'

const DEEPLINK_PREFIX = 'link_'

export async function handleStart(ctx: Context) {
  const rawChatId = ctx.chat?.id
  if (!rawChatId) {
    await ctx.reply('⚠️ Не вдалося визначити чат — повторіть команду у Telegram.')
    return
  }
  const chatId    = String(rawChatId)
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const text      = (ctx.message as any)?.text ?? ''
  const payload   = text.replace('/start', '').trim()

  // /start link_<userId> — deeplink прив'язка акаунту
  if (payload.startsWith(DEEPLINK_PREFIX)) {
    const userId = payload.replace(DEEPLINK_PREFIX, '')

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        await ctx.reply('❌ Акаунт не знайдено. Спробуй ще раз через платформу.')
        return
      }

      const linkData = {
        chatId,
        username:  ctx.from?.username   ?? null,
        firstName: ctx.from?.first_name ?? null,
        isActive:  true,
      }

      const code = randomBytes(16).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const existing = await prisma.telegramLink.findFirst({ where: { userId } })
      if (existing) {
        await prisma.telegramLink.update({
          where: { id: existing.id },
          data:  {
            ...linkData,
            code,
            expiresAt,
          },
        })
      } else {
        await prisma.telegramLink.create({
          data: {
            ...linkData,
            userId,
            code,
            expiresAt,
          },
        })
      }

      await ctx.reply(
        `✅ *Акаунт прив'язано!*\n\nВітаю, ${user.name ?? firstName}!\n\nТепер ти отримуватимеш:\n🌅 Ранкові питання о 8:00\n🌙 Вечірні питання о 20:00\n✅ Нагадування про завдання\n\nНатисни кнопку нижче щоб почати 👇`,
        { parse_mode: 'Markdown', reply_markup: mainMenuKeyboard },
      )
    } catch (err) {
      console.error('[TelegramMentor] start link error:', err)
      await ctx.reply('⚠️ Помилка прив\'язки. Спробуй пізніше.')
    }
    return
  }

  // Звичайний /start — перевірити чи вже прив'язаний по chatId
  const existing = await prisma.telegramLink.findFirst({ where: { chatId } })
  if (existing) {
    await ctx.reply(
      `👋 З поверненням! Вибери дію:`,
      { reply_markup: mainMenuKeyboard },
    )
  } else {
    await ctx.reply(
      `👋 Привіт, ${firstName}!\n\nЦей бот — твій AI-ментор платформи Starway.\n\n*Щоб почати — прив'яжи акаунт:*\n1. Зайди на starway.app\n2. Профіль → Telegram → "Підключити"\n\nАбо введи команду /link`,
      { parse_mode: 'Markdown' },
    )
  }
}

// Генерує deeplink URL для підключення в webapp
export function getTelegramLinkUrl(userId: string, botUsername: string): string {
  return `https://t.me/${botUsername}?start=${DEEPLINK_PREFIX}${userId}`
}

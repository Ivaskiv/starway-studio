import { prisma } from '../../db/client.js'
import { bot } from '../../lib/telegram.js'
import { SPHERE_LABELS } from './types.js'
import type { WheelNotificationPayload } from './types.js'

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'Starway_byNadya_Bot'

const getBotLink = () => `https://t.me/${BOT_USERNAME}`

export interface TelegramSendResult {
  ok: boolean
  code?: string
  reason?: string
  action?: string
  botLink?: string
}

export async function sendWheelNotification(
  userId: string,
  wheelId: string,
  payload: WheelNotificationPayload
): Promise<TelegramSendResult> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { ok: false, reason: 'TELEGRAM_BOT_TOKEN is not configured' }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, telegramUserName: true },
  })

  if (!user?.telegramChatId) {
    if (!user?.telegramUserName) {
      return {
        ok: false,
        code: 'telegram_username_missing',
        reason: 'Telegram ще не підключено. Збережи @username у профілі та натисни Start у боті.',
        action: 'set_telegram_profile',
        botLink: getBotLink(),
      }
    }
    return {
      ok: false,
      code: 'telegram_chat_not_linked',
      reason: 'Telegram username збережено, але чат не підтверджено. Відкрий бот та натисни Start.',
      action: 'open_telegram_bot',
      botLink: getBotLink(),
    }
  }

  try {
    const messageLines = [
      '🎡 Твоє Wheel of Life оновлено.',
      payload.insights.analysis,
      `Слабка сфера: ${SPHERE_LABELS[payload.weakestSphere]}`,
      `Фокус-сфера: ${SPHERE_LABELS[payload.focusSphere]}`,
      payload.gamification ? `Level ${payload.gamification.level} · ${payload.gamification.levelTitle}` : undefined,
      `PDF: ${payload.pdfUrl}`,
    ].filter(Boolean)

    await bot.telegram.sendMessage(user.telegramChatId, messageLines.join('\n'), {
      reply_markup: {
        inline_keyboard: [[{ text: '📄 Отримати PDF', url: payload.pdfUrl }]],
      },
    })

    return { ok: true }
  } catch (error) {
    if (error instanceof Error) {
      return { ok: false, reason: error.message }
    }
    return { ok: false, reason: 'Unknown telegram error' }
  }
}

export async function registerMentorCommands(customBot = bot) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return
  await customBot.telegram.setMyCommands([
    { command: 'wheel', description: 'Запуск Колеса балансу' },
    { command: 'diagnosis', description: 'Отримати коротку діагностику' },
    { command: 'streak', description: 'Перевірити стрік' },
    { command: 'report', description: 'Отримати PDF звіт' },
  ])
}

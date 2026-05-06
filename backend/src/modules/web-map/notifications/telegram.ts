import { sendDedupedTelegramMessage } from '@/lib/telegram.js'
import { prisma } from '@starway/db'

type TelegramButton = {
  label: string
  url: string
}

export async function sendTelegramNotification(
  userId: string,
  text: string,
  buttons?: TelegramButton[],
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramEnabled: true,
    },
  })

  // 🚫 немає чату або юзер виключив телеграм
  if (!user?.telegramChatId || user.telegramEnabled === false) {
    return
  }

  // ✅ якщо кнопок нема — не передаємо reply_markup взагалі
  const options =
    buttons && buttons.length > 0
      ? {
          reply_markup: {
            inline_keyboard: buttons.map(button => [
              {
                text: button.label,
                url: button.url,
              },
            ]),
          },
        }
      : undefined

  try {
    await sendDedupedTelegramMessage(user.telegramChatId, text, options)
  } catch (error) {
    console.error('[telegramNotification] failed', {
      userId,
      error: error instanceof Error ? error.message : 'unknown_error',
    })
  }
}
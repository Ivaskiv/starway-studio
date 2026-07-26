import type { Tool } from './types.js'

export interface TelegramSendParams {
  userId: string
  text: string
}

export type TelegramSendResult = boolean
type TelegramRecipient = {
  telegramChatId: string | null
  telegramUserId: string | null
  telegramLinks: Array<{ chatId: string | null }>
}
type SendUserTelegramMessage = (
  chatId: string,
  text: string,
  options?: unknown,
) => Promise<boolean>

function parseTelegramSendParams(input: unknown): TelegramSendParams {
  if (!input || typeof input !== 'object') {
    throw new Error('telegram.send params must be an object')
  }

  const { userId, text } = input as Partial<TelegramSendParams>

  if (typeof userId !== 'string' || !userId.trim()) {
    throw new Error('telegram.send requires a non-empty userId')
  }

  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('telegram.send requires a non-empty text')
  }

  return {
    userId: userId.trim(),
    text,
  }
}

export const telegramSendTool: Tool<TelegramSendParams, TelegramSendResult> = {
  id: 'telegram.send',
  description: 'Send a Telegram message to a specific user via the shared backend transport.',
  paramsSchema: {
    parse: parseTelegramSendParams,
  },
  async execute(params) {
    const parsedParams = parseTelegramSendParams(params)
    const recipient = await loadTelegramRecipient(parsedParams.userId)
    const { sendUserTelegramMessage } = await loadTelegramModule()
    const chatId =
      recipient.telegramLinks[0]?.chatId ??
      recipient.telegramChatId ??
      recipient.telegramUserId

    if (!chatId) {
      throw new Error(`telegram.send could not resolve a Telegram chat for user ${parsedParams.userId}`)
    }

    return sendUserTelegramMessage(chatId, parsedParams.text)
  },
}

async function loadTelegramModule(): Promise<{
  sendUserTelegramMessage: SendUserTelegramMessage
}> {
  return (0, eval)('import("../../../../backend/src/lib/telegram.js")') as Promise<{
    sendUserTelegramMessage: SendUserTelegramMessage
  }>
}

async function loadTelegramRecipient(userId: string): Promise<TelegramRecipient> {
  const { prisma } = await loadDbModule()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramUserId: true,
      telegramLinks: {
        where: {
          isActive: true,
          chatId: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  if (!user) {
    throw new Error(`telegram.send could not find user ${userId}`)
  }

  return user
}

async function loadDbModule(): Promise<{
  prisma: {
    user: {
      findUnique(args: {
        where: { id: string }
        select: {
          telegramChatId: true
          telegramUserId: true
          telegramLinks: {
            where: { isActive: true; chatId: { not: null } }
            orderBy: { createdAt: 'desc' }
            take: 1
            select: { chatId: true }
          }
        }
      }): Promise<TelegramRecipient | null>
    }
  }
}> {
  return (0, eval)('import("../../../../packages/db/src/client.js")') as Promise<{
    prisma: {
      user: {
        findUnique(args: {
          where: { id: string }
          select: {
            telegramChatId: true
            telegramUserId: true
            telegramLinks: {
              where: { isActive: true; chatId: { not: null } }
              orderBy: { createdAt: 'desc' }
              take: 1
              select: { chatId: true }
            }
          }
        }): Promise<TelegramRecipient | null>
      }
    }
  }>
}

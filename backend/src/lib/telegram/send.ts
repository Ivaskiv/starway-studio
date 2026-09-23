import type { Context } from 'telegraf'

import type {
  TelegramApiLike,
  TelegramMessage,
  TelegramReplyContextLike,
  TelegramTargetLike,
} from './types.js'

import {
  formatTelegramMessage,
  normalizeTelegramText,
} from './formatting.js'

import {
  stripTelegramHtml,
  escapeTelegramHtml,
} from './html.js'

export function resolveTelegramApi(
  target: TelegramTargetLike,
): TelegramApiLike {
  return 'telegram' in target ? target.telegram : target
}

function hasTelegramEntities(
  options: Record<string, unknown> | undefined,
  entityKey: 'entities' | 'caption_entities',
): boolean {
  return Array.isArray(options?.[entityKey])
}

export function normalizeOutboundTelegramMessage(
  message: TelegramMessage | string,
  options?: Record<string, unknown>,
): TelegramMessage {
  if (typeof message !== 'string') {
    return normalizeTelegramText(
      message.text,
      message.parseMode,
    )
  }

  if (hasTelegramEntities(options, 'entities')) {
    return {
      text: message,
      parseMode:
        typeof options?.parse_mode === 'string'
          ? options.parse_mode as 'HTML'
          : 'HTML',
    }
  }

  if (options?.parse_mode === 'HTML') {
    return normalizeTelegramText(message, 'HTML')
  }

  return formatTelegramMessage(message)
}

export function isTelegramParseEntityError(
  error: unknown,
): boolean {
  const message = String(
    (
      error as {
        description?: string
        message?: string
      } | null
    )?.description
      ?? (
        error as {
          description?: string
          message?: string
        } | null
      )?.message
      ?? error,
  ).toLowerCase()

  return (
    message.includes('parse entities') ||
    message.includes("can't parse")
  )
}

export async function sendTelegramMessage(
  target: TelegramTargetLike,
  chatId: string | number,
  message: TelegramMessage | string,
  options?: {
    replyMarkup?: unknown
    disableWebPagePreview?: boolean
  },
): Promise<unknown> {
  const telegram = resolveTelegramApi(target)
  const normalized =
    normalizeOutboundTelegramMessage(message)

  const sendOptions = {
    parse_mode: normalized.parseMode,
    ...(options?.replyMarkup
      ? { reply_markup: options.replyMarkup }
      : {}),
    ...(options?.disableWebPagePreview
      ? {
          link_preview_options: {
            is_disabled: true,
          },
        }
      : {}),
  }

  try {
    return await telegram.sendMessage(
      chatId,
      normalized.text,
      sendOptions,
    )
  } catch (error) {
    if (!isTelegramParseEntityError(error)) {
      throw error
    }

    const fallback = formatTelegramMessage(
      escapeTelegramHtml(stripTelegramHtml(normalized.text)),
    )

    console.warn('[telegram:format-fallback]', {
      chatId: String(chatId),
      reason: 'parse_entities',
    })

    return telegram.sendMessage(
      chatId,
      fallback.text,
      { ...sendOptions, parse_mode: fallback.parseMode },
    )
  }
}

export async function replyWithTelegramMessage(
  ctx: TelegramReplyContextLike,
  message: TelegramMessage | string,
  extra?: Parameters<Context['reply']>[1],
): Promise<any> {
  const normalized =
    normalizeOutboundTelegramMessage(
      message,
      extra as Record<string, unknown> | undefined,
    )

  const replyOptions = {
    ...extra,
    parse_mode: normalized.parseMode,
  }

  try {
    return await ctx.reply(
      normalized.text,
      replyOptions as never,
    )
  } catch (error) {
    if (!isTelegramParseEntityError(error)) {
      throw error
    }

    const fallback = formatTelegramMessage(
      escapeTelegramHtml(stripTelegramHtml(normalized.text)),
    )

    const { entities: _entities, parse_mode: _parseMode, ...fallbackOptions } = extra ?? {}
    return ctx.reply(
      fallback.text,
      {
        ...fallbackOptions,
        parse_mode: fallback.parseMode,
      } as never,
    )
  }
}

const TELEGRAM_INVISIBLE_MESSAGE = '\u2060'

export async function removeTelegramReplyKeyboard(
  ctx: TelegramReplyContextLike,
): Promise<unknown> {
  return replyWithTelegramMessage(
    ctx,
    TELEGRAM_INVISIBLE_MESSAGE,
    {
      reply_markup: {
        remove_keyboard: true,
      },
    },
  )
}

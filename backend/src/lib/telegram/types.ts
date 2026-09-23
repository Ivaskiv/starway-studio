import type { InputFile } from 'telegraf/types'

import type { Context } from 'telegraf'

export type TelegramApiLike = {
  sendMessage: (
    chatId: string | number,
    text: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>

  sendPhoto?: (
    chatId: string | number,
    photo: string | InputFile,
    options?: Record<string, unknown>,
  ) => Promise<unknown>

  sendVoice?: (
    chatId: string | number,
    voice: string | InputFile,
    options?: Record<string, unknown>,
  ) => Promise<unknown>

  sendVideo?: (
    chatId: string | number,
    video: string | InputFile,
    options?: Record<string, unknown>,
  ) => Promise<unknown>

  sendDocument?: (
    chatId: string | number,
    document: string | InputFile,
    options?: Record<string, unknown>,
  ) => Promise<unknown>
}

export type TelegramTargetLike =
  | TelegramApiLike
  | { telegram: TelegramApiLike }

export type TelegramReplyContextLike =
  Pick<Context, 'reply' | 'chat' | 'from'>

export type TelegramMessage = {
  text: string
  parseMode: 'HTML'
}

export type TelegramCaption = TelegramMessage

export type TelegramMediaMethod =
  | 'sendPhoto'
  | 'sendVoice'
  | 'sendVideo'
  | 'sendDocument'

export type TelegramMediaOptions =
  Record<string, unknown> | undefined

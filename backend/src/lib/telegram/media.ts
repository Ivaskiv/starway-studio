import type {
  TelegramMediaMethod,
  TelegramMediaOptions,
  TelegramTargetLike,
} from './types.js'

import {
  formatTelegramCaption,
} from './formatting.js'

import {
  resolveTelegramApi,
} from './send.js'

async function sendTelegramMedia(
  target: TelegramTargetLike,
  method: TelegramMediaMethod,
  chatId: string | number,
  asset: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  const telegram = resolveTelegramApi(target)
  const sender = telegram[method]

  if (typeof sender !== 'function') {
    throw new Error(
      `telegram_method_not_supported:${method}`,
    )
  }

  const caption = formatTelegramCaption(
    typeof options?.caption === 'string'
      ? options.caption
      : '',
    typeof options?.parse_mode === 'string'
      ? options.parse_mode
      : null,
  )

  const normalizedOptions = {
    ...options,
    ...(caption
      ? {
          caption: caption.text,
          parse_mode: caption.parseMode,
        }
      : {}),
  }

  try {
    return await sender.call(
      telegram,
      chatId,
      asset,
      normalizedOptions,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const isRemoteFetchFailure =
      /^https?:\/\//i.test(asset) &&
      /failed to get HTTP URL content|wrong type of the web page content|failed to get/i.test(message)

    if (!isRemoteFetchFailure) {
      throw error
    }

    const response = await fetch(asset)
    if (!response.ok) {
      throw new Error(
        `telegram_media_download_failed:${response.status}:${response.statusText}`,
      )
    }

    const bytes = Buffer.from(await response.arrayBuffer())
    const fileNameFromUrl = (() => {
      try {
        const pathname = new URL(asset).pathname
        const candidate = pathname.split('/').filter(Boolean).pop()
        return candidate || `${method}.bin`
      } catch {
        return `${method}.bin`
      }
    })()

    console.warn('[telegram:media-upload-fallback]', {
      method,
      chatId: String(chatId),
      source: asset,
      bytes: bytes.length,
    })

    return sender.call(
      telegram,
      chatId,
      {
        source: bytes,
        filename: fileNameFromUrl,
      },
      normalizedOptions,
    )
  }
}

export async function sendTelegramPhoto(
  target: TelegramTargetLike,
  chatId: string | number,
  photo: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(
    target,
    'sendPhoto',
    chatId,
    photo,
    options,
  )
}

export async function sendTelegramVoice(
  target: TelegramTargetLike,
  chatId: string | number,
  voice: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(
    target,
    'sendVoice',
    chatId,
    voice,
    options,
  )
}

export async function sendTelegramVideo(
  target: TelegramTargetLike,
  chatId: string | number,
  video: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(
    target,
    'sendVideo',
    chatId,
    video,
    options,
  )
}

export async function sendTelegramDocument(
  target: TelegramTargetLike,
  chatId: string | number,
  document: string,
  options?: TelegramMediaOptions,
): Promise<unknown> {
  return sendTelegramMedia(
    target,
    'sendDocument',
    chatId,
    document,
    options,
  )
}

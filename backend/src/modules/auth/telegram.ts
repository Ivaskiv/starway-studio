import crypto from 'crypto'

import {
  readTelegramVerificationBots,
  type TelegramBotContext,
} from '../telegram-mentor/runtime/botConfig.js'
import { AuthServiceError } from './errors.js'

export type TelegramMiniAppProfile = {
  id: string
  firstName: string | null
  username: string | null
  botContext: TelegramBotContext | null
}

function collectVerificationBots(botTokenOverride?: string): {
  token: string
  botContext: TelegramBotContext | null
}[] {
  const configuredBots = readTelegramVerificationBots()
  const explicitToken = String(botTokenOverride ?? '').trim()

  if (explicitToken) {
    const configuredBot = configuredBots.find(({ token }) => token === explicitToken)
    return [configuredBot ?? { token: explicitToken, botContext: null }]
  }

  return configuredBots
}

export function verifyTelegramInitData(
  initData: string,
  botTokenOverride?: string,
): TelegramMiniAppProfile {
  const raw = String(initData ?? '').trim()
  if (!raw) {
    throw new AuthServiceError('missing_fields', 400)
  }

  const params = new URLSearchParams(raw)
  const hash = params.get('hash')
  const userRaw = params.get('user')
  const authDateRaw = params.get('auth_date')
  const initDataKeys = Array.from(params.keys()).sort()

  if (!hash || !userRaw || !authDateRaw) {
    console.warn('[auth:telegram] initData missing required fields', {
      keys: initDataKeys,
      hasHash: Boolean(hash),
      hasUser: Boolean(userRaw),
      hasAuthDate: Boolean(authDateRaw),
    })
    throw new AuthServiceError('invalid_telegram_init_data', 401)
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const receivedHashBuffer = Buffer.from(hash, 'hex')
  const candidateBots = collectVerificationBots(botTokenOverride)
  const verifiedBot = candidateBots.find(({ token }) => {
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest()
    const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')
    const expectedHashBuffer = Buffer.from(expectedHash, 'hex')

    return expectedHashBuffer.length === receivedHashBuffer.length
      && crypto.timingSafeEqual(expectedHashBuffer, receivedHashBuffer)
  })

  if (!verifiedBot) {
    console.warn('[auth:telegram] initData signature mismatch', {
      keys: initDataKeys,
      candidateTokenCount: candidateBots.length,
    })
    throw new AuthServiceError('invalid_telegram_signature', 401)
  }

  const authDate = Number(authDateRaw)
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  if (!Number.isFinite(authDate) || ageSeconds < -60 || ageSeconds > 60 * 60) {
    throw new AuthServiceError('telegram_init_data_expired', 401)
  }

  let parsedUser: { id?: number | string; first_name?: string; username?: string } | null = null
  try {
    parsedUser = JSON.parse(userRaw)
  } catch {
    throw new AuthServiceError('invalid_telegram_user_payload', 401)
  }

  const telegramId = String(parsedUser?.id ?? '').trim()
  if (!telegramId) {
    throw new AuthServiceError('invalid_telegram_user_payload', 401)
  }

  return {
    botContext: verifiedBot.botContext,
    id: telegramId,
    firstName: parsedUser?.first_name?.trim() || null,
    username: parsedUser?.username?.trim() || null,
  }
}

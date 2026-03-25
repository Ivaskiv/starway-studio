import crypto from 'crypto'

import { AuthServiceError } from './auth.errors.js'

export type TelegramMiniAppProfile = {
  id: string
  firstName: string | null
  username: string | null
}

export function verifyTelegramInitData(initData: string): TelegramMiniAppProfile {
  const raw = String(initData ?? '').trim()
  if (!raw) {
    throw new AuthServiceError('missing_fields', 400)
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!botToken) {
    throw new AuthServiceError('telegram_bot_not_configured', 500)
  }

  const params = new URLSearchParams(raw)
  const hash = params.get('hash')
  const userRaw = params.get('user')
  const authDateRaw = params.get('auth_date')

  if (!hash || !userRaw || !authDateRaw) {
    throw new AuthServiceError('invalid_telegram_init_data', 401)
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== 'hash')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const expectedHash = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex')

  if (expectedHash !== hash) {
    throw new AuthServiceError('invalid_telegram_signature', 401)
  }

  const authDate = Number(authDateRaw)
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate
  if (!Number.isFinite(authDate) || ageSeconds > 60 * 60) {
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
    id: telegramId,
    firstName: parsedUser?.first_name?.trim() || null,
    username: parsedUser?.username?.trim() || null,
  }
}

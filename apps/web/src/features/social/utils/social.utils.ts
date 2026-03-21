// features/social/utils/social.utils.ts

import { SOCIAL_PLATFORMS_METADATA, type SocialPlatform } from '../types/social.types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialFlowMode = 'login' | 'connect'

export interface SocialFlowState {
  provider?: SocialPlatform
  mode?: SocialFlowMode
}

// ─── Flow helpers ─────────────────────────────────────────────────────────────

/** Визначає режим флоу за state-параметром OAuth redirect */
export const resolveSocialFlow = (state?: string): SocialFlowMode =>
  state === 'connect' ? 'connect' : 'login'

/** Парсить query-параметри після OAuth-redirect */
export const parseSocialFlow = (queryParams: URLSearchParams): SocialFlowState => {
  const providerParam = queryParams.get('provider')
  const stateParam    = queryParams.get('state')

  const provider: SocialPlatform | undefined =
    providerParam &&
    Object.values(SOCIAL_PLATFORMS_METADATA).some(m => m.id === providerParam)
      ? (providerParam as SocialPlatform)
      : undefined

  return { provider, mode: resolveSocialFlow(stateParam ?? undefined) }
}

// ─── Token resolvers ──────────────────────────────────────────────────────────

/** Google OAuth2 токен через GSI (Google Identity Services) */
export async function getGoogleToken(): Promise<string> {
  const g = (window as any).google
  if (!g) throw new Error('Google API не завантажений')

  return new Promise((resolve, reject) => {
    g.accounts.oauth2
      .initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: (res: any) =>
          res.access_token
            ? resolve(res.access_token)
            : reject(new Error('Не отримано Google токен')),
      })
      .requestAccessToken()
  })
}

/**
 * Telegram токен — підтримує два режими:
 *   1. Telegram WebApp (Mini App) — initData.auth_token
 *   2. Telegram Login Widget    — window.onTelegramAuth callback
 *
 * WebApp має пріоритет: якщо запускається всередині Telegram-клієнта,
 * токен доступний синхронно через initData.
 */
export async function getTelegramToken(): Promise<string> {
  const tg = (window as any)?.Telegram

  // ── Режим 1: Mini App (WebApp context) ───────────────────────────────────
  const webAppToken = tg?.WebApp?.initData?.auth_token
  if (webAppToken) return webAppToken

  // ── Режим 2: Login Widget (зовнішній браузер) ────────────────────────────
  return new Promise((resolve, reject) => {
    ;(window as any).onTelegramAuth = (user: any) => {
      if (user?.id && user?.hash) {
        resolve(user.hash)
      } else {
        reject(new Error('Telegram login failed'))
      }
    }
  })
}

/**
 * Універсальний резолвер токена за платформою.
 * Додавай нові платформи тільки сюди — споживачі не змінюються.
 */
export async function getSocialToken(platform: SocialPlatform): Promise<string> {
  switch (platform) {
    case 'google':   return getGoogleToken()
    case 'telegram': return getTelegramToken()
    default:
      throw new Error(`No token handler for platform: ${platform}`)
  }
}
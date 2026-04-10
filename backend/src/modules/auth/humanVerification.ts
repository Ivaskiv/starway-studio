import { AuthServiceError } from './auth.errors.js'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

type HumanCheckInput = {
  honeypot?: string | null
  turnstileToken?: string | null
  ip?: string | null
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export async function assertHumanVerification(input: HumanCheckInput) {
  const honeypot = normalizeValue(input.honeypot)
  const turnstileToken = normalizeValue(input.turnstileToken)
  const turnstileSecret = normalizeValue(process.env.TURNSTILE_SECRET_KEY)

  if (honeypot) {
    throw new AuthServiceError('bot_detected', 400, 'Підозріла активність')
  }

  if (!turnstileSecret) {
    return
  }

  if (!turnstileToken) {
    throw new AuthServiceError('human_verification_required', 400, 'Потрібна перевірка')
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret: turnstileSecret,
      response: turnstileToken,
      ...(input.ip ? { remoteip: input.ip } : {}),
    }),
  }).catch(() => null)

  if (!response?.ok) {
    throw new AuthServiceError('human_verification_failed', 400, 'Не вдалося перевірити користувача')
  }

  const payload = await response.json().catch(() => null) as { success?: boolean } | null
  if (!payload?.success) {
    throw new AuthServiceError('human_verification_failed', 400, 'Не вдалося перевірити користувача')
  }
}

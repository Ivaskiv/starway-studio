import { cacheDel, cacheGet, cacheSet } from '../../../lib/cache/index.js'

export type PendingTelegramIdentity = {
  chatId: string
  telegramUserId: string
  telegramUserName: string | null
  firstName: string | null
  source: 'telegram_start' | 'telegram_miniapp' | 'email_after_test'
  requestId: string | null
  createdAt: string
}

const PENDING_IDENTITY_TTL_SECONDS = 24 * 60 * 60
const PENDING_IDENTITY_PREFIX = 'telegram:pending_identity:'

function keyFor(chatId: string): string {
  return `${PENDING_IDENTITY_PREFIX}${String(chatId ?? '').trim()}`
}

function normalizeEmail(value: string): string {
  return String(value ?? '').trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value)
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
}

export async function setPendingTelegramIdentity(identity: Omit<PendingTelegramIdentity, 'createdAt'>): Promise<void> {
  await cacheSet(keyFor(identity.chatId), {
    ...identity,
    createdAt: new Date().toISOString(),
  } satisfies PendingTelegramIdentity, PENDING_IDENTITY_TTL_SECONDS)
}

export async function getPendingTelegramIdentity(chatId: string): Promise<PendingTelegramIdentity | null> {
  const value = await cacheGet<PendingTelegramIdentity>(keyFor(chatId))
  return value ?? null
}

export async function clearPendingTelegramIdentity(chatId: string): Promise<void> {
  await cacheDel(keyFor(chatId))
}

export function normalizePendingEmail(text: string): string {
  return normalizeEmail(text)
}
